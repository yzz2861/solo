import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import {
  createAccessLog,
  getAccessLogs,
  alignExitTime,
} from '../controllers/accessLogController';
import { authenticate, requireRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireRoles(
    UserRole.SECURITY,
    UserRole.RECEPTION,
    UserRole.OPERATIONS,
    UserRole.TENANT_ADMIN
  ),
  asyncHandler(getAccessLogs)
);
router.post(
  '/',
  requireRoles(UserRole.SECURITY, UserRole.OPERATIONS),
  asyncHandler(createAccessLog)
);
router.put(
  '/align-exit/:visitId',
  requireRoles(UserRole.RECEPTION, UserRole.OPERATIONS),
  asyncHandler(alignExitTime)
);

export default router;
