import dayjs = require('dayjs');
import { createObjectCsvStringifier } from 'csv-writer';
import { WifiApplicationRepository } from '../repositories/WifiApplicationRepository';
import { OperationLogRepository } from '../repositories/OperationLogRepository';
import { OperationType } from '../entities/OperationLog';
import { ApplicationStatus, VisitReason } from '../entities/WifiApplication';
import { BusinessError } from '../utils/response';

export interface MonthlyStats {
  period: string;
  total: number;
  approved: number;
  rejected: number;
  expired: number;
  revoked: number;
  overtime: number;
  approvalRate: string;
  byTenant: { tenantId: string; tenantName: string; count: number }[];
  byReason: { reason: VisitReason; count: number }[];
}

export interface ExportRecord {
  id: string;
  visitorName: string;
  visitorPhone: string;
  visitorCompany: string;
  tenantCode: string;
  tenantName: string;
  department: string;
  visitReason: string;
  visitReasonDetail: string;
  status: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  reviewedAt: string;
  revokedAt: string;
  revokeType: string;
  revokeRemark: string;
  rejectReason: string;
  reviewedBy: string;
  revokedBy: string;
  createdBy: string;
  overtimeHours: string;
}

export class ReportService {
  private appRepo: WifiApplicationRepository;
  private logRepo: OperationLogRepository;

  constructor() {
    this.appRepo = new WifiApplicationRepository();
    this.logRepo = new OperationLogRepository();
  }

  async getMonthlyStats(year: number, month: number, tenantId?: string): Promise<MonthlyStats> {
    const dateFrom = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month').toDate();
    const dateTo = dayjs(dateFrom).endOf('month').toDate();
    const now = dayjs();
    if (dayjs(dateFrom).isAfter(now)) {
      throw new BusinessError('不能查询未来月份', 400);
    }

    const stats = await this.appRepo.getStatsByDateRange(dateFrom, dateTo, tenantId);
    const { list } = await this.appRepo.query({
      dateFrom,
      dateTo,
      tenantId,
      page: 1,
      pageSize: 10000,
    });

    const tenantMap = new Map<string, { tenantId: string; tenantName: string; count: number }>();
    const reasonMap = new Map<VisitReason, number>();

    for (const app of list) {
      const tid = app.tenantId;
      const tname = app.tenant?.name || '未知';
      const existing = tenantMap.get(tid);
      if (existing) {
        existing.count++;
      } else {
        tenantMap.set(tid, { tenantId: tid, tenantName: tname, count: 1 });
      }

      const reasonCount = reasonMap.get(app.visitReason) || 0;
      reasonMap.set(app.visitReason, reasonCount + 1);
    }

    return {
      period: `${year}年${month}月`,
      total: stats.total,
      approved: stats.approved,
      rejected: stats.rejected,
      expired: stats.expired,
      revoked: stats.revoked,
      overtime: stats.overtime,
      approvalRate: stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(1) + '%' : '0%',
      byTenant: Array.from(tenantMap.values()).sort((a, b) => b.count - a.count),
      byReason: Array.from(reasonMap.entries()).map(([reason, count]) => ({ reason, count })),
    };
  }

  async getOvertimeRecords(from?: Date, to?: Date): Promise<{ list: any[]; total: number }> {
    const dateFrom = from || dayjs().startOf('month').toDate();
    const dateTo = to || new Date();

    const { list } = await this.appRepo.query({
      status: ['approved', 'active', 'revoked_manual', 'revoked_auto', 'left_early', 'expired'] as ApplicationStatus[],
      dateFrom,
      dateTo,
      page: 1,
      pageSize: 10000,
    });

    const overtimeList = list
      .filter((app) => {
        if (app.revokedAt && app.endTime && app.revokedAt > app.endTime) {
          return true;
        }
        if ((app.status === 'active' || app.status === 'approved') && app.endTime && new Date() > app.endTime) {
          return true;
        }
        return false;
      })
      .map((app) => {
        const overtimeEnd = app.revokedAt || new Date();
        const overtimeMs = overtimeEnd.getTime() - app.endTime.getTime();
        const overtimeHours = (overtimeMs / (1000 * 60 * 60)).toFixed(1);
        return {
          id: app.id,
          visitorName: app.visitor?.name,
          visitorPhone: app.visitor?.phone,
          tenantName: app.tenant?.name,
          department: app.tenant?.department,
          visitReason: app.visitReason,
          endTime: app.endTime,
          actualEndTime: app.revokedAt || null,
          overtimeHours,
          revokeType: app.revokeType || (app.status === 'active' ? 'still_active' : app.status),
          status: app.status,
        };
      });

    return { list: overtimeList, total: overtimeList.length };
  }

  async getRejectedRecords(from?: Date, to?: Date): Promise<{ list: any[]; total: number }> {
    const dateFrom = from || dayjs().startOf('month').toDate();
    const dateTo = to || new Date();

    const { list } = await this.appRepo.query({
      status: 'rejected',
      dateFrom,
      dateTo,
      page: 1,
      pageSize: 10000,
    });

    const result = list.map((app) => ({
      id: app.id,
      visitorName: app.visitor?.name,
      visitorPhone: app.visitor?.phone,
      tenantName: app.tenant?.name,
      department: app.tenant?.department,
      visitReason: app.visitReason,
      rejectReason: app.rejectReason,
      reviewedAt: app.reviewedAt,
      createdAt: app.createdAt,
    }));

    return { list: result, total: result.length };
  }

  async exportCsv(
    type: 'all' | 'overtime' | 'rejected',
    year?: number,
    month?: number
  ): Promise<string> {
    let dateFrom: Date;
    let dateTo: Date;

    if (year && month) {
      dateFrom = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month').toDate();
      dateTo = dayjs(dateFrom).endOf('month').toDate();
    } else {
      dateFrom = dayjs().startOf('month').toDate();
      dateTo = new Date();
    }

    let records: ExportRecord[] = [];

    if (type === 'overtime') {
      const { list } = await this.getOvertimeRecords(dateFrom, dateTo);
      records = list.map((item) => ({
        id: item.id,
        visitorName: item.visitorName || '',
        visitorPhone: item.visitorPhone || '',
        visitorCompany: '',
        tenantCode: '',
        tenantName: item.tenantName || '',
        department: item.department || '',
        visitReason: item.visitReason || '',
        visitReasonDetail: '',
        status: item.status || '',
        startTime: '',
        endTime: item.endTime ? dayjs(item.endTime).format('YYYY-MM-DD HH:mm') : '',
        createdAt: '',
        reviewedAt: '',
        revokedAt: item.actualEndTime ? dayjs(item.actualEndTime).format('YYYY-MM-DD HH:mm') : '',
        revokeType: item.revokeType || '',
        revokeRemark: '',
        rejectReason: '',
        reviewedBy: '',
        revokedBy: '',
        createdBy: '',
        overtimeHours: item.overtimeHours || '0',
      }));
    } else if (type === 'rejected') {
      const { list } = await this.getRejectedRecords(dateFrom, dateTo);
      records = list.map((item) => ({
        id: item.id,
        visitorName: item.visitorName || '',
        visitorPhone: item.visitorPhone || '',
        visitorCompany: '',
        tenantCode: '',
        tenantName: item.tenantName || '',
        department: item.department || '',
        visitReason: item.visitReason || '',
        visitReasonDetail: '',
        status: 'rejected',
        startTime: '',
        endTime: '',
        createdAt: item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm') : '',
        reviewedAt: item.reviewedAt ? dayjs(item.reviewedAt).format('YYYY-MM-DD HH:mm') : '',
        revokedAt: '',
        revokeType: '',
        revokeRemark: '',
        rejectReason: item.rejectReason || '',
        reviewedBy: '',
        revokedBy: '',
        createdBy: '',
        overtimeHours: '',
      }));
    } else {
      const { list } = await this.appRepo.query({
        dateFrom,
        dateTo,
        page: 1,
        pageSize: 10000,
      });
      records = list.map((app) => {
        let overtimeHours = '';
        if (app.revokedAt && app.endTime && app.revokedAt > app.endTime) {
          overtimeHours = ((app.revokedAt.getTime() - app.endTime.getTime()) / (1000 * 60 * 60)).toFixed(1);
        }
        return {
          id: app.id,
          visitorName: app.visitor?.name || '',
          visitorPhone: app.visitor?.phone || '',
          visitorCompany: app.visitor?.company || '',
          tenantCode: app.tenant?.code || '',
          tenantName: app.tenant?.name || '',
          department: app.tenant?.department || '',
          visitReason: app.visitReason || '',
          visitReasonDetail: app.visitReasonDetail || '',
          status: app.status || '',
          startTime: app.startTime ? dayjs(app.startTime).format('YYYY-MM-DD HH:mm') : '',
          endTime: app.endTime ? dayjs(app.endTime).format('YYYY-MM-DD HH:mm') : '',
          createdAt: dayjs(app.createdAt).format('YYYY-MM-DD HH:mm'),
          reviewedAt: app.reviewedAt ? dayjs(app.reviewedAt).format('YYYY-MM-DD HH:mm') : '',
          revokedAt: app.revokedAt ? dayjs(app.revokedAt).format('YYYY-MM-DD HH:mm') : '',
          revokeType: app.revokeType || '',
          revokeRemark: app.revokeRemark || '',
          rejectReason: app.rejectReason || '',
          reviewedBy: app.reviewedBy || '',
          revokedBy: app.revokedBy || '',
          createdBy: app.createdBy || '',
          overtimeHours,
        };
      });
    }

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'id', title: '申请ID' },
        { id: 'visitorName', title: '访客姓名' },
        { id: 'visitorPhone', title: '访客手机号' },
        { id: 'visitorCompany', title: '访客公司' },
        { id: 'tenantCode', title: '租户编码' },
        { id: 'tenantName', title: '接待租户' },
        { id: 'department', title: '接待部门' },
        { id: 'visitReason', title: '来访原因' },
        { id: 'visitReasonDetail', title: '原因详情' },
        { id: 'status', title: '状态' },
        { id: 'startTime', title: '生效时间' },
        { id: 'endTime', title: '过期时间' },
        { id: 'createdAt', title: '申请时间' },
        { id: 'reviewedAt', title: '审批时间' },
        { id: 'revokedAt', title: '撤回时间' },
        { id: 'revokeType', title: '撤回方式' },
        { id: 'revokeRemark', title: '撤回备注' },
        { id: 'rejectReason', title: '拒绝原因' },
        { id: 'reviewedBy', title: '审批人ID' },
        { id: 'revokedBy', title: '撤回人ID' },
        { id: 'createdBy', title: '登记人ID' },
        { id: 'overtimeHours', title: '超时(小时)' },
      ],
    });

    return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
  }

  async getOperationReport(
    dateFrom: Date,
    dateTo: Date,
    operationType?: OperationType
  ) {
    const logs = await this.logRepo.findByDateRange(dateFrom, dateTo, operationType);
    return {
      total: logs.length,
      list: logs,
    };
  }
}
