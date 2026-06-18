import { Router, Request, Response } from 'express';
import Papa from 'papaparse';
import type { Holiday } from '../../shared/types';
import { addHoliday, addHolidays, deleteHoliday, getHolidays, getBuildings } from '../data/store';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json(getHolidays());
});

router.post('/', (req: Request, res: Response) => {
  const { name, startDate, endDate, buildingIds } = req.body;
  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: '名称和日期为必填项' });
  }
  const created = addHoliday({ name, startDate, endDate, buildingIds: buildingIds || [] });
  res.status(201).json(created);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (deleteHoliday(id)) res.json({ ok: true });
  else res.status(404).json({ error: '记录不存在' });
});

router.post('/import', (req: Request, res: Response) => {
  const { csv, type } = req.body;
  if (!csv) return res.status(400).json({ error: '缺少数据内容' });
  const buildings = getBuildings();
  const buildingMap = new Map(buildings.map(b => [b.code, b.id]));
  const parseResult = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const list: Omit<Holiday, 'id'>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const name = row['名称'] || row['name'] || '';
    const startDate = row['开始日期'] || row['startDate'] || '';
    const endDate = row['结束日期'] || row['endDate'] || '';
    const buildingCodes = (row['楼栋'] || row['buildingCodes'] || '').split(/[,，;；]/).filter(Boolean);
    const buildingIds = buildingCodes.length === 0
      ? []
      : buildingCodes.map(c => buildingMap.get(c.trim())!).filter(Boolean);

    if (!name || !startDate || !endDate) {
      errors.push(`第${i + 1}行：必填项缺失`);
      continue;
    }
    list.push({ name, startDate, endDate, buildingIds });
  }

  if (type === 'preview') return res.json({ count: list.length, errors, preview: list.slice(0, 10) });
  const created = addHolidays(list);
  res.json({ imported: created.length, errors });
});

export default router;
