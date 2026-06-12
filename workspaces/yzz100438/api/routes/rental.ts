import { Router, type Request, type Response } from 'express';
import {
  listEquipment,
  getEquipment,
  listRentals,
  getRental,
  listActiveRentals,
  createRental,
  returnRentalItem,
  setCleaningStatus,
  listPendingCleaning,
  listClaims,
  resolveClaim,
  getStats,
  depositReport,
  claimReport,
  availabilityReport,
} from '../services/store.js';

const router = Router();

router.get('/stats', (_req: Request, res: Response) => {
  res.json({ success: true, data: getStats() });
});

router.get('/equipment', (req: Request, res: Response) => {
  const { status, category } = req.query as { status?: string; category?: string };
  res.json({ success: true, data: listEquipment({ status, category }) });
});

router.get('/equipment/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const eq = getEquipment(id);
  if (!eq) return res.status(404).json({ success: false, error: '装备不存在' });
  res.json({ success: true, data: eq });
});

router.get('/rentals', (req: Request, res: Response) => {
  const { status } = req.query as { status?: string };
  res.json({ success: true, data: listRentals({ status }) });
});

router.get('/rentals/active', (_req: Request, res: Response) => {
  res.json({ success: true, data: listActiveRentals() });
});

router.get('/rentals/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const r = getRental(id);
  if (!r) return res.status(404).json({ success: false, error: '租单不存在' });
  res.json({ success: true, data: r });
});

router.post('/rentals', (req: Request, res: Response) => {
  try {
    const data = createRental(req.body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.post('/rentals/items/:id/return', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = returnRentalItem(id, req.body);
    if (result.alreadyReturned) {
      return res.status(409).json({
        success: false,
        error: '该装备已归还，请勿重复操作',
        data: result,
      });
    }
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.put('/rentals/items/:id/cleaning', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body as { status: 'in_progress' | 'done' };
    const data = setCleaningStatus(id, status);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.get('/cleaning/pending', (_req: Request, res: Response) => {
  res.json({ success: true, data: listPendingCleaning() });
});

router.get('/claims', (req: Request, res: Response) => {
  const { status } = req.query as { status?: string };
  res.json({ success: true, data: listClaims({ status }) });
});

router.put('/claims/:id/resolve', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { decision, approver } = req.body as {
      decision: 'approved' | 'rejected';
      approver: string;
    };
    const data = resolveClaim(id, decision, approver || '店长');
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.get('/reports/deposit', (req: Request, res: Response) => {
  const { start, end } = req.query as { start?: string; end?: string };
  const today = new Date().toISOString().slice(0, 10);
  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  res.json({ success: true, data: depositReport(start || thirtyAgo, end || today) });
});

router.get('/reports/claims', (req: Request, res: Response) => {
  const { status } = req.query as { status?: string };
  res.json({ success: true, data: claimReport(status) });
});

router.get('/reports/availability', (req: Request, res: Response) => {
  const { start } = req.query as { start?: string };
  const today = new Date().toISOString().slice(0, 10);
  res.json({ success: true, data: availabilityReport(start || today) });
});

export default router;
