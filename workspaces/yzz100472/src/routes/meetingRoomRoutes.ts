import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import {
  createMeetingRoom,
  getMeetingRooms,
  getMeetingRoomById,
  updateMeetingRoom,
  deleteMeetingRoom,
} from '../controllers/meetingRoomController';
import { authenticate, requireRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(getMeetingRooms));
router.post(
  '/',
  requireRoles(UserRole.OPERATIONS),
  asyncHandler(createMeetingRoom)
);
router.get('/:id', asyncHandler(getMeetingRoomById));
router.put(
  '/:id',
  requireRoles(UserRole.OPERATIONS),
  asyncHandler(updateMeetingRoom)
);
router.delete(
  '/:id',
  requireRoles(UserRole.OPERATIONS),
  asyncHandler(deleteMeetingRoom)
);

export default router;
