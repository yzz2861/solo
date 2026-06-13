import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import {
  createVisit,
  approveVisit,
  rejectVisit,
  cancelVisit,
  getVisits,
  getTodayVisits,
  getVisitById,
} from '../controllers/visitController';
import { authenticate, requireRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/today', asyncHandler(getTodayVisits));
router.get('/', asyncHandler(getVisits));
router.post(
  '/',
  requireRoles(
    UserRole.RECEPTION,
    UserRole.OPERATIONS,
    UserRole.TENANT_ADMIN
  ),
  asyncHandler(createVisit)
);
router.get('/:id', asyncHandler(getVisitById));
router.put(
  '/:id/approve',
  requireRoles(UserRole.RECEPTION, UserRole.OPERATIONS),
  asyncHandler(approveVisit)
);
router.put(
  '/:id/reject',
  requireRoles(UserRole.RECEPTION, UserRole.OPERATIONS),
  asyncHandler(rejectVisit)
);
router.put('/:id/cancel', asyncHandler(cancelVisit));

export default router;
