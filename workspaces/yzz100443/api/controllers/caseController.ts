import { Request, Response } from 'express';
import {
  getAllCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
  reorderCases,
  getCaseStats,
} from '../services/caseService.js';
import type { Dialogue, Option, FraudType } from '../../shared/types.js';

export async function listCases(req: Request, res: Response) {
  try {
    const { includeInactive } = req.query;
    const cases = await getAllCases(includeInactive === 'true');
    res.json(cases);
  } catch (err) {
    console.error('List cases error:', err);
    res.status(500).json({ error: '获取案例列表失败' });
  }
}

export async function getCase(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const caseData = await getCaseById(id);

    if (!caseData) {
      return res.status(404).json({ error: '案例不存在' });
    }

    res.json(caseData);
  } catch (err) {
    console.error('Get case error:', err);
    res.status(500).json({ error: '获取案例失败' });
  }
}

export async function createCaseHandler(req: Request, res: Response) {
  try {
    const admin = req.admin!;
    const { title, fraudType, description, dialogues, options, warningPoints, difficulty } = req.body;

    if (!title || !fraudType || !dialogues || !options) {
      return res.status(400).json({ error: '请填写完整的案例信息' });
    }

    if (!Array.isArray(dialogues) || dialogues.length === 0) {
      return res.status(400).json({ error: '至少需要一段对话' });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: '至少需要两个选项' });
    }

    const hasCorrect = (options as Option[]).some(opt => opt.isCorrect);
    if (!hasCorrect) {
      return res.status(400).json({ error: '至少需要一个正确选项' });
    }

    const newCase = await createCase({
      title,
      fraudType: fraudType as FraudType,
      description: description || '',
      dialogues: dialogues as Dialogue[],
      options: options as Option[],
      warningPoints: warningPoints || [],
      difficulty: difficulty || 1,
      createdBy: admin.id,
    });

    res.status(201).json(newCase);
  } catch (err) {
    console.error('Create case error:', err);
    res.status(500).json({ error: '创建案例失败' });
  }
}

export async function updateCaseHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await getCaseById(id);

    if (!existing) {
      return res.status(404).json({ error: '案例不存在' });
    }

    const { title, fraudType, description, dialogues, options, warningPoints, difficulty, isActive } = req.body;

    const updated = await updateCase(id, {
      title,
      fraudType: fraudType as FraudType,
      description,
      dialogues,
      options,
      warningPoints,
      difficulty,
      isActive,
    });

    res.json(updated);
  } catch (err) {
    console.error('Update case error:', err);
    res.status(500).json({ error: '更新案例失败' });
  }
}

export async function deleteCaseHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await deleteCase(id);

    if (!deleted) {
      return res.status(404).json({ error: '案例不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('Delete case error:', err);
    res.status(500).json({ error: '删除案例失败' });
  }
}

export async function reorderCasesHandler(req: Request, res: Response) {
  try {
    const { caseIds } = req.body;

    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ error: '请提供案例ID列表' });
    }

    await reorderCases(caseIds);
    res.json({ success: true });
  } catch (err) {
    console.error('Reorder cases error:', err);
    res.status(500).json({ error: '排序失败' });
  }
}

export async function getStats(req: Request, res: Response) {
  try {
    const stats = await getCaseStats();
    res.json(stats);
  } catch (err) {
    console.error('Get case stats error:', err);
    res.status(500).json({ error: '获取统计失败' });
  }
}
