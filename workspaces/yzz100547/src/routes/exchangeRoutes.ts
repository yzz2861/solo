import { Router } from 'express';
import { authenticate, requireRole, requireSelfOrRole } from '../middleware/auth';
import * as exchangeController from '../controllers/exchangeController';
import { idempotencyMiddleware } from '../middleware/idempotency';

const router = Router();

router.get('/public', exchangeController.getPublicList);

router.use(authenticate);

router.post('/', idempotencyMiddleware('create_exchange'), exchangeController.create);
router.get('/me', exchangeController.getMyOrders);
router.get('/pending-reviews', requireRole('social_worker', 'director'), exchangeController.getPendingReviews);
router.get('/:id', exchangeController.getById);
router.post('/:id/cancel', exchangeController.cancel);
router.get('/user/:userId', requireSelfOrRole('social_worker', 'director'), exchangeController.getUserOrders);

router.use(requireRole('social_worker', 'director'));

router.get('/', exchangeController.list);
router.post('/:id/review', exchangeController.review);

export default router;
