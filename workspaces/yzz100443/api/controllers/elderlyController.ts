import { Request, Response } from 'express';
import {
  loginElderly,
  getElderlyById,
  getElderlyProgress,
  saveElderlyProgress,
  saveAnswerRecord,
} from '../services/elderlyService.js';
import { getNextCase } from '../services/caseService.js';
import { adjustDifficulty } from '../../shared/types.js';

export async function login(req: Request, res: Response) {
  try {
    const { name, phoneLast4, age, community } = req.body;

    if (!name || !phoneLast4) {
      return res.status(400).json({ error: '请填写姓名和手机号后四位' });
    }

    if (phoneLast4.length !== 4 || !/^\d{4}$/.test(phoneLast4)) {
      return res.status(400).json({ error: '请输入正确的手机号后四位' });
    }

    const elderly = await loginElderly(name.trim(), phoneLast4, age, community);
    const progress = await getElderlyProgress(elderly.id);

    res.json({
      elderly,
      progress,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
}

export async function getProgress(req: Request, res: Response) {
  try {
    const elderlyId = req.elderlyId!;
    const progress = await getElderlyProgress(elderlyId);

    if (!progress) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(progress);
  } catch (err) {
    console.error('Get progress error:', err);
    res.status(500).json({ error: '获取进度失败' });
  }
}

export async function saveProgress(req: Request, res: Response) {
  try {
    const elderlyId = req.elderlyId!;
    const { currentCaseId, currentDialogueIndex, consecutiveCorrect, currentDifficulty } = req.body;

    await saveElderlyProgress(elderlyId, {
      currentCaseId,
      currentDialogueIndex,
      consecutiveCorrect,
      currentDifficulty,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Save progress error:', err);
    res.status(500).json({ error: '保存进度失败' });
  }
}

export async function submitAnswer(req: Request, res: Response) {
  try {
    const elderlyId = req.elderlyId!;
    const { caseId, dialogueIndex, isCorrect, selectedOption, fraudType } = req.body;

    await saveAnswerRecord(
      elderlyId,
      caseId,
      dialogueIndex,
      isCorrect,
      selectedOption,
      fraudType
    );

    const progress = await getElderlyProgress(elderlyId);
    
    let newConsecutive = isCorrect ? (progress?.consecutiveCorrect || 0) + 1 : 0;
    let newDifficulty = adjustDifficulty(newConsecutive, progress?.currentDifficulty || 1);

    await saveElderlyProgress(elderlyId, {
      consecutiveCorrect: newConsecutive,
      currentDifficulty: newDifficulty,
    });

    const nextCase = await getNextCase(caseId, newDifficulty);

    res.json({
      success: true,
      newConsecutiveCorrect: newConsecutive,
      newDifficulty,
      nextCase: nextCase || null,
    });
  } catch (err) {
    console.error('Submit answer error:', err);
    res.status(500).json({ error: '提交答案失败' });
  }
}

export async function getNextCaseForUser(req: Request, res: Response) {
  try {
    const elderlyId = req.elderlyId!;
    const progress = await getElderlyProgress(elderlyId);

    if (!progress) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const nextCase = await getNextCase(progress.currentCaseId, progress.currentDifficulty);

    if (!nextCase) {
      return res.json({ case: null, message: '恭喜您完成了所有案例！' });
    }

    await saveElderlyProgress(elderlyId, {
      currentCaseId: nextCase.id,
      currentDialogueIndex: 0,
    });

    res.json({ case: nextCase });
  } catch (err) {
    console.error('Get next case error:', err);
    res.status(500).json({ error: '获取案例失败' });
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    const elderlyId = req.elderlyId!;
    const elderly = await getElderlyById(elderlyId);

    if (!elderly) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const progress = await getElderlyProgress(elderlyId);

    res.json({
      elderly,
      progress,
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
}
