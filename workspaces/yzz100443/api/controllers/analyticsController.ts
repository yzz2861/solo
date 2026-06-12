import { Request, Response } from 'express';
import {
  getFraudTypeStats,
  getAgeGroupStats,
  getTrendStats,
  getOverviewStats,
  exportDataToCsv,
  getMostVulnerableCases,
} from '../services/analyticsService.js';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));

export async function fraudTypes(req: Request, res: Response) {
  try {
    const stats = await getFraudTypeStats();
    res.json(stats);
  } catch (err) {
    console.error('Fraud type stats error:', err);
    res.status(500).json({ error: '获取诈骗类型统计失败' });
  }
}

export async function ageGroups(req: Request, res: Response) {
  try {
    const stats = await getAgeGroupStats();
    res.json(stats);
  } catch (err) {
    console.error('Age group stats error:', err);
    res.status(500).json({ error: '获取年龄段分析失败' });
  }
}

export async function trend(req: Request, res: Response) {
  try {
    const days = parseInt(req.query.days as string, 10) || 30;
    const stats = await getTrendStats(days);
    res.json(stats);
  } catch (err) {
    console.error('Trend stats error:', err);
    res.status(500).json({ error: '获取趋势数据失败' });
  }
}

export async function overview(req: Request, res: Response) {
  try {
    const stats = await getOverviewStats();
    res.json(stats);
  } catch (err) {
    console.error('Overview stats error:', err);
    res.status(500).json({ error: '获取概览数据失败' });
  }
}

export async function vulnerableCases(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const cases = await getMostVulnerableCases(limit);
    res.json(cases);
  } catch (err) {
    console.error('Vulnerable cases error:', err);
    res.status(500).json({ error: '获取易中招案例失败' });
  }
}

export async function exportCsv(req: Request, res: Response) {
  try {
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `防诈骗培训数据_${timestamp}.csv`;
    const filePath = join(__dirname, '../../../data', fileName);

    await exportDataToCsv(filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: '下载文件失败' });
      }
    });
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: '导出数据失败' });
  }
}
