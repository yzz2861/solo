import { Router } from 'express';
import { adminAuth } from '../middleware/auth.js';
import {
  listElderly,
  toggleFocus,
  getElderlyDetail,
  addFollowUp,
  getFollowUps,
} from '../controllers/socialWorkerController.js';

const router = Router();

router.get('/elderly', adminAuth, listElderly);
router.get('/elderly/:id', adminAuth, getElderlyDetail);
router.post('/elderly/:id/focus', adminAuth, toggleFocus);
router.get('/elderly/:id/follow-ups', adminAuth, getFollowUps);
router.post('/elderly/:id/follow-ups', adminAuth, addFollowUp);

export default router;
