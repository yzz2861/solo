import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import {
  createVisitor,
  getVisitors,
  getVisitorById,
} from '../controllers/visitorController';
import { authenticate, requireRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(getVisitors));
router.post(
  '/',
  requireRoles(
    UserRole.RECEPTION,
    UserRole.OPERATIONS,
    UserRole.TENANT_ADMIN
  ),
  asyncHandler(createVisitor)
);
router.get('/:id', asyncHandler(getVisitorById));

export default router;
