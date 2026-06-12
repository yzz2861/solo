import { Router } from 'express';
import { adminAuth } from '../middleware/auth.js';
import {
  fraudTypes,
  ageGroups,
  trend,
  overview,
  vulnerableCases,
  exportCsv,
} from '../controllers/analyticsController.js';

const router = Router();

router.get('/overview', adminAuth, overview);
router.get('/fraud-types', adminAuth, fraudTypes);
router.get('/age-groups', adminAuth, ageGroups);
router.get('/trend', adminAuth, trend);
router.get('/vulnerable-cases', adminAuth, vulnerableCases);
router.get('/export', adminAuth, exportCsv);

export default router;
