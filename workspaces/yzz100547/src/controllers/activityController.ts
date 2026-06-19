import { Request, Response } from 'express';
import {
  createActivity,
  getActivityById,
  listActivities,
  addActivityParticipants,
  cancelActivity,
  getActivityParticipants,
} from '../services/activityService';
import { asyncHandler } from '../utils/errors';
import { ApiResponse } from '../models/types';
import { maskPhone } from '../utils/phone';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, points_per_person } = req.body;

  if (!name || points_per_person === undefined) {
    res.status(400).json({ success: false, error: '缺少必填字段' } as ApiResponse);
    return;
  }

  const activity = await createActivity(name, points_per_person, description);

  res.status(201).json({
    success: true,
    message: '活动创建成功',
    data: { activity },
  } as ApiResponse);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const activity = await getActivityById(id);

  if (!activity) {
    res.status(404).json({ success: false, error: '活动不存在' } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    data: { activity },
  } as ApiResponse);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 20;

  const { activities, total } = await listActivities(page, pageSize);

  res.json({
    success: true,
    data: {
      activities,
      total,
      page,
      pageSize,
    },
  } as ApiResponse);
});

export const addParticipants = asyncHandler(async (req: Request, res: Response) => {
  const activityId = parseInt(req.params.id, 10);
  const { user_ids } = req.body;
  const operatorId = req.user!.userId;

  if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
    res.status(400).json({ success: false, error: '缺少用户ID列表' } as ApiResponse);
    return;
  }

  const { participants, transactions } = await addActivityParticipants(
    activityId,
    user_ids,
    operatorId
  );

  res.status(201).json({
    success: true,
    message: `成功为 ${participants.length} 位用户发放积分`,
    data: { participants, transactions },
  } as ApiResponse);
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const activityId = parseInt(req.params.id, 10);
  const operatorId = req.user!.userId;

  const { activity, revokedTransactions } = await cancelActivity(activityId, operatorId);

  res.json({
    success: true,
    message: `活动已取消，已回退 ${revokedTransactions.length} 笔积分`,
    data: { activity, revokedTransactions },
  } as ApiResponse);
});

export const getParticipants = asyncHandler(async (req: Request, res: Response) => {
  const activityId = parseInt(req.params.id, 10);
  const participants = await getActivityParticipants(activityId);

  res.json({
    success: true,
    data: { participants },
  } as ApiResponse);
});
