import { Router, Request, Response } from 'express';
import { asyncHandler, validateBody, validateQuery, requireRole } from '../middleware';
import {
  createAuthorizationSchema,
  revokeAuthorizationSchema,
  pickupSchema,
  createMailSchema,
  updateMailStatusSchema,
  logExceptionSchema,
  paginationSchema,
  dateRangeSchema
} from '../validators';
import {
  AuthorizationService,
  PickupService,
  MailService,
  GroupCheckService,
  ExceptionService,
  RevokeService
} from '../services';
import { ReportBatchRepository, StaffRepository, PatientRepository, CompanyRepository } from '../repositories';
import { StaffRole, ReportStatus, AuthStatus, PickupMethod, MailStatus } from '../types';
import Joi from 'joi';

const router = Router();

// ==================== 健康检查 ====================
router.get('/health', (_req: Request, res: Response) => {
  res.json({ code: 0, message: 'ok', data: { status: 'running', timestamp: new Date().toISOString() } });
});

// ==================== 基础数据查询 ====================

// 员工信息查询
router.get('/staff/:id', asyncHandler(async (req: Request, res: Response) => {
  const staff = StaffRepository.findById(parseInt(req.params.id));
  if (!staff) return res.status(404).json({ code: 40401, message: '员工不存在' });
  res.json({ code: 0, message: 'ok', data: staff });
}));

// 查询体检报告
router.get('/reports', validateQuery(paginationSchema.keys({
  status: Joi.string().valid(...Object.values(ReportStatus)),
  date: Joi.string(),
  company_id: Joi.number().integer().positive()
})), requireRole([StaffRole.RECEPTIONIST, StaffRole.CUSTOMER_SERVICE, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const { status, date, company_id, page, page_size } = req.query as any;
  const result = ReportBatchRepository.findReadyForPickup({
    date: date,
    company_id: company_id ? parseInt(company_id) : undefined,
    page,
    page_size
  });
  if (status) {
    result.list = result.list.filter(r => r.status === status);
    result.total = result.list.length;
  }
  res.json({ code: 0, message: 'ok', data: result });
}));

// 根据批次号查报告详情
router.get('/reports/:batchNo', requireRole([StaffRole.RECEPTIONIST, StaffRole.CUSTOMER_SERVICE, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const report = ReportBatchRepository.findByBatchNo(req.params.batchNo);
  if (!report) return res.status(404).json({ code: 40401, message: '报告批次不存在' });
  res.json({ code: 0, message: 'ok', data: report });
}));

// ==================== 代领授权管理 ====================

// 创建代领授权
router.post('/authorizations', validateBody(createAuthorizationSchema), requireRole([StaffRole.RECEPTIONIST, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const auth = AuthorizationService.create(req.body);
  res.status(201).json({ code: 0, message: '授权创建成功', data: auth });
}));

// 查询授权列表
router.get('/authorizations', validateQuery(paginationSchema.keys({
  status: Joi.string().valid(...Object.values(AuthStatus)),
  pickup_method: Joi.string().valid(...Object.values(PickupMethod)),
  ...dateRangeSchema.describe().keys
})), requireRole([StaffRole.RECEPTIONIST, StaffRole.CUSTOMER_SERVICE, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const result = AuthorizationService.list(req.query as any);
  res.json({ code: 0, message: 'ok', data: result });
}));

// 查询单个授权详情
router.get('/authorizations/:id', requireRole([StaffRole.RECEPTIONIST, StaffRole.CUSTOMER_SERVICE, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const auth = AuthorizationService.getById(parseInt(req.params.id));
  res.json({ code: 0, message: 'ok', data: auth });
}));

// 按报告批次查授权
router.get('/authorizations/batch/:batchNo', requireRole([StaffRole.RECEPTIONIST, StaffRole.CUSTOMER_SERVICE, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const auths = AuthorizationService.getByBatchNo(req.params.batchNo);
  res.json({ code: 0, message: 'ok', data: auths });
}));

// 撤销授权
router.post('/authorizations/revoke', validateBody(revokeAuthorizationSchema), requireRole([StaffRole.RECEPTIONIST, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const revoke = AuthorizationService.revoke(req.body);
  res.json({ code: 0, message: '授权已撤销', data: revoke });
}));

// 撤销授权记录列表（主管导出用）
router.get('/revokes', validateQuery(paginationSchema.keys(dateRangeSchema.describe().keys)), requireRole([StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const result = RevokeService.list(req.query as any);
  res.json({ code: 0, message: 'ok', data: result });
}));

// ==================== 前台领取 ====================

// 前台执行领取（本人或代领）
router.post('/pickups', validateBody(pickupSchema), requireRole([StaffRole.RECEPTIONIST]), asyncHandler(async (req: Request, res: Response) => {
  const record = PickupService.pickup(req.body);
  res.status(201).json({ code: 0, message: '领取成功', data: record });
}));

// 前台查今日待领报告
router.get('/pickups/today', validateQuery(paginationSchema.keys({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
})), requireRole([StaffRole.RECEPTIONIST, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const result = PickupService.getTodayPickups(date, req.query as any);
  res.json({ code: 0, message: 'ok', data: result });
}));

// 领取记录列表
router.get('/pickups', validateQuery(paginationSchema.keys({
  date: Joi.string(),
  start_date: Joi.string(),
  end_date: Joi.string(),
  pickup_method: Joi.string().valid(...Object.values(PickupMethod))
})), requireRole([StaffRole.RECEPTIONIST, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const result = PickupService.list(req.query as any);
  res.json({ code: 0, message: 'ok', data: result });
}));

// ==================== 客服邮寄管理 ====================

// 登记邮寄
router.post('/mails', validateBody(createMailSchema), requireRole([StaffRole.CUSTOMER_SERVICE, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const mail = MailService.create(req.body);
  res.status(201).json({ code: 0, message: '邮寄登记成功', data: mail });
}));

// 客服查邮寄列表（查询邮寄进度）
router.get('/mails', validateQuery(paginationSchema.keys({
  status: Joi.string().valid(...Object.values(MailStatus)),
  batch_no: Joi.string(),
  ...dateRangeSchema.describe().keys
})), requireRole([StaffRole.CUSTOMER_SERVICE, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const result = MailService.list(req.query as any);
  res.json({ code: 0, message: 'ok', data: result });
}));

// 运单号查邮寄进度
router.get('/mails/tracking/:trackingNo', requireRole([StaffRole.CUSTOMER_SERVICE, StaffRole.RECEPTIONIST, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const mail = MailService.getByTrackingNo(req.params.trackingNo);
  res.json({ code: 0, message: 'ok', data: mail });
}));

// 查询单个邮寄记录
router.get('/mails/:id', requireRole([StaffRole.CUSTOMER_SERVICE, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const mail = MailService.getById(parseInt(req.params.id));
  res.json({ code: 0, message: 'ok', data: mail });
}));

// 更新邮寄状态（客服标记签收/退回）
router.put('/mails/:id/status', validateBody(updateMailStatusSchema), requireRole([StaffRole.CUSTOMER_SERVICE, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const mail = MailService.updateStatus(parseInt(req.params.id), req.body.status, req.body.delivered_at);
  res.json({ code: 0, message: '邮寄状态已更新', data: mail });
}));

// ==================== 团检查询 ====================

// 批量查询公司团检报告领取资格
router.get('/group-check/company/:companyId', validateQuery(paginationSchema), requireRole([StaffRole.RECEPTIONIST, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const result = GroupCheckService.checkCompanyPickupEligibility(parseInt(req.params.companyId), req.query as any);
  res.json({ code: 0, message: 'ok', data: result });
}));

// ==================== 主管统计导出 ====================

// 异常拦截记录
router.get('/exceptions', validateQuery(paginationSchema.keys({
  attempt_type: Joi.string(),
  ...dateRangeSchema.describe().keys
})), requireRole([StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const result = ExceptionService.list(req.query as any);
  res.json({ code: 0, message: 'ok', data: result });
}));

// 手动记录异常（用于前台紧急拦截）
router.post('/exceptions', validateBody(logExceptionSchema), requireRole([StaffRole.RECEPTIONIST, StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const log = ExceptionService.log(req.body);
  res.status(201).json({ code: 0, message: '异常已记录', data: log });
}));

// 主管综合导出数据
router.get('/export/summary', validateQuery(dateRangeSchema), requireRole([StaffRole.SUPERVISOR]), asyncHandler(async (req: Request, res: Response) => {
  const params = req.query as any;
  const authorizations = await AuthorizationService.list({ ...params, page_size: 10000 });
  const revokes = await RevokeService.list({ ...params, page_size: 10000 });
  const pickups = await PickupService.list({ ...params, page_size: 10000 });
  const mails = await MailService.list({ ...params, page_size: 10000 });
  const exceptions = await ExceptionService.list({ ...params, page_size: 10000 });

  res.json({
    code: 0,
    message: 'ok',
    data: {
      authorizations: authorizations.list,
      revokes: revokes.list,
      pickups: pickups.list,
      mails: mails.list,
      exceptions: exceptions.list,
      summary: {
        authorization_count: authorizations.total,
        revoke_count: revokes.total,
        pickup_count: pickups.total,
        mail_count: mails.total,
        exception_count: exceptions.total
      }
    }
  });
}));

export default router;
