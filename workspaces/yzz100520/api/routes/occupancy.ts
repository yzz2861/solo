import { Router, Request, Response } from 'express';
import Papa from 'papaparse';
import type { Occupancy } from '../../shared/types';
import { addOccupancies, getOccupancies, getBuildings } from '../data/store';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string, 10) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  res.json(getOccupancies(buildingId, startDate, endDate));
});

router.post('/import', (req: Request, res: Response) => {
  const { csv, type } = req.body;
  if (!csv) return res.status(400).json({ error: '缺少数据内容' });

  const buildings = getBuildings();
  const buildingMap = new Map(buildings.map(b => [b.code, b.id]));

  const parseResult = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const list: Omit<Occupancy, 'id'>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const code = row['楼栋编号'] || row['buildingCode'] || '';
    const date = row['日期'] || row['date'] || '';
    const occupiedRooms = parseInt(row['入住宿舍'] || row['occupiedRooms'] || '0', 10);
    const totalPeople = parseInt(row['入住人数'] || row['totalPeople'] || '0', 10);
    const isVacant = (row['空置'] || row['isVacant'] || '').toString() === '1';

    const buildingId = buildingMap.get(code);
    if (!buildingId) {
      errors.push(`第${i + 1}行：楼栋编号 ${code} 不存在`);
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`第${i + 1}行：日期格式错误`);
      continue;
    }
    list.push({ buildingId, date, occupiedRooms, totalPeople, isVacant });
  }

  if (type === 'preview') {
    return res.json({ count: list.length, errors, preview: list.slice(0, 10) });
  }
  const created = addOccupancies(list);
  res.json({ imported: created.length, errors });
});

export default router;
