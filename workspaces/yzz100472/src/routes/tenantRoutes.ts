import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
} from '../controllers/tenantController';
import { authenticate, requireRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireRoles(UserRole.OPERATIONS, UserRole.RECEPTION),
  asyncHandler(getTenants)
);
router.post(
  '/',
  requireRoles(UserRole.OPERATIONS),
  asyncHandler(createTenant)
);
router.get('/:id', asyncHandler(getTenantById));
router.put(
  '/:id',
  requireRoles(UserRole.OPERATIONS),
  asyncHandler(updateTenant)
);
router.delete(
  '/:id',
  requireRoles(UserRole.OPERATIONS),
  asyncHandler(deleteTenant)
);

export default router;
