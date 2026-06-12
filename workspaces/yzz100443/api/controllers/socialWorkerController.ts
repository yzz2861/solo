import { Request, Response } from 'express';
import {
  getAllElderly,
  toggleFocusElderly,
  getElderlyStats,
  getElderlyById,
} from '../services/elderlyService.js';
import {
  addFollowUpRecord,
  getElderlyFollowUpRecords,
} from '../services/socialWorkerService.js';
import type { ElderlyWithStats } from '../../shared/types.js';

export async function listElderly(req: Request, res: Response) {
  try {
    const elderlyList = await getAllElderly();
    
    const result: ElderlyWithStats[] = await Promise.all(
      elderlyList.map(async (elderly) => {
        const stats = await getElderlyStats(elderly.id);
        return {
          ...elderly,
          totalGames: stats.totalGames,
          correctRate: stats.correctRate,
          lastPlayTime: stats.lastPlayTime,
          weakFraudTypes: stats.weakFraudTypes as any[],
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error('List elderly error:', err);
    res.status(500).json({ error: '获取老人列表失败' });
  }
}

export async function toggleFocus(req: Request, res: Response) {
  try {
    const elderlyId = parseInt(req.params.id, 10);
    const elderly = await getElderlyById(elderlyId);

    if (!elderly) {
      return res.status(404).json({ error: '老人不存在' });
    }

    await toggleFocusElderly(elderlyId);
    const updated = await getElderlyById(elderlyId);

    res.json(updated);
  } catch (err) {
    console.error('Toggle focus error:', err);
    res.status(500).json({ error: '操作失败' });
  }
}

export async function getElderlyDetail(req: Request, res: Response) {
  try {
    const elderlyId = parseInt(req.params.id, 10);
    const elderly = await getElderlyById(elderlyId);

    if (!elderly) {
      return res.status(404).json({ error: '老人不存在' });
    }

    const stats = await getElderlyStats(elderlyId);
    const followUps = await getElderlyFollowUpRecords(elderlyId);

    res.json({
      elderly,
      stats,
      followUps,
    });
  } catch (err) {
    console.error('Get elderly detail error:', err);
    res.status(500).json({ error: '获取详情失败' });
  }
}

export async function addFollowUp(req: Request, res: Response) {
  try {
    const admin = req.admin!;
    const elderlyId = parseInt(req.params.id, 10);
    const { notes } = req.body;

    if (!notes || !notes.trim()) {
      return res.status(400).json({ error: '请填写跟进内容' });
    }

    const elderly = await getElderlyById(elderlyId);
    if (!elderly) {
      return res.status(404).json({ error: '老人不存在' });
    }

    const record = await addFollowUpRecord(
      elderlyId,
      admin.id,
      admin.name,
      notes.trim()
    );

    res.status(201).json(record);
  } catch (err) {
    console.error('Add follow-up error:', err);
    res.status(500).json({ error: '添加跟进记录失败' });
  }
}

export async function getFollowUps(req: Request, res: Response) {
  try {
    const elderlyId = parseInt(req.params.id, 10);
    const records = await getElderlyFollowUpRecords(elderlyId);
    res.json(records);
  } catch (err) {
    console.error('Get follow-ups error:', err);
    res.status(500).json({ error: '获取跟进记录失败' });
  }
}
