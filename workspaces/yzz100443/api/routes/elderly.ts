import { Router } from 'express';
import { elderlyAuth } from '../middleware/auth.js';
import {
  login,
  getProgress,
  saveProgress,
  submitAnswer,
  getNextCaseForUser,
  getProfile,
} from '../controllers/elderlyController.js';

const router = Router();

router.post('/login', login);
router.get('/profile', elderlyAuth, getProfile);
router.get('/progress', elderlyAuth, getProgress);
router.post('/progress', elderlyAuth, saveProgress);
router.post('/answer', elderlyAuth, submitAnswer);
router.get('/next-case', elderlyAuth, getNextCaseForUser);

export default router;
