import { Router, Request, Response } from 'express';
import { getAnomalyOverview, getBuildingAnomalyDetail } from '../services/anomaly';

const router = Router();

router.get('/overview', (req: Request, res: Response) => {
  const excludeHoliday = req.query.excludeHoliday !== 'false';
  res.json(getAnomalyOverview(excludeHoliday));
});

router.get('/building/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const detail = getBuildingAnomalyDetail(id);
  if (!detail) return res.status(404).json({ error: '楼栋不存在' });
  res.json(detail);
});

export default router;
