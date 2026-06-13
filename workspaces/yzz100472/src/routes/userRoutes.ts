import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/userController';
import { authenticate, requireRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(requireRoles(UserRole.OPERATIONS));

router.get('/', asyncHandler(getUsers));
router.post('/', asyncHandler(createUser));
router.get('/:id', asyncHandler(getUserById));
router.put('/:id', asyncHandler(updateUser));
router.delete('/:id', asyncHandler(deleteUser));

export default router;
