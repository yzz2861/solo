import { Router } from 'express';
import { authenticate, requireRole, requireSelfOrRole } from '../middleware/auth';
import * as authController from '../controllers/authController';
import { idempotencyMiddleware } from '../middleware/idempotency';

const router = Router();

router.post('/register', idempotencyMiddleware('register'), authController.register);
router.post('/login', idempotencyMiddleware('login'), authController.login);
router.get('/me', authenticate, authController.getMe);
router.get('/users/:id', authenticate, requireRole('social_worker', 'director'), authController.getUser);
router.get('/users', authenticate, requireRole('social_worker', 'director'), authController.getAllUsers);
router.get('/users/:userId/points', authenticate, requireSelfOrRole('social_worker', 'director'), authController.getPointsBalance);

export default router;
