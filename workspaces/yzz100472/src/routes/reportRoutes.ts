import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import {
  getOverdueVisitors,
  getAbnormalAccessLogs,
  getWeeklyReport,
  getDashboardStats,
} from '../controllers/reportController';
import { authenticate, requireRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/dashboard', asyncHandler(getDashboardStats));
router.get(
  '/overdue-visitors',
  requireRoles(UserRole.OPERATIONS, UserRole.RECEPTION, UserRole.SECURITY),
  asyncHandler(getOverdueVisitors)
);
router.get(
  '/abnormal-access',
  requireRoles(UserRole.OPERATIONS, UserRole.SECURITY),
  asyncHandler(getAbnormalAccessLogs)
);
router.get(
  '/weekly-report',
  requireRoles(UserRole.OPERATIONS, UserRole.RECEPTION),
  asyncHandler(getWeeklyReport)
);

export default router;
