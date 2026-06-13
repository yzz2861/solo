import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { Between, MoreThan, LessThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import {
  SealApplication,
  ApplicationStatus,
  BorrowType,
  MaterialType,
} from '../entities/SealApplication';
import { ApprovalRecord, ApprovalAction } from '../entities/ApprovalRecord';
import { Attachment } from '../entities/Attachment';
import { UserRole } from '../entities/User';
import { createOperationLog } from '../services/logService';

function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.ip ||
    'unknown'
  );
}

function getBorrowTypeText(type: BorrowType): string {
  return type === BorrowType.TAKE_OUT ? '外借' : '现场用印';
}

function getMaterialTypeText(type: MaterialType): string {
  const map: Record<MaterialType, string> = {
    [MaterialType.CONTRACT]: '合同',
    [MaterialType.CERTIFICATE]: '证明',
    [MaterialType.AGREEMENT]: '协议',
    [MaterialType.LETTER]: '函件',
    [MaterialType.OTHER]: '其他',
  };
  return map[type] || type;
}

function getStatusText(status: ApplicationStatus): string {
  const map: Record<ApplicationStatus, string> = {
    [ApplicationStatus.PENDING_APPROVAL]: '待审批',
    [ApplicationStatus.APPROVED]: '已通过待取章',
    [ApplicationStatus.REJECTED]: '已驳回',
    [ApplicationStatus.PICKED_UP]: '已取章使用中',
    [ApplicationStatus.RETURNED]: '已归还',
    [ApplicationStatus.OVERDUE]: '超期未还',
    [ApplicationStatus.TRACKING]: '追踪中',
  };
  return map[status] || status;
}

export async function getStatistics(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const appRepo = AppDataSource.getRepository(SealApplication);
    const { month } = req.query;

    let startDate: Date;
    let endDate: Date;

    if (month) {
      const [year, m] = (month as string).split('-').map(Number);
      startDate = new Date(year, m - 1, 1);
      endDate = new Date(year, m, 0, 23, 59, 59);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const createdInMonth = Between(startDate, endDate);

    const [
      totalBorrow,
      takeOutCount,
      rejectedCount,
      overdueCount,
      notReturnedCount,
      returnedCount,
    ] = await Promise.all([
      appRepo.count({ where: { createdAt: createdInMonth } }),
      appRepo.count({
        where: {
          createdAt: createdInMonth,
          borrowType: BorrowType.TAKE_OUT,
        },
      }),
      appRepo.count({
        where: {
          createdAt: createdInMonth,
          status: ApplicationStatus.REJECTED,
        },
      }),
      appRepo.count({
        where: [
          { isOverdue: true, createdAt: createdInMonth },
          { status: ApplicationStatus.OVERDUE, createdAt: createdInMonth },
          { status: ApplicationStatus.TRACKING, createdAt: createdInMonth },
        ],
      }),
      appRepo.count({
        where: [
          { status: ApplicationStatus.PICKED_UP, createdAt: createdInMonth },
          { status: ApplicationStatus.OVERDUE, createdAt: createdInMonth },
          { status: ApplicationStatus.TRACKING, createdAt: createdInMonth },
          { status: ApplicationStatus.APPROVED, createdAt: createdInMonth },
        ],
      }),
      appRepo.count({
        where: {
          createdAt: createdInMonth,
          status: ApplicationStatus.RETURNED,
        },
      }),
    ]);

    return res.json({
      code: 200,
      data: {
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          month: month || `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
        },
        totalBorrow,
        takeOutCount,
        useInOfficeCount: totalBorrow - takeOutCount,
        rejectedCount,
        rejectedRate: totalBorrow > 0 ? ((rejectedCount / totalBorrow) * 100).toFixed(2) + '%' : '0%',
        overdueCount,
        notReturnedCount,
        returnedCount,
        returnRate: totalBorrow > 0 ? ((returnedCount / totalBorrow) * 100).toFixed(2) + '%' : '0%',
      },
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function getOverdueList(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const appRepo = AppDataSource.getRepository(SealApplication);
    const now = new Date();

    const list = await appRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.applicant', 'applicant')
      .leftJoinAndSelect('app.approver', 'approver')
      .where(
        `(app.status IN (:...statuses) OR app.isOverdue = 1) 
         AND app.expectedReturnDate < :now 
         AND app.status != 'RETURNED'`,
        {
          statuses: [
            ApplicationStatus.OVERDUE,
            ApplicationStatus.TRACKING,
            ApplicationStatus.PICKED_UP,
          ],
          now,
        }
      )
      .orderBy('app.expectedReturnDate', 'ASC')
      .getMany();

    const result = list.map((app) => {
      const expected = new Date(app.expectedReturnDate!);
      const overdueDays = Math.ceil(
        (now.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: app.id,
        materialName: app.materialName,
        materialType: getMaterialTypeText(app.materialType),
        borrowType: getBorrowTypeText(app.borrowType),
        applicantName: app.applicant?.name,
        department: app.applicant?.department,
        expectedReturnDate: app.expectedReturnDate,
        pickedUpTime: app.pickedUpTime,
        overdueDays,
        status: getStatusText(app.status),
        trackingNote: app.trackingNote,
      };
    });

    return res.json({
      code: 200,
      data: result,
    });
  } catch (error) {
    console.error('Get overdue list error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function getRejectedList(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const appRepo = AppDataSource.getRepository(SealApplication);
    const { month } = req.query;

    const where: any = { status: ApplicationStatus.REJECTED };
    if (month) {
      const [year, m] = (month as string).split('-').map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0, 23, 59, 59);
      where.createdAt = Between(start, end);
    }

    const list = await appRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const approvalRepo = AppDataSource.getRepository(ApprovalRecord);

    const result = [];
    for (const app of list) {
      const rejectRecord = await approvalRepo.findOne({
        where: {
          applicationId: app.id,
          action: ApprovalAction.REJECTED,
        },
        order: { createdAt: 'DESC' },
      });

      result.push({
        id: app.id,
        materialName: app.materialName,
        materialType: getMaterialTypeText(app.materialType),
        borrowType: getBorrowTypeText(app.borrowType),
        applicantName: app.applicant?.name,
        department: app.applicant?.department,
        createdAt: app.createdAt,
        rejectReason: app.rejectReason,
        rejectBy: rejectRecord?.approver?.name,
        rejectComment: rejectRecord?.comment,
      });
    }

    return res.json({
      code: 200,
      data: result,
    });
  } catch (error) {
    console.error('Get rejected list error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function getNotReturnedList(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const appRepo = AppDataSource.getRepository(SealApplication);
    const list = await appRepo.find({
      where: [
        { status: ApplicationStatus.PICKED_UP },
        { status: ApplicationStatus.OVERDUE },
        { status: ApplicationStatus.TRACKING },
        { status: ApplicationStatus.APPROVED },
      ],
      order: { expectedReturnDate: 'ASC', createdAt: 'DESC' },
    });

    const result = list.map((app) => {
      const isOverdue = app.expectedReturnDate && new Date(app.expectedReturnDate) < new Date()
        && app.status !== ApplicationStatus.APPROVED;
      const overdueDays = isOverdue
        ? Math.ceil(
            (new Date().getTime() - new Date(app.expectedReturnDate!).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      return {
        id: app.id,
        materialName: app.materialName,
        materialType: getMaterialTypeText(app.materialType),
        borrowType: getBorrowTypeText(app.borrowType),
        applicantName: app.applicant?.name,
        department: app.applicant?.department,
        materialPages: app.materialPages,
        expectedReturnDate: app.expectedReturnDate,
        pickedUpTime: app.pickedUpTime,
        status: getStatusText(app.status),
        isOverdue,
        overdueDays,
      };
    });

    return res.json({
      code: 200,
      data: result,
    });
  } catch (error) {
    console.error('Get not returned list error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function exportMonthlyReport(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const { month } = req.query;
    let startDate: Date;
    let endDate: Date;
    let fileName: string;

    if (month) {
      const [year, m] = (month as string).split('-').map(Number);
      startDate = new Date(year, m - 1, 1);
      endDate = new Date(year, m, 0, 23, 59, 59);
      fileName = `公章外借月报表_${month}.xlsx`;
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      fileName = `公章外借月报表_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.xlsx`;
    }

    const appRepo = AppDataSource.getRepository(SealApplication);
    const allRecords = await appRepo.find({
      where: { createdAt: Between(startDate, endDate) },
      order: { createdAt: 'ASC' },
    });

    const approvalRepo = AppDataSource.getRepository(ApprovalRecord);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '公章外借审批系统';
    workbook.created = new Date();

    const sheet1 = workbook.addWorksheet('全部记录');
    sheet1.columns = [
      { header: '申请编号', key: 'id', width: 38 },
      { header: '申请时间', key: 'createdAt', width: 20 },
      { header: '申请人', key: 'applicantName', width: 12 },
      { header: '部门', key: 'department', width: 12 },
      { header: '借用类型', key: 'borrowType', width: 10 },
      { header: '材料类型', key: 'materialType', width: 10 },
      { header: '材料名称', key: 'materialName', width: 30 },
      { header: '页数', key: 'materialPages', width: 8 },
      { header: '审批人', key: 'approverName', width: 12 },
      { header: '经办人', key: 'handlerName', width: 12 },
      { header: '预计归还', key: 'expectedReturnDate', width: 20 },
      { header: '状态', key: 'status', width: 14 },
      { header: '取章时间', key: 'pickedUpTime', width: 20 },
      { header: '归还时间', key: 'returnedTime', width: 20 },
      { header: '归还页数', key: 'returnedPages', width: 10 },
      { header: '是否超期', key: 'isOverdue', width: 10 },
      { header: '驳回理由', key: 'rejectReason', width: 30 },
    ];

    for (const app of allRecords) {
      sheet1.addRow({
        id: app.id,
        createdAt: new Date(app.createdAt).toLocaleString('zh-CN'),
        applicantName: app.applicant?.name || '-',
        department: app.applicant?.department || '-',
        borrowType: getBorrowTypeText(app.borrowType),
        materialType: getMaterialTypeText(app.materialType),
        materialName: app.materialName,
        materialPages: app.materialPages || '-',
        approverName: app.approver?.name || '-',
        handlerName: app.handler?.name || '-',
        expectedReturnDate: app.expectedReturnDate
          ? new Date(app.expectedReturnDate).toLocaleString('zh-CN')
          : '-',
        status: getStatusText(app.status),
        pickedUpTime: app.pickedUpTime
          ? new Date(app.pickedUpTime).toLocaleString('zh-CN')
          : '-',
        returnedTime: app.returnedTime
          ? new Date(app.returnedTime).toLocaleString('zh-CN')
          : '-',
        returnedPages: app.returnedPages || '-',
        isOverdue: app.isOverdue ? '是' : '否',
        rejectReason: app.rejectReason || '-',
      });
    }

    const sheet2 = workbook.addWorksheet('超期清单');
    sheet2.columns = [
      { header: '申请编号', key: 'id', width: 38 },
      { header: '申请人', key: 'applicantName', width: 12 },
      { header: '部门', key: 'department', width: 12 },
      { header: '材料名称', key: 'materialName', width: 30 },
      { header: '预计归还', key: 'expectedReturnDate', width: 20 },
      { header: '超期天数', key: 'overdueDays', width: 10 },
      { header: '当前状态', key: 'status', width: 14 },
      { header: '追踪记录', key: 'trackingNote', width: 50 },
    ];

    const now = new Date();
    const overdueList = allRecords.filter(
      (a) =>
        a.status !== ApplicationStatus.RETURNED &&
        a.expectedReturnDate &&
        new Date(a.expectedReturnDate) < now
    );
    for (const app of overdueList) {
      const expected = new Date(app.expectedReturnDate!);
      const overdueDays = Math.ceil((now.getTime() - expected.getTime()) / 86400000);
      sheet2.addRow({
        id: app.id,
        applicantName: app.applicant?.name || '-',
        department: app.applicant?.department || '-',
        materialName: app.materialName,
        expectedReturnDate: new Date(app.expectedReturnDate!).toLocaleString('zh-CN'),
        overdueDays,
        status: getStatusText(app.status),
        trackingNote: app.trackingNote || '-',
      });
    }

    const sheet3 = workbook.addWorksheet('驳回清单');
    sheet3.columns = [
      { header: '申请编号', key: 'id', width: 38 },
      { header: '申请时间', key: 'createdAt', width: 20 },
      { header: '申请人', key: 'applicantName', width: 12 },
      { header: '材料名称', key: 'materialName', width: 30 },
      { header: '驳回人', key: 'rejectBy', width: 12 },
      { header: '驳回理由', key: 'rejectReason', width: 40 },
    ];

    const rejectedList = allRecords.filter(
      (a) => a.status === ApplicationStatus.REJECTED
    );
    for (const app of rejectedList) {
      const rejectRecord = await approvalRepo.findOne({
        where: { applicationId: app.id, action: ApprovalAction.REJECTED },
      });
      sheet3.addRow({
        id: app.id,
        createdAt: new Date(app.createdAt).toLocaleString('zh-CN'),
        applicantName: app.applicant?.name || '-',
        materialName: app.materialName,
        rejectBy: rejectRecord?.approver?.name || '-',
        rejectReason: app.rejectReason || '-',
      });
    }

    const sheet4 = workbook.addWorksheet('未归还清单');
    sheet4.columns = [
      { header: '申请编号', key: 'id', width: 38 },
      { header: '申请人', key: 'applicantName', width: 12 },
      { header: '部门', key: 'department', width: 12 },
      { header: '材料名称', key: 'materialName', width: 30 },
      { header: '页数', key: 'materialPages', width: 8 },
      { header: '取章时间', key: 'pickedUpTime', width: 20 },
      { header: '预计归还', key: 'expectedReturnDate', width: 20 },
      { header: '状态', key: 'status', width: 14 },
    ];

    const notReturnedList = allRecords.filter(
      (a) =>
        a.status === ApplicationStatus.PICKED_UP ||
        a.status === ApplicationStatus.OVERDUE ||
        a.status === ApplicationStatus.TRACKING ||
        a.status === ApplicationStatus.APPROVED
    );
    for (const app of notReturnedList) {
      sheet4.addRow({
        id: app.id,
        applicantName: app.applicant?.name || '-',
        department: app.applicant?.department || '-',
        materialName: app.materialName,
        materialPages: app.materialPages || '-',
        pickedUpTime: app.pickedUpTime
          ? new Date(app.pickedUpTime).toLocaleString('zh-CN')
          : '待取章',
        expectedReturnDate: app.expectedReturnDate
          ? new Date(app.expectedReturnDate).toLocaleString('zh-CN')
          : '-',
        status: getStatusText(app.status),
      });
    }

    [sheet1, sheet2, sheet3, sheet4].forEach((sheet) => {
      sheet.getRow(1).font = { bold: true, size: 12 };
      sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.eachRow({ includeEmpty: true }, (row) => {
        row.alignment = { vertical: 'middle', wrapText: true };
      });
    });

    await createOperationLog({
      operator: req.user,
      action: 'REPORT_EXPORT',
      detail: `导出月度报表: ${fileName}`,
      ip: getClientIp(req),
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export monthly report error:', error);
    return res.status(500).json({ code: 500, message: '导出失败' });
  }
}

export async function getGuardSchedule(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const appRepo = AppDataSource.getRepository(SealApplication);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const approvedList = await appRepo.find({
      where: { status: ApplicationStatus.APPROVED },
      order: { createdAt: 'ASC' },
    });

    const todayPickedUp = await appRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.applicant', 'applicant')
      .leftJoinAndSelect('app.pickedUpByAdmin', 'pickedUpByAdmin')
      .where(
        `app.status IN (:...statuses) AND (
          (app.status = 'PICKED_UP' AND app.pickedUpTime BETWEEN :start AND :end) OR
          (app.status = 'APPROVED' AND app.createdAt <= :end)
        )`,
        {
          statuses: [
            ApplicationStatus.APPROVED,
            ApplicationStatus.PICKED_UP,
            ApplicationStatus.RETURNED,
          ],
          start: todayStart,
          end: todayEnd,
        }
      )
      .orderBy('app.createdAt', 'ASC')
      .getMany();

    const todayReturned = await appRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.applicant', 'applicant')
      .leftJoinAndSelect('app.returnedByAdmin', 'returnedByAdmin')
      .where(
        `app.status = 'RETURNED' AND app.returnedTime BETWEEN :start AND :end`,
        { start: todayStart, end: todayEnd }
      )
      .orderBy('app.returnedTime', 'DESC')
      .getMany();

    const sanitize = (app: SealApplication) => {
      const statusMap: Record<string, string> = {
        [ApplicationStatus.PENDING_APPROVAL]: '待审批',
        [ApplicationStatus.APPROVED]: '待取章',
        [ApplicationStatus.REJECTED]: '已驳回',
        [ApplicationStatus.PICKED_UP]: '已取章使用中',
        [ApplicationStatus.RETURNED]: '已归还',
        [ApplicationStatus.OVERDUE]: '超期未还',
        [ApplicationStatus.TRACKING]: '追踪中',
      };
      return {
        id: app.id,
        borrowType: getBorrowTypeText(app.borrowType),
        materialType: getMaterialTypeText(app.materialType),
        status: statusMap[app.status] || getStatusText(app.status),
        statusCode: app.status,
        applicantName: app.applicant?.name,
        department: app.applicant?.department,
        expectedReturnDate: app.expectedReturnDate,
        pickedUpTime: app.pickedUpTime,
        returnedTime: app.returnedTime,
        pickedUpBy: app.pickedUpByAdmin?.name,
        returnedBy: app.returnedByAdmin?.name,
        createdAt: app.createdAt,
      };
    };

    return res.json({
      code: 200,
      data: {
        date: todayStart.toISOString().split('T')[0],
        pendingPickup: approvedList
          .filter((a) => !a.pickedUpTime)
          .map(sanitize),
        todayPickedUp: todayPickedUp.map(sanitize),
        todayReturned: todayReturned.map(sanitize),
      },
    });
  } catch (error) {
    console.error('Get guard schedule error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function getLegalDetail(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const { id } = req.params;
    const appRepo = AppDataSource.getRepository(SealApplication);
    const application = await appRepo.findOne({ where: { id } });

    if (!application) {
      return res.status(404).json({ code: 404, message: '申请不存在' });
    }

    if (
      req.user.role !== UserRole.LEGAL &&
      req.user.role !== UserRole.ADMIN
    ) {
      return res.status(403).json({
        code: 403,
        message: '只有法务或管理员可以查看法务详情',
      });
    }

    const approvalRepo = AppDataSource.getRepository(ApprovalRecord);
    const approvals = await approvalRepo.find({
      where: { applicationId: id },
      order: { createdAt: 'ASC' },
    });

    const attachmentRepo = AppDataSource.getRepository(Attachment);
    const attachments = await attachmentRepo.find({
      where: { applicationId: id },
      order: { createdAt: 'ASC' },
    });

    const opLogRepo = AppDataSource.manager.getRepository('OperationLog' as any);
    const operationLogs = await opLogRepo.find({
      where: { applicationId: id },
      order: { createdAt: 'ASC' },
    });

    const expected = application.expectedReturnDate
      ? new Date(application.expectedReturnDate)
      : null;
    const now = new Date();
    let overdueDays = 0;
    if (
      expected &&
      application.status !== ApplicationStatus.RETURNED &&
      expected < now
    ) {
      overdueDays = Math.ceil((now.getTime() - expected.getTime()) / 86400000);
    }

    return res.json({
      code: 200,
      data: {
        application: {
          id: application.id,
          borrowType: getBorrowTypeText(application.borrowType),
          materialType: getMaterialTypeText(application.materialType),
          materialName: application.materialName,
          materialPages: application.materialPages,
          materialAmount: application.materialAmount,
          materialDescription: application.materialDescription,
          expectedReturnDate: application.expectedReturnDate,
          applicant: {
            name: application.applicant?.name,
            department: application.applicant?.department,
            username: application.applicant?.username,
          },
          approver: {
            name: application.approver?.name,
            department: application.approver?.department,
          },
          handler: application.handler
            ? {
                name: application.handler?.name,
                department: application.handler?.department,
              }
            : null,
          status: getStatusText(application.status),
          statusCode: application.status,
          rejectReason: application.rejectReason,
          approvalTime: application.approvalTime,
          pickedUpTime: application.pickedUpTime,
          pickedUpBy: application.pickedUpByAdmin?.name,
          returnedTime: application.returnedTime,
          returnedPages: application.returnedPages,
          returnedBy: application.returnedByAdmin?.name,
          isOverdue: application.isOverdue,
          overdueDays,
          trackingNote: application.trackingNote,
          trackingStartAt: application.trackingStartAt,
          createdAt: application.createdAt,
        },
        approvalHistory: approvals.map((a) => ({
          id: a.id,
          approver: {
            name: a.approver?.name,
            department: a.approver?.department,
          },
          action: a.action === ApprovalAction.APPROVED ? '通过' : '驳回',
          comment: a.comment,
          time: a.createdAt,
        })),
        attachments: attachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
          fileSize: a.fileSize,
          remark: a.remark,
          uploader: a.uploader?.name,
          uploadTime: a.createdAt,
        })),
        operationLogs: operationLogs.map((l: any) => ({
          id: l.id,
          operator: l.operatorName,
          action: l.action,
          detail: l.detail,
          ip: l.ip,
          time: l.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Get legal detail error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}
