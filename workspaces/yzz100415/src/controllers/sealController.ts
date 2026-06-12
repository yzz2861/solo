import { Request, Response } from 'express';
import { Between, FindOperator, LessThan, MoreThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import {
  SealApplication,
  ApplicationStatus,
  BorrowType,
  MaterialType,
} from '../entities/SealApplication';
import { ApprovalRecord, ApprovalAction } from '../entities/ApprovalRecord';
import { User, UserRole } from '../entities/User';
import { Attachment } from '../entities/Attachment';
import { createOperationLog } from '../services/logService';

function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.ip ||
    'unknown'
  );
}

function sanitizeApplication(app: SealApplication, includeSensitive: boolean = true) {
  const result: any = { ...app };
  if (!includeSensitive && result.materialAmount !== undefined) {
    result.materialAmount = null;
  }
  if (result.applicant) {
    const { password: _pw, ...rest } = result.applicant;
    result.applicant = rest;
  }
  if (result.approver) {
    const { password: _pw, ...rest } = result.approver;
    result.approver = rest;
  }
  if (result.handler) {
    const { password: _pw, ...rest } = result.handler;
    result.handler = rest;
  }
  if (result.pickedUpByAdmin) {
    const { password: _pw, ...rest } = result.pickedUpByAdmin;
    result.pickedUpByAdmin = rest;
  }
  if (result.returnedByAdmin) {
    const { password: _pw, ...rest } = result.returnedByAdmin;
    result.returnedByAdmin = rest;
  }
  return result;
}

export async function createApplication(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const {
      borrowType,
      materialType,
      materialName,
      materialPages,
      materialAmount,
      materialDescription,
      expectedReturnDate,
      approverId,
      handlerId,
    } = req.body;

    if (!borrowType || !materialType || !materialName || !approverId) {
      return res.status(400).json({
        code: 400,
        message: '借用类型、材料类型、材料名称、审批人为必填项',
      });
    }

    if (
      borrowType === BorrowType.TAKE_OUT &&
      (!expectedReturnDate || !materialPages)
    ) {
      return res.status(400).json({
        code: 400,
        message: '公章外借时，预计归还时间和材料页数为必填项',
      });
    }

    const userRepo = AppDataSource.getRepository(User);
    const approver = await userRepo.findOne({ where: { id: approverId } });
    if (!approver) {
      return res.status(400).json({ code: 400, message: '审批人不存在' });
    }

    let handler = null;
    if (handlerId) {
      handler = await userRepo.findOne({ where: { id: handlerId } });
      if (!handler) {
        return res.status(400).json({ code: 400, message: '经办人不存在' });
      }
    }

    const appRepo = AppDataSource.getRepository(SealApplication);
    const application = new SealApplication();
    application.borrowType = borrowType;
    application.materialType = materialType;
    application.materialName = materialName;
    application.materialPages = materialPages || null;
    application.materialAmount = materialAmount || null;
    application.materialDescription = materialDescription || null;
    application.expectedReturnDate = expectedReturnDate ? new Date(expectedReturnDate) : null;
    application.applicantId = req.user.userId;
    application.approverId = approverId;
    application.handlerId = handlerId || null;
    application.status = ApplicationStatus.PENDING_APPROVAL;

    const saved = await appRepo.save(application);

    await createOperationLog({
      applicationId: (saved as SealApplication).id,
      operator: req.user,
      action: 'APPLICATION_CREATE',
      detail: `发起${borrowType === BorrowType.TAKE_OUT ? '外借' : '用印'}申请: ${materialName}`,
      ip: getClientIp(req),
    });

    const result = await appRepo.findOne({ where: { id: (saved as SealApplication).id } });

    return res.status(201).json({
      code: 201,
      message: '申请创建成功',
      data: sanitizeApplication(result!),
    });
  } catch (error) {
    console.error('Create application error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function getApplicationList(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const appRepo = AppDataSource.getRepository(SealApplication);
    const {
      status,
      borrowType,
      materialType,
      page = 1,
      pageSize = 20,
      startDate,
      endDate,
    } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (borrowType) where.borrowType = borrowType;
    if (materialType) where.materialType = materialType;

    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate as string), new Date(endDate as string));
    } else if (startDate) {
      where.createdAt = MoreThan(new Date(startDate as string));
    } else if (endDate) {
      where.createdAt = LessThan(new Date(endDate as string));
    }

    if (req.user.role === UserRole.EMPLOYEE) {
      where.applicantId = req.user.userId;
    }

    if (req.user.role === UserRole.APPROVER) {
      where.approverId = req.user.userId;
    }

    const [list, total] = await appRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
    });

    const includeSensitive = req.user.role !== UserRole.GUARD;

    return res.json({
      code: 200,
      data: {
        list: list.map((a) => sanitizeApplication(a, includeSensitive)),
        total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (error) {
    console.error('Get application list error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function getApplicationDetail(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const { id } = req.params;
    const appRepo = AppDataSource.getRepository(SealApplication);
    const application = await appRepo.findOne({ where: { id } });

    if (!application) {
      return res.status(404).json({ code: 404, message: '申请不存在' });
    }

    if (
      req.user.role === UserRole.EMPLOYEE &&
      application.applicantId !== req.user.userId
    ) {
      return res.status(403).json({ code: 403, message: '无权查看此申请' });
    }

    if (
      req.user.role === UserRole.APPROVER &&
      application.approverId !== req.user.userId &&
      application.applicantId !== req.user.userId
    ) {
      return res.status(403).json({ code: 403, message: '无权查看此申请' });
    }

    const includeSensitive = req.user.role !== UserRole.GUARD;

    return res.json({
      code: 200,
      data: sanitizeApplication(application, includeSensitive),
    });
  } catch (error) {
    console.error('Get application detail error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function updateApplication(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const { id } = req.params;
    const appRepo = AppDataSource.getRepository(SealApplication);
    const application = await appRepo.findOne({ where: { id } });

    if (!application) {
      return res.status(404).json({ code: 404, message: '申请不存在' });
    }

    if (application.applicantId !== req.user.userId) {
      return res.status(403).json({
        code: 403,
        message: '只有申请人可以修改申请',
      });
    }

    if (application.status === ApplicationStatus.RETURNED) {
      const protectedFields = ['materialPages', 'borrowType', 'materialType', 'materialName', 'materialAmount', 'expectedReturnDate', 'approverId', 'handlerId'];
      const hasProtected = Object.keys(req.body).some((k) =>
        protectedFields.includes(k)
      );
      if (hasProtected) {
        return res.status(400).json({
          code: 400,
          message: '申请已归还，核心字段（材料页数、金额等）不可修改',
        });
      }
    } else if (application.status !== ApplicationStatus.PENDING_APPROVAL) {
      return res.status(400).json({
        code: 400,
        message: '申请已进入审批/执行流程，无法修改',
      });
    }

    const allowedFields = [
      'borrowType',
      'materialType',
      'materialName',
      'materialPages',
      'materialAmount',
      'materialDescription',
      'expectedReturnDate',
      'approverId',
      'handlerId',
    ];

    let changed = '';
    for (const field of allowedFields) {
      if (req.body[field] !== undefined && req.body[field] !== application[field as keyof SealApplication]) {
        const oldVal = application[field as keyof SealApplication];
        if (field === 'expectedReturnDate') {
          (application as any)[field] = new Date(req.body[field]);
        } else {
          (application as any)[field] = req.body[field];
        }
        changed += `${field}: ${oldVal} -> ${req.body[field]}; `;
      }
    }

    const saved = await appRepo.save(application);

    await createOperationLog({
      applicationId: id,
      operator: req.user,
      action: 'APPLICATION_UPDATE',
      detail: `修改申请: ${changed || '无实质变更'}`,
      ip: getClientIp(req),
    });

    return res.json({
      code: 200,
      message: '更新成功',
      data: sanitizeApplication(saved),
    });
  } catch (error) {
    console.error('Update application error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function deleteApplication(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const { id } = req.params;
    const appRepo = AppDataSource.getRepository(SealApplication);
    const application = await appRepo.findOne({ where: { id } });

    if (!application) {
      return res.status(404).json({ code: 404, message: '申请不存在' });
    }

    if (
      application.applicantId !== req.user.userId &&
      req.user.role !== UserRole.ADMIN
    ) {
      return res.status(403).json({
        code: 403,
        message: '只有申请人或管理员可以删除申请',
      });
    }

    if (
      application.status !== ApplicationStatus.PENDING_APPROVAL &&
      application.status !== ApplicationStatus.REJECTED
    ) {
      return res.status(400).json({
        code: 400,
        message: '申请已进入执行流程，无法删除',
      });
    }

    await appRepo.remove(application);

    await createOperationLog({
      applicationId: id,
      operator: req.user,
      action: 'APPLICATION_DELETE',
      detail: `删除申请: ${application.materialName}`,
      ip: getClientIp(req),
    });

    return res.json({
      code: 200,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Delete application error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function approveApplication(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const { id } = req.params;
    const { action, comment } = req.body;

    if (!action || (action !== 'APPROVED' && action !== 'REJECTED')) {
      return res.status(400).json({
        code: 400,
        message: '审批动作必须为 APPROVED 或 REJECTED',
      });
    }

    if (action === 'REJECTED' && !comment) {
      return res.status(400).json({
        code: 400,
        message: '驳回时必须填写驳回理由',
      });
    }

    const appRepo = AppDataSource.getRepository(SealApplication);
    const application = await appRepo.findOne({ where: { id } });

    if (!application) {
      return res.status(404).json({ code: 404, message: '申请不存在' });
    }

    if (
      application.approverId !== req.user.userId &&
      req.user.role !== UserRole.ADMIN
    ) {
      return res.status(403).json({
        code: 403,
        message: '只有指定审批人或管理员可以审批此申请',
      });
    }

    if (application.status !== ApplicationStatus.PENDING_APPROVAL) {
      return res.status(400).json({
        code: 400,
        message: '此申请当前状态不允许审批',
      });
    }

    const approvalRepo = AppDataSource.getRepository(ApprovalRecord);
    const approvalRecord = approvalRepo.create({
      applicationId: id,
      approverId: req.user.userId,
      action: action === 'APPROVED' ? ApprovalAction.APPROVED : ApprovalAction.REJECTED,
      comment: comment || null,
    });
    await approvalRepo.save(approvalRecord);

    if (action === 'APPROVED') {
      application.status = ApplicationStatus.APPROVED;
      application.approvalTime = new Date();
    } else {
      application.status = ApplicationStatus.REJECTED;
      application.rejectReason = comment;
    }

    const saved = await appRepo.save(application);

    await createOperationLog({
      applicationId: id,
      operator: req.user,
      action: action === 'APPROVED' ? 'APPLICATION_APPROVE' : 'APPLICATION_REJECT',
      detail: `${action === 'APPROVED' ? '通过' : '驳回'}申请: ${application.materialName}${comment ? '，理由: ' + comment : ''}`,
      ip: getClientIp(req),
    });

    return res.json({
      code: 200,
      message: action === 'APPROVED' ? '审批通过' : '已驳回',
      data: sanitizeApplication(saved),
    });
  } catch (error) {
    console.error('Approve application error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function confirmPickup(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const { id } = req.params;

    const appRepo = AppDataSource.getRepository(SealApplication);
    const application = await appRepo.findOne({ where: { id } });

    if (!application) {
      return res.status(404).json({ code: 404, message: '申请不存在' });
    }

    if (application.status !== ApplicationStatus.APPROVED) {
      if (application.status === ApplicationStatus.PENDING_APPROVAL) {
        return res.status(400).json({
          code: 400,
          message: '申请尚未审批通过，不能取章',
        });
      }
      return res.status(400).json({
        code: 400,
        message: '此申请当前状态不允许取章',
      });
    }

    application.status = ApplicationStatus.PICKED_UP;
    application.pickedUpTime = new Date();
    application.pickedUpByAdminId = req.user.userId;

    const saved = await appRepo.save(application);

    await createOperationLog({
      applicationId: id,
      operator: req.user,
      action: 'SEAL_PICKUP_CONFIRM',
      detail: `确认取章: ${application.materialName}，申请人: ${application.applicant?.name || application.applicantId}`,
      ip: getClientIp(req),
    });

    return res.json({
      code: 200,
      message: '取章确认成功',
      data: sanitizeApplication(saved),
    });
  } catch (error) {
    console.error('Confirm pickup error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function confirmReturn(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const { id } = req.params;
    const { returnedPages } = req.body;

    const appRepo = AppDataSource.getRepository(SealApplication);
    const application = await appRepo.findOne({ where: { id } });

    if (!application) {
      return res.status(404).json({ code: 404, message: '申请不存在' });
    }

    if (
      application.status !== ApplicationStatus.PICKED_UP &&
      application.status !== ApplicationStatus.OVERDUE &&
      application.status !== ApplicationStatus.TRACKING
    ) {
      return res.status(400).json({
        code: 400,
        message: '此申请当前状态不允许归还确认',
      });
    }

    application.status = ApplicationStatus.RETURNED;
    application.returnedTime = new Date();
    application.returnedByAdminId = req.user.userId;
    application.returnedPages = returnedPages || application.materialPages;

    const saved = await appRepo.save(application);

    await createOperationLog({
      applicationId: id,
      operator: req.user,
      action: 'SEAL_RETURN_CONFIRM',
      detail: `确认归还: ${application.materialName}，归还页数: ${saved.returnedPages}${saved.isOverdue ? '（超期归还）' : ''}`,
      ip: getClientIp(req),
    });

    return res.json({
      code: 200,
      message: '归还确认成功，材料页数已锁定',
      data: sanitizeApplication(saved),
    });
  } catch (error) {
    console.error('Confirm return error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function addTrackingNote(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const { id } = req.params;
    const { trackingNote } = req.body;

    if (!trackingNote) {
      return res.status(400).json({
        code: 400,
        message: '追踪备注不能为空',
      });
    }

    const appRepo = AppDataSource.getRepository(SealApplication);
    const application = await appRepo.findOne({ where: { id } });

    if (!application) {
      return res.status(404).json({ code: 404, message: '申请不存在' });
    }

    application.trackingNote = (application.trackingNote
      ? application.trackingNote + '\n'
      : '') + `[${new Date().toLocaleString('zh-CN')}] ${req.user.name}: ${trackingNote}`;

    if (
      !application.trackingStartAt &&
      (application.status === ApplicationStatus.OVERDUE ||
        application.status === ApplicationStatus.PICKED_UP)
    ) {
      application.status = ApplicationStatus.TRACKING;
      application.trackingStartAt = new Date();
    }

    const saved = await appRepo.save(application);

    await createOperationLog({
      applicationId: id,
      operator: req.user,
      action: 'TRACKING_NOTE_ADD',
      detail: `添加追踪备注: ${trackingNote}`,
      ip: getClientIp(req),
    });

    return res.json({
      code: 200,
      message: '追踪备注已添加',
      data: sanitizeApplication(saved),
    });
  } catch (error) {
    console.error('Add tracking note error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function getApprovalHistory(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const { id } = req.params;

    const approvalRepo = AppDataSource.getRepository(ApprovalRecord);
    const records = await approvalRepo.find({
      where: { applicationId: id },
      order: { createdAt: 'DESC' },
    });

    const attachmentRepo = AppDataSource.getRepository(Attachment);
    const attachments = await attachmentRepo.find({
      where: { applicationId: id },
      order: { createdAt: 'DESC' },
    });

    return res.json({
      code: 200,
      data: {
        approvals: records,
        attachments: attachments,
      },
    });
  } catch (error) {
    console.error('Get approval history error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function uploadAttachment(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });

    const { id } = req.params;
    const { remark } = req.body;

    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请上传文件' });
    }

    const appRepo = AppDataSource.getRepository(SealApplication);
    const application = await appRepo.findOne({ where: { id } });

    if (!application) {
      return res.status(404).json({ code: 404, message: '申请不存在' });
    }

    const attachmentRepo = AppDataSource.getRepository(Attachment);
    const attachment = attachmentRepo.create({
      applicationId: id,
      uploaderId: req.user.userId,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      remark: remark || null,
    });

    const saved = await attachmentRepo.save(attachment);

    await createOperationLog({
      applicationId: id,
      operator: req.user,
      action: 'ATTACHMENT_UPLOAD',
      detail: `上传附件: ${req.file.originalname}${remark ? '，备注: ' + remark : ''}`,
      ip: getClientIp(req),
    });

    return res.json({
      code: 200,
      message: '附件上传成功',
      data: saved,
    });
  } catch (error) {
    console.error('Upload attachment error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}
