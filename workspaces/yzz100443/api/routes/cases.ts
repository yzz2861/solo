import { Router } from 'express';
import { adminAuth, policeAuth } from '../middleware/auth.js';
import {
  listCases,
  getCase,
  createCaseHandler,
  updateCaseHandler,
  deleteCaseHandler,
  reorderCasesHandler,
  getStats,
} from '../controllers/caseController.js';

const router = Router();

router.get('/', adminAuth, listCases);
router.get('/stats', adminAuth, getStats);
router.get('/:id', adminAuth, getCase);
router.post('/', adminAuth, policeAuth, createCaseHandler);
router.put('/:id', adminAuth, policeAuth, updateCaseHandler);
router.delete('/:id', adminAuth, policeAuth, deleteCaseHandler);
router.post('/reorder', adminAuth, policeAuth, reorderCasesHandler);

export default router;
