import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as activityController from '../controllers/activityController';
import { idempotencyMiddleware } from '../middleware/idempotency';

const router = Router();

router.use(authenticate);

router.get('/', activityController.list);
router.get('/:id', activityController.getById);
router.get('/:id/participants', activityController.getParticipants);

router.use(requireRole('social_worker', 'director'));

router.post('/', idempotencyMiddleware('create_activity'), activityController.create);
router.post('/:id/participants', idempotencyMiddleware('add_participants'), activityController.addParticipants);
router.post('/:id/cancel', activityController.cancel);

export default router;
