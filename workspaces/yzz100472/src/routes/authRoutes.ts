import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { login, getCurrentUser } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', asyncHandler(login));
router.get('/me', authenticate, asyncHandler(getCurrentUser));

export default router;
