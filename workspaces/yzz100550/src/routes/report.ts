import { Router } from 'express';
import dayjs = require('dayjs');
import { ReportService } from '../services/ReportService';
import { success, handleError } from '../utils/response';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
const reportService = new ReportService();

router.use(authMiddleware);
router.use(requireRole('admin', 'night_shift'));

router.get('/monthly', async (req: AuthRequest, res) => {
  try {
    const user = req.currentUser!;
    const year = parseInt(req.query.year as string) || dayjs().year();
    const month = parseInt(req.query.month as string) || dayjs().month() + 1;
    const tenantId =
      user.role === 'admin' ? (req.query.tenantId as string) : user.tenantId;
    success(res, await reportService.getMonthlyStats(year, month, tenantId));
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/overtime', async (req: AuthRequest, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;
    success(res, await reportService.getOvertimeRecords(from, to));
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/rejected', async (req: AuthRequest, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;
    success(res, await reportService.getRejectedRecords(from, to));
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/export', async (req: AuthRequest, res) => {
  try {
    const type = (req.query.type as 'all' | 'overtime' | 'rejected') || 'all';
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;

    const csv = await reportService.exportCsv(type, year, month);
    const filename = `visitor-wifi-${type}-${year || dayjs().year()}-${String(month || dayjs().month() + 1).padStart(2, '0')}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    handleError(res, err);
  }
});

export const reportRoutes = router;
