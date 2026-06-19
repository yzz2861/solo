import { Router } from 'express';
import { WifiApplicationService } from '../services/WifiApplicationService';
import { success, handleError } from '../utils/response';
import {
  AuthRequest,
  authMiddleware,
  requireRole,
  requireTenantPermission,
} from '../middleware/auth';
import { ApplicationStatus } from '../entities/WifiApplication';

const router = Router();
const appService = new WifiApplicationService();

router.use(authMiddleware);

router.post('/', async (req: AuthRequest, res) => {
  try {
    const user = req.currentUser;
    const result = await appService.createApplication(
      req.body,
      user?.userId,
      user?.name
    );
    const status = result.application._duplicate ? 200 : 201;
    res.status(status).json({
      code: 0,
      message: result.application._duplicate
        ? '该手机号已有未过期的WiFi权限，已返回现有信息'
        : '申请创建成功',
      data: {
        ...result,
        duplicate: result.application._duplicate || false,
      },
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const user = req.currentUser!;
    const status = req.query.status as string;
    const statusList = status
      ? (status.split(',') as ApplicationStatus[])
      : undefined;
    const tenantId =
      user.role === 'tenant_admin' ? user.tenantId : (req.query.tenantId as string);

    const result = await appService.query({
      status: statusList,
      tenantId,
      visitorPhone: req.query.visitorPhone as string,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
    });
    success(res, result);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/reception/today-pending', requireRole('reception', 'admin'), async (req, res) => {
  try {
    success(res, await appService.getPendingForToday());
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/night-shift/summary', requireRole('night_shift', 'admin'), async (req: AuthRequest, res) => {
  try {
    const user = req.currentUser!;
    const tenantId = user.role === 'admin'
      ? (req.query.tenantId as string)
      : undefined;

    const [expiring, notLeft] = await Promise.all([
      appService.getExpiringSoon(4),
      appService.getNotLeft(tenantId),
    ]);
    success(res, {
      expiringSoon: expiring.filter((e) => !tenantId || e.tenantId === tenantId),
      notCheckedOut: notLeft,
      expiringCount: expiring.filter((e) => !tenantId || e.tenantId === tenantId).length,
      notCheckedOutCount: notLeft.length,
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id', async (req, res) => {
  try {
    success(res, await appService.getDetail(req.params.id));
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id/logs', async (req, res) => {
  try {
    success(res, await appService.getOperationLogs(req.params.id));
  } catch (err) {
    handleError(res, err);
  }
});

router.post(
  '/:id/approve',
  requireRole('tenant_admin', 'admin'),
  requireTenantPermission(),
  async (req: AuthRequest, res) => {
    try {
      const user = req.currentUser!;
      success(
        res,
        await appService.approveApplication(req.params.id, user.userId, user.name)
      );
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.post(
  '/:id/reject',
  requireRole('tenant_admin', 'admin'),
  requireTenantPermission(),
  async (req: AuthRequest, res) => {
    try {
      const user = req.currentUser!;
      const { reason } = req.body;
      success(
        res,
        await appService.rejectApplication(req.params.id, reason, user.userId, user.name)
      );
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.post(
  '/:id/revoke',
  requireRole('reception', 'tenant_admin', 'admin', 'night_shift'),
  requireTenantPermission(),
  async (req: AuthRequest, res) => {
    try {
      const user = req.currentUser!;
      const { remark } = req.body;
      success(
        res,
        await appService.manualRevoke(req.params.id, user.userId, user.name, remark)
      );
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.post(
  '/:id/early-leave',
  requireRole('reception', 'tenant_admin', 'admin', 'night_shift'),
  requireTenantPermission(),
  async (req: AuthRequest, res) => {
    try {
      const user = req.currentUser!;
      const { remark } = req.body;
      success(
        res,
        await appService.earlyLeave(req.params.id, user.userId, user.name, remark)
      );
    } catch (err) {
      handleError(res, err);
    }
  }
);

export const applicationRoutes = router;
