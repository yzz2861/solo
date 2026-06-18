import { Router, Request, Response } from 'express';
import { addBuilding, getBuildingById, getBuildings, updateBuilding } from '../data/store';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json(getBuildings());
});

router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const b = getBuildingById(id);
  if (!b) return res.status(404).json({ error: '楼栋不存在' });
  res.json(b);
});

router.post('/', (req: Request, res: Response) => {
  const { code, name, meterCode, totalRooms, floors } = req.body;
  if (!code || !name) return res.status(400).json({ error: '编号和名称为必填项' });
  const created = addBuilding({ code, name, meterCode: meterCode || '', totalRooms: totalRooms || 0, floors: floors || 0 });
  res.status(201).json(created);
});

router.put('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updated = updateBuilding(id, req.body);
  if (!updated) return res.status(404).json({ error: '楼栋不存在' });
  res.json(updated);
});

export default router;
