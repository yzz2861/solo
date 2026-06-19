import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as pointsController from '../controllers/pointsController';
import { idempotencyMiddleware } from '../middleware/idempotency';

const router = Router();

router.get('/public', pointsController.getPublicList);

router.use(authenticate);

router.get('/me', pointsController.getMyTransactions);
router.get('/pending-reviews', requireRole('social_worker', 'director'), pointsController.getPendingReviews);
router.get('/:id', pointsController.getById);
router.get('/', requireRole('social_worker', 'director'), pointsController.getTransactions);

router.post('/:id/review', requireRole('social_worker', 'director'), pointsController.review);
router.post('/award', requireRole('social_worker', 'director'), idempotencyMiddleware('award_points'), pointsController.manualAward);
router.post('/freeze', requireRole('social_worker', 'director'), idempotencyMiddleware('freeze_points'), pointsController.manualFreeze);
router.post('/refund', requireRole('social_worker', 'director'), idempotencyMiddleware('refund_points'), pointsController.manualRefund);

export default router;
