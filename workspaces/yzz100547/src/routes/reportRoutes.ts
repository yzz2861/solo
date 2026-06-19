import { Router } from 'express';
import { authenticate, requireRole, requireSelfOrRole } from '../middleware/auth';
import * as reportController from '../controllers/reportController';

const router = Router();

router.get('/ranking', reportController.getRanking);

router.use(authenticate);

router.get('/user-summary', requireSelfOrRole('social_worker', 'director'), reportController.getUserSummary);
router.get('/user-summary/:userId', requireSelfOrRole('social_worker', 'director'), reportController.getUserSummary);

router.get('/stock-summary', requireRole('director'), reportController.getStockSummary);
router.get('/reversal-summary', requireRole('director'), reportController.getReversalSummary);
router.get('/export/stock', requireRole('director'), reportController.exportStockCsv);
router.get('/export/reversals', requireRole('director'), reportController.exportReversalsCsv);
router.get('/export/ranking', requireRole('director'), reportController.exportRankingCsv);
router.get('/export/user/:userId/transactions', requireSelfOrRole('director'), reportController.exportUserTransactionsCsv);

export default router;
