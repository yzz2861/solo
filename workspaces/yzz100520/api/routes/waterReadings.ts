import { Router, Request, Response } from 'express';
import Papa from 'papaparse';
import type { WaterReading } from '../../shared/types';
import { addWaterReadings, getWaterReadings, getBuildings } from '../data/store';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string, 10) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  res.json(getWaterReadings(buildingId, startDate, endDate));
});

router.post('/import', (req: Request, res: Response) => {
  const { csv, type } = req.body;
  if (!csv) return res.status(400).json({ error: '缺少数据内容' });

  const buildings = getBuildings();
  const buildingMap = new Map(buildings.map(b => [b.code, b.id]));

  const parseResult = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const readings: Omit<WaterReading, 'id' | 'createdAt'>[] = [];
  const errors: string[] = [];

  let prevReading: Record<string, number> = {};
  const sorted = parseResult.data.sort((a, b) =>
    (a['日期'] || a['date'] || '').localeCompare(b['日期'] || b['date'] || '') ||
    (a['时段'] || a['period'] || '').localeCompare(b['时段'] || b['period'] || ''),
  );

  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i];
    const code = row['楼栋编号'] || row['buildingCode'] || '';
    const date = row['日期'] || row['readingDate'] || '';
    const periodRaw = (row['时段'] || row['period'] || 'night').toString().toLowerCase();
    const period = periodRaw.startsWith('日') || periodRaw === 'day' ? 'day' : 'night';
    const readingStr = row['读数'] || row['reading'] || '';
    const isMeterChange = (row['换表'] || row['meterChange'] || '').toString() === '1';

    const buildingId = buildingMap.get(code);
    if (!buildingId) {
      errors.push(`第${i + 1}行：楼栋编号 ${code} 不存在`);
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`第${i + 1}行：日期格式错误 ${date}，应为 YYYY-MM-DD`);
      continue;
    }
    const reading = parseFloat(readingStr);
    if (isNaN(reading) || reading < 0) {
      errors.push(`第${i + 1}行：读数值错误 ${readingStr}`);
      continue;
    }

    const key = `${buildingId}`;
    const last = prevReading[key];
    let consumption = last != null ? reading - last : 0;
    if (isMeterChange) consumption = 0;
    const isReversed = !isMeterChange && last != null && reading < last;

    readings.push({
      buildingId,
      readingDate: date,
      period,
      reading,
      consumption: Math.max(0, consumption),
      isMeterChange,
      isReversed,
    });
    prevReading[key] = reading;
  }

  if (type === 'preview') {
    return res.json({ count: readings.length, errors, preview: readings.slice(0, 10) });
  }

  const created = addWaterReadings(readings);
  res.json({ imported: created.length, errors });
});

export default router;
