import {
  AuthorizationRepository, ReportBatchRepository, AuthorizationRevokeRepository,
  PickupRecordRepository, MailRecordRepository, ExceptionLogRepository, StaffRepository,
  execInTransaction
} from '../repositories';
import {
  PickupMethod, AuthorizedType, ReportStatus, AuthStatus, MailStatus,
  Authorization, AuthorizationRevoke, PickupRecord, MailRecord, ExceptionLog,
  PaginationParams, PaginatedResult
} from '../types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../errors';
import { logger } from '../utils/logger';

export interface CreateAuthorizationParams {
  batch_no: string;
  pickup_method: PickupMethod;
  authorized_type?: AuthorizedType;
  authorized_person_name?: string;
  authorized_person_id_card?: string;
  authorized_person_phone?: string;
  authorization_material?: string;
  created_by: number;
}

export interface RevokeAuthorizationParams {
  authorization_id: number;
  reason: string;
  revoked_by: number;
}

export interface PickupParams {
  batch_no: string;
  pickup_method: PickupMethod;
  pickup_person_name: string;
  pickup_person_id_card: string;
  authorization_id?: number;
  picked_up_by: number;
}

export interface CreateMailRecordParams {
  batch_no: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  courier_company: string;
  tracking_no: string;
  mailed_by: number;
}

export interface LogExceptionParams {
  batch_no?: string;
  report_batch_id?: number;
  attempt_person_name: string;
  attempt_person_id_card: string;
  attempt_type: string;
  intercepted_by: number;
  reason: string;
}

export class AuthorizationService {
  static create(params: CreateAuthorizationParams): Authorization {
    const staff = StaffRepository.findById(params.created_by);
    if (!staff) {
      throw new NotFoundError('经办人不存在');
    }

    const report = ReportBatchRepository.findByBatchNo(params.batch_no);
    if (!report) {
      throw new NotFoundError(`报告批次 ${params.batch_no} 不存在`);
    }

    if (report.status === ReportStatus.PICKED_UP) {
      throw new BusinessRuleError('报告已被领取，无法创建授权');
    }
    if (report.status === ReportStatus.MAILED) {
      throw new BusinessRuleError('报告已邮寄，无法再创建授权');
    }

    this.validateAuthorizationParams(params, report.is_group, !!report.company_id);

    const existingActive = AuthorizationRepository.findActiveByReportBatchId(report.id);
    if (existingActive) {
      logger.warn(`报告 ${params.batch_no} 已有有效授权，创建新授权将自动覆盖`);
      AuthorizationRepository.updateStatus(existingActive.id, AuthStatus.EXPIRED);
    }

    return AuthorizationRepository.create({
      report_batch_id: report.id,
      batch_no: report.batch_no,
      pickup_method: params.pickup_method,
      authorized_type: params.authorized_type || null,
      authorized_person_name: params.authorized_person_name || null,
      authorized_person_id_card: params.authorized_person_id_card || null,
      authorized_person_phone: params.authorized_person_phone || null,
      authorization_material: params.authorization_material || null,
      status: AuthStatus.ACTIVE,
      created_by: params.created_by,
      created_by_name: staff.name
    });
  }

  private static validateAuthorizationParams(params: CreateAuthorizationParams, isGroup: boolean, hasCompany: boolean): void {
    if (params.pickup_method === PickupMethod.AUTHORIZED) {
      if (!params.authorized_type) {
        throw new ValidationError('代领授权必须指定授权类型（家属/公司）');
      }
      if (!params.authorized_person_name || !params.authorized_person_id_card) {
        throw new ValidationError('代领授权必须提供代领人姓名和身份证号');
      }
      if (params.authorized_type === AuthorizedType.COMPANY && !isGroup) {
        throw new BusinessRuleError('非团检报告不能使用公司代领');
      }
    } else if (params.pickup_method === PickupMethod.MAIL) {
      if (isGroup && !hasCompany) {
        throw new BusinessRuleError('团检报告邮寄必须关联公司');
      }
    }
  }

  static revoke(params: RevokeAuthorizationParams): AuthorizationRevoke {
    const auth = AuthorizationRepository.findById(params.authorization_id);
    if (!auth) {
      throw new NotFoundError('授权记录不存在');
    }
    if (auth.status !== AuthStatus.ACTIVE) {
      throw new BusinessRuleError(`当前授权状态为 ${auth.status}，无法撤销`);
    }

    const staff = StaffRepository.findById(params.revoked_by);
    if (!staff) {
      throw new NotFoundError('经办人不存在');
    }
    if (!params.reason || params.reason.trim().length === 0) {
      throw new ValidationError('撤销原因不能为空');
    }

    return execInTransaction(() => {
      AuthorizationRepository.updateStatus(auth.id, AuthStatus.REVOKED);
      return AuthorizationRevokeRepository.create({
        authorization_id: auth.id,
        revoked_by: params.revoked_by,
        revoked_by_name: staff.name,
        reason: params.reason.trim()
      });
    });
  }

  static getById(id: number): Authorization {
    const auth = AuthorizationRepository.findById(id);
    if (!auth) throw new NotFoundError('授权记录不存在');
    return auth;
  }

  static getByBatchNo(batchNo: string): Authorization[] {
    const report = ReportBatchRepository.findByBatchNo(batchNo);
    if (!report) throw new NotFoundError('报告批次不存在');
    return AuthorizationRepository.findByReportBatchId(report.id);
  }

  static list(params: PaginationParams & {
    status?: AuthStatus;
    pickup_method?: PickupMethod;
    start_date?: string;
    end_date?: string;
  }): PaginatedResult<Authorization> {
    return AuthorizationRepository.list(params);
  }
}

export class PickupService {
  static pickup(params: PickupParams): PickupRecord {
    const staff = StaffRepository.findById(params.picked_up_by);
    if (!staff) throw new NotFoundError('经办人不存在');

    const report = ReportBatchRepository.findByBatchNo(params.batch_no);
    if (!report) throw new NotFoundError(`报告批次 ${params.batch_no} 不存在`);

    if (report.status === ReportStatus.PICKED_UP) {
      throw new BusinessRuleError('报告已被领取');
    }
    if (report.status === ReportStatus.MAILED) {
      throw new BusinessRuleError('报告已邮寄，不能再现场领取');
    }
    if (report.status === ReportStatus.PENDING) {
      throw new BusinessRuleError('报告尚未准备就绪');
    }

    let validAuth: Authorization | null = null;

    if (params.pickup_method === PickupMethod.SELF) {
      if (params.pickup_person_id_card !== report.patient_id_card_no) {
        throw new BusinessRuleError('本人领取身份证号不匹配，请确认或使用代领授权');
      }
    } else if (params.pickup_method === PickupMethod.AUTHORIZED) {
      let auth: Authorization | null = null;
      if (params.authorization_id) {
        auth = AuthorizationRepository.findById(params.authorization_id);
        if (!auth || auth.report_batch_id !== report.id) {
          throw new BusinessRuleError('授权记录与报告批次不匹配');
        }
      } else {
        auth = AuthorizationRepository.findActiveByReportBatchId(report.id);
      }

      if (!auth) {
        this.logException({
          batch_no: report.batch_no,
          report_batch_id: report.id,
          attempt_person_name: params.pickup_person_name,
          attempt_person_id_card: params.pickup_person_id_card,
          attempt_type: 'unauthorized_pickup',
          intercepted_by: params.picked_up_by,
          reason: '无有效代领授权'
        });
        throw new BusinessRuleError('未授权不能代领，请先办理代领授权手续');
      }
      if (auth.status !== AuthStatus.ACTIVE) {
        this.logException({
          batch_no: report.batch_no,
          report_batch_id: report.id,
          attempt_person_name: params.pickup_person_name,
          attempt_person_id_card: params.pickup_person_id_card,
          attempt_type: 'invalid_auth_pickup',
          intercepted_by: params.picked_up_by,
          reason: `授权状态为 ${auth.status}，已失效`
        });
        throw new BusinessRuleError('代领授权已失效');
      }
      if (auth.authorized_person_id_card !== params.pickup_person_id_card) {
        this.logException({
          batch_no: report.batch_no,
          report_batch_id: report.id,
          attempt_person_name: params.pickup_person_name,
          attempt_person_id_card: params.pickup_person_id_card,
          attempt_type: 'wrong_person_pickup',
          intercepted_by: params.picked_up_by,
          reason: `实际代领人与授权代领人不符，授权人：${auth.authorized_person_name}`
        });
        throw new BusinessRuleError(`实际代领人与授权代领人不符，授权人为：${auth.authorized_person_name}`);
      }
      validAuth = auth;
    } else if (params.pickup_method === PickupMethod.MAIL) {
      throw new BusinessRuleError('邮寄请使用邮寄登记接口');
    }

    return execInTransaction(() => {
      if (validAuth) {
        AuthorizationRepository.updateStatus(validAuth.id, AuthStatus.USED);
      }
      ReportBatchRepository.updateStatus(report.id, ReportStatus.PICKED_UP);
      return PickupRecordRepository.create({
        report_batch_id: report.id,
        batch_no: report.batch_no,
        authorization_id: validAuth?.id || null,
        pickup_method: params.pickup_method,
        pickup_person_name: params.pickup_person_name,
        pickup_person_id_card: params.pickup_person_id_card,
        picked_up_by: params.picked_up_by,
        picked_up_by_name: staff.name
      });
    });
  }

  private static logException(params: LogExceptionParams): void {
    try {
      const staff = StaffRepository.findById(params.intercepted_by);
      ExceptionLogRepository.create({
        ...params,
        batch_no: params.batch_no || null,
        report_batch_id: params.report_batch_id || null,
        intercepted_by_name: staff?.name || '未知'
      });
    } catch (e) {
      logger.error('记录异常拦截失败', e);
    }
  }

  static getTodayPickups(date: string, params: PaginationParams = {}): PaginatedResult<PickupRecord> {
    return PickupRecordRepository.list({ ...params, date });
  }

  static list(params: PaginationParams & {
    date?: string;
    start_date?: string;
    end_date?: string;
    pickup_method?: PickupMethod;
  }): PaginatedResult<PickupRecord> {
    return PickupRecordRepository.list(params);
  }
}

export class MailService {
  static create(params: CreateMailRecordParams): MailRecord {
    const staff = StaffRepository.findById(params.mailed_by);
    if (!staff) throw new NotFoundError('经办人不存在');

    const report = ReportBatchRepository.findByBatchNo(params.batch_no);
    if (!report) throw new NotFoundError(`报告批次 ${params.batch_no} 不存在`);

    if (report.status === ReportStatus.PICKED_UP) {
      throw new BusinessRuleError('报告已被领取，不能再邮寄');
    }
    if (report.status === ReportStatus.MAILED) {
      throw new BusinessRuleError('报告已登记邮寄');
    }

    const existingMail = MailRecordRepository.findByReportBatchId(report.id);
    if (existingMail && existingMail.status !== MailStatus.RETURNED) {
      throw new BusinessRuleError('该报告已有邮寄记录');
    }

    return execInTransaction(() => {
      ReportBatchRepository.updateStatus(report.id, ReportStatus.MAILED);
      const activeAuth = AuthorizationRepository.findActiveByReportBatchId(report.id);
      if (activeAuth && activeAuth.status === AuthStatus.ACTIVE) {
        AuthorizationRepository.updateStatus(activeAuth.id, AuthStatus.USED);
      }
      return MailRecordRepository.create({
        report_batch_id: report.id,
        batch_no: report.batch_no,
        receiver_name: params.receiver_name,
        receiver_phone: params.receiver_phone,
        receiver_address: params.receiver_address,
        courier_company: params.courier_company,
        tracking_no: params.tracking_no,
        status: MailStatus.SHIPPED,
        mailed_by: params.mailed_by,
        mailed_by_name: staff.name
      });
    });
  }

  static updateStatus(id: number, status: MailStatus, deliveredAt?: string): MailRecord {
    const mail = MailRecordRepository.findById(id);
    if (!mail) throw new NotFoundError('邮寄记录不存在');
    MailRecordRepository.updateStatus(id, status, deliveredAt);
    return MailRecordRepository.findById(id)!;
  }

  static getById(id: number): MailRecord {
    const mail = MailRecordRepository.findById(id);
    if (!mail) throw new NotFoundError('邮寄记录不存在');
    return mail;
  }

  static getByTrackingNo(trackingNo: string): MailRecord {
    const mail = MailRecordRepository.findByTrackingNo(trackingNo);
    if (!mail) throw new NotFoundError('未找到该运单号的邮寄记录');
    return mail;
  }

  static list(params: PaginationParams & {
    status?: MailStatus;
    start_date?: string;
    end_date?: string;
    batch_no?: string;
  }): PaginatedResult<MailRecord> {
    return MailRecordRepository.list(params);
  }
}

export class GroupCheckService {
  static checkCompanyPickupEligibility(companyId: number, params: PaginationParams = {}) {
    const result = ReportBatchRepository.findGroupBatches(companyId, params);
    const list = result.list.map(batch => {
      const activeAuth = AuthorizationRepository.findActiveByReportBatchId(batch.id);
      const pickupRecord = PickupRecordRepository.findByReportBatchId(batch.id);
      const mailRecord = MailRecordRepository.findByReportBatchId(batch.id);

      let canCompanyPickup = false;
      let mustSelfConfirm = false;
      let reason = '';

      if (batch.status === ReportStatus.PICKED_UP) {
        reason = '报告已被领取';
      } else if (batch.status === ReportStatus.MAILED) {
        reason = '报告已邮寄';
      } else if (batch.status === ReportStatus.PENDING) {
        reason = '报告尚未就绪';
      } else {
        if (activeAuth && activeAuth.status === AuthStatus.ACTIVE) {
          if (activeAuth.pickup_method === PickupMethod.AUTHORIZED && activeAuth.authorized_type === AuthorizedType.COMPANY) {
            canCompanyPickup = true;
            reason = `已授权公司代领，授权人：${activeAuth.authorized_person_name}`;
          } else if (activeAuth.pickup_method === PickupMethod.AUTHORIZED && activeAuth.authorized_type === AuthorizedType.FAMILY) {
            mustSelfConfirm = true;
            reason = `已授权家属代领（${activeAuth.authorized_person_name}），如需改为公司代领请先撤销原授权`;
          } else if (activeAuth.pickup_method === PickupMethod.MAIL) {
            reason = '已安排邮寄';
          } else if (activeAuth.pickup_method === PickupMethod.SELF) {
            mustSelfConfirm = true;
            reason = '已登记本人领取';
          }
        } else {
          mustSelfConfirm = true;
          reason = '未办理公司代领授权，需本人确认或办理公司代领授权';
        }
      }

      return {
        batch,
        can_company_pickup: canCompanyPickup,
        must_self_confirm: mustSelfConfirm,
        reason,
        active_authorization: activeAuth,
        pickup_record: pickupRecord,
        mail_record: mailRecord
      };
    });

    const summary = {
      total: result.total,
      can_company_pickup: list.filter(x => x.can_company_pickup).length,
      must_self_confirm: list.filter(x => x.must_self_confirm).length,
      already_picked: list.filter(x => x.batch.status === ReportStatus.PICKED_UP).length,
      already_mailed: list.filter(x => x.batch.status === ReportStatus.MAILED).length,
      pending: list.filter(x => x.batch.status === ReportStatus.PENDING).length
    };

    return { list, summary, page: result.page, page_size: result.page_size };
  }
}

export class ExceptionService {
  static list(params: PaginationParams & {
    start_date?: string;
    end_date?: string;
    attempt_type?: string;
  }): PaginatedResult<ExceptionLog> {
    return ExceptionLogRepository.list(params);
  }

  static log(params: LogExceptionParams): ExceptionLog {
    const staff = StaffRepository.findById(params.intercepted_by);
    if (!staff) throw new NotFoundError('经办人不存在');
    return ExceptionLogRepository.create({
      ...params,
      batch_no: params.batch_no || null,
      report_batch_id: params.report_batch_id || null,
      intercepted_by_name: staff.name
    });
  }
}

export class RevokeService {
  static list(params: PaginationParams & {
    start_date?: string;
    end_date?: string;
  }): PaginatedResult<AuthorizationRevoke> {
    return AuthorizationRevokeRepository.list(params);
  }
}
