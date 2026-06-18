import { Router, Request, Response } from 'express';
import Papa from 'papaparse';
import type { RepairRecord } from '../../shared/types';
import { addRepair, addRepairs, getRepairs, updateRepair, getBuildings } from '../data/store';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string, 10) : undefined;
  res.json(getRepairs(buildingId));
});

router.post('/', (req: Request, res: Response) => {
  const { buildingId, reportDate, repairDate, repairType, description, result, status } = req.body;
  if (!buildingId || !reportDate || !repairType) {
    return res.status(400).json({ error: '楼栋、报修日期、维修类型为必填项' });
  }
  const created = addRepair({
    buildingId,
    reportDate,
    repairDate: repairDate || null,
    repairType,
    description: description || '',
    result: result || null,
    recheckReading: null,
    recheckDate: null,
    recheckNote: null,
    status: status || 'pending',
  });
  res.status(201).json(created);
});

router.put('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updated = updateRepair(id, req.body);
  if (!updated) return res.status(404).json({ error: '记录不存在' });
  res.json(updated);
});

router.post('/import', (req: Request, res: Response) => {
  const { csv, type } = req.body;
  if (!csv) return res.status(400).json({ error: '缺少数据内容' });
  const buildings = getBuildings();
  const buildingMap = new Map(buildings.map(b => [b.code, b.id]));
  const parseResult = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const list: Omit<RepairRecord, 'id'>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const code = row['楼栋编号'] || row['buildingCode'] || '';
    const buildingId = buildingMap.get(code);
    if (!buildingId) {
      errors.push(`第${i + 1}行：楼栋编号 ${code} 不存在`);
      continue;
    }
    list.push({
      buildingId,
      reportDate: row['报修日期'] || row['reportDate'] || '',
      repairDate: row['维修日期'] || row['repairDate'] || null,
      repairType: row['维修类型'] || row['repairType'] || '其他',
      description: row['描述'] || row['description'] || '',
      result: row['结果'] || row['result'] || null,
      recheckReading: row['复测读数'] ? parseFloat(row['复测读数']) : null,
      recheckDate: row['复测日期'] || row['recheckDate'] || null,
      recheckNote: row['复测备注'] || row['recheckNote'] || null,
      status: (row['状态'] || row['status'] || 'completed') as RepairRecord['status'],
    });
  }

  if (type === 'preview') return res.json({ count: list.length, errors, preview: list.slice(0, 10) });
  const created = addRepairs(list);
  res.json({ imported: created.length, errors });
});

export default router;
