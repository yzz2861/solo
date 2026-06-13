import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import {
  grantAccess,
  revokeAccess,
  getAccessPermissions,
  getAccessPermissionById,
} from '../controllers/accessController';
import { authenticate, requireRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(getAccessPermissions));
router.post(
  '/grant',
  requireRoles(UserRole.RECEPTION, UserRole.OPERATIONS),
  asyncHandler(grantAccess)
);
router.get('/:id', asyncHandler(getAccessPermissionById));
router.put(
  '/:id/revoke',
  requireRoles(UserRole.RECEPTION, UserRole.OPERATIONS),
  asyncHandler(revokeAccess)
);

export default router;
