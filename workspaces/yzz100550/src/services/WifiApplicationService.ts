import dayjs = require('dayjs');
import { VisitorRepository } from '../repositories/VisitorRepository';
import { WifiApplicationRepository, ApplicationQuery } from '../repositories/WifiApplicationRepository';
import { TenantRepository } from '../repositories/TenantRepository';
import { OperationLogRepository } from '../repositories/OperationLogRepository';
import { BusinessError } from '../utils/response';
import { generateWifiPassword, generateWifiUsername, validatePhone, validateChineseName } from '../utils/wifi';
import {
  WifiApplication,
  ApplicationStatus,
  VisitReason,
  RevokeType,
} from '../entities/WifiApplication';
import { Visitor } from '../entities/Visitor';

export interface CreateApplicationInput {
  visitorName: string;
  visitorPhone: string;
  visitorCompany?: string;
  visitorIdCard?: string;
  tenantId: string;
  visitReason: VisitReason;
  visitReasonDetail?: string;
  startTime: string | Date;
  endTime: string | Date;
}

export interface ApplicationDetail extends WifiApplication {
  _duplicate?: boolean;
}

export class WifiApplicationService {
  private visitorRepo: VisitorRepository;
  private appRepo: WifiApplicationRepository;
  private tenantRepo: TenantRepository;
  private logRepo: OperationLogRepository;

  private readonly WIFI_SSID = 'Enterprise-Guest-WiFi';

  constructor() {
    this.visitorRepo = new VisitorRepository();
    this.appRepo = new WifiApplicationRepository();
    this.tenantRepo = new TenantRepository();
    this.logRepo = new OperationLogRepository();
  }

  private validateCreateInput(input: CreateApplicationInput): void {
    if (!validateChineseName(input.visitorName)) {
      throw new BusinessError('访客姓名格式不正确', 400);
    }
    if (!validatePhone(input.visitorPhone)) {
      throw new BusinessError('访客手机号格式不正确', 400);
    }
    if (!input.tenantId) {
      throw new BusinessError('请选择接待租户', 400);
    }
    if (!input.visitReason) {
      throw new BusinessError('请选择来访原因', 400);
    }
    const start = dayjs(input.startTime);
    const end = dayjs(input.endTime);
    if (!start.isValid() || !end.isValid()) {
      throw new BusinessError('时间格式不正确', 400);
    }
    if (end.isBefore(start)) {
      throw new BusinessError('结束时间不能早于开始时间', 400);
    }
    if (end.diff(start, 'hour') > 72) {
      throw new BusinessError('WiFi权限最长不超过72小时', 400);
    }
    if (end.isBefore(dayjs())) {
      throw new BusinessError('结束时间不能早于当前时间', 400);
    }
  }

  async createApplication(
    input: CreateApplicationInput,
    operatorId?: string,
    operatorName?: string
  ): Promise<{ application: ApplicationDetail; visitor: Visitor }> {
    this.validateCreateInput(input);

    const tenant = await this.tenantRepo.findById(input.tenantId);
    if (!tenant) {
      throw new BusinessError('接待租户不存在', 404);
    }

    const existingActive = await this.appRepo.findActiveByPhone(input.visitorPhone);
    if (existingActive) {
      return {
        application: { ...existingActive, _duplicate: true },
        visitor: existingActive.visitor,
      };
    }

    const visitor = await this.visitorRepo.findOrCreate({
      name: input.visitorName,
      phone: input.visitorPhone,
      company: input.visitorCompany,
      idCard: input.visitorIdCard,
    });

    const startTime = dayjs(input.startTime).toDate();
    const endTime = dayjs(input.endTime).toDate();
    const shouldActivateNow = dayjs(startTime).isBefore(dayjs()) || dayjs(startTime).isSame(dayjs(), 'minute');

    const application = await this.appRepo.create({
      visitorId: visitor.id,
      tenantId: tenant.id,
      status: shouldActivateNow ? 'approved' : 'pending',
      visitReason: input.visitReason,
      visitReasonDetail: input.visitReasonDetail,
      startTime,
      endTime,
      wifiSsid: this.WIFI_SSID,
      createdBy: operatorId,
    });

    if (shouldActivateNow) {
      application.wifiUsername = generateWifiUsername(visitor.name, visitor.phone);
      application.wifiPassword = generateWifiPassword();
      application.reviewedBy = operatorId as string;
      application.reviewedAt = new Date();
      application.status = 'active';
      await this.appRepo.update(application.id, {
        wifiUsername: application.wifiUsername,
        wifiPassword: application.wifiPassword,
        reviewedBy: application.reviewedBy,
        reviewedAt: application.reviewedAt,
        status: 'active',
      });
    }

    await this.logRepo.create({
      operationType: 'application_create',
      targetId: application.id,
      operatorId,
      operatorName,
      detail: `创建WiFi申请: 访客${visitor.name}(${visitor.phone}), 租户${tenant.name}, 原因${input.visitReason}`,
      afterData: application,
    });

    return { application, visitor };
  }

  async approveApplication(
    applicationId: string,
    operatorId: string,
    operatorName: string
  ): Promise<WifiApplication> {
    const app = await this.appRepo.findById(applicationId);
    if (!app) {
      throw new BusinessError('申请不存在', 404);
    }
    if (app.status !== 'pending') {
      throw new BusinessError(`当前状态为${app.status}，不可审批`, 400);
    }

    const wifiUsername = generateWifiUsername(app.visitor.name, app.visitor.phone);
    const wifiPassword = generateWifiPassword();
    const now = new Date();
    const isActive = dayjs(app.startTime).isBefore(dayjs()) || dayjs(app.startTime).isSame(dayjs(), 'minute');

    const updated = await this.appRepo.update(applicationId, {
      status: isActive ? 'active' : 'approved',
      wifiUsername,
      wifiPassword,
      reviewedBy: operatorId,
      reviewedAt: now,
    });
    if (!updated) {
      throw new BusinessError('审批失败', 500);
    }

    await this.logRepo.create({
      operationType: isActive ? 'application_activate' : 'application_approve',
      targetId: applicationId,
      operatorId,
      operatorName,
      detail: `租户确认通过WiFi申请: 生成账号${wifiUsername}`,
      beforeData: app,
      afterData: updated,
    });

    return updated;
  }

  async rejectApplication(
    applicationId: string,
    reason: string,
    operatorId: string,
    operatorName: string
  ): Promise<WifiApplication> {
    const app = await this.appRepo.findById(applicationId);
    if (!app) {
      throw new BusinessError('申请不存在', 404);
    }
    if (app.status !== 'pending') {
      throw new BusinessError(`当前状态为${app.status}，不可拒绝`, 400);
    }
    if (!reason || reason.trim().length === 0) {
      throw new BusinessError('请填写拒绝原因', 400);
    }

    const updated = await this.appRepo.update(applicationId, {
      status: 'rejected',
      rejectReason: reason,
      reviewedBy: operatorId,
      reviewedAt: new Date(),
    });
    if (!updated) {
      throw new BusinessError('拒绝失败', 500);
    }

    await this.logRepo.create({
      operationType: 'application_reject',
      targetId: applicationId,
      operatorId,
      operatorName,
      detail: `拒绝WiFi申请，原因: ${reason}`,
      beforeData: app,
      afterData: updated,
    });

    return updated;
  }

  private async revokeApplication(
    applicationId: string,
    revokeType: RevokeType,
    operatorId: string | undefined,
    operatorName: string | undefined,
    remark?: string
  ): Promise<WifiApplication> {
    const app = await this.appRepo.findById(applicationId);
    if (!app) {
      throw new BusinessError('申请不存在', 404);
    }
    const revocableStatuses: ApplicationStatus[] = ['approved', 'active'];
    if (!revocableStatuses.includes(app.status)) {
      throw new BusinessError(`当前状态为${app.status}，不可撤回`, 400);
    }

    const statusMap: Record<RevokeType, ApplicationStatus> = {
      manual: 'revoked_manual',
      auto: 'revoked_auto',
      early_leave: 'left_early',
    };
    const opMap: Record<RevokeType, string> = {
      manual: 'application_revoke_manual',
      auto: 'application_revoke_auto',
      early_leave: 'application_early_leave',
    };

    const updated = await this.appRepo.update(applicationId, {
      status: statusMap[revokeType],
      revokedBy: operatorId,
      revokedAt: new Date(),
      revokeType,
      revokeRemark: remark,
    });
    if (!updated) {
      throw new BusinessError('撤回失败', 500);
    }

    const detailMap: Record<RevokeType, string> = {
      manual: `手动撤回WiFi权限${remark ? ': ' + remark : ''}`,
      auto: '系统自动撤回过期WiFi权限',
      early_leave: `访客提前离场${remark ? ': ' + remark : ''}，撤回WiFi权限`,
    };

    await this.logRepo.create({
      operationType: opMap[revokeType] as any,
      targetId: applicationId,
      operatorId,
      operatorName: operatorName || (revokeType === 'auto' ? 'system' : operatorName),
      detail: detailMap[revokeType],
      beforeData: app,
      afterData: updated,
    });

    return updated;
  }

  async manualRevoke(
    applicationId: string,
    operatorId: string,
    operatorName: string,
    remark?: string
  ): Promise<WifiApplication> {
    return this.revokeApplication(applicationId, 'manual', operatorId, operatorName, remark);
  }

  async earlyLeave(
    applicationId: string,
    operatorId: string,
    operatorName: string,
    remark?: string
  ): Promise<WifiApplication> {
    return this.revokeApplication(applicationId, 'early_leave', operatorId, operatorName, remark);
  }

  async autoRevokeExpired(): Promise<number> {
    const expired = await this.appRepo.findActiveApplications(new Date());
    let count = 0;
    for (const app of expired) {
      try {
        await this.revokeApplication(app.id, 'auto', undefined, undefined);
        count++;
      } catch (e) {
        console.error(`[AutoRevoke] Failed for ${app.id}:`, e);
      }
    }
    return count;
  }

  async getDetail(id: string): Promise<WifiApplication> {
    const app = await this.appRepo.findById(id);
    if (!app) {
      throw new BusinessError('申请不存在', 404);
    }
    return app;
  }

  async query(options: ApplicationQuery) {
    return this.appRepo.query(options);
  }

  async getPendingForToday(): Promise<WifiApplication[]> {
    return this.appRepo.findPendingForToday();
  }

  async getExpiringSoon(hours: number = 2): Promise<WifiApplication[]> {
    return this.appRepo.findExpiringSoon(hours);
  }

  async getNotLeft(tenantId?: string): Promise<WifiApplication[]> {
    return this.appRepo.findNotLeftByTenant(tenantId);
  }

  async getByTenant(tenantId: string, status?: ApplicationStatus[]): Promise<WifiApplication[]> {
    return this.appRepo.findByTenant(tenantId, status);
  }

  async getOperationLogs(applicationId: string) {
    return this.logRepo.findByTarget(applicationId);
  }
}
