import { Router } from 'express';
import { adminAuth } from '../middleware/auth.js';
import { login, getProfile } from '../controllers/adminController.js';

const router = Router();

router.post('/login', login);
router.get('/profile', adminAuth, getProfile);

export default router;
