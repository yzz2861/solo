import { Request, Response } from 'express';
import {
  queryTransactions,
  getTransactionById,
  reviewTransaction,
  getPendingReviewTransactions,
  getTransactionsForPublicList,
  awardPoints,
  freezePoints,
  refundPoints,
} from '../services/pointsService';
import { asyncHandler } from '../utils/errors';
import { ApiResponse, TransactionQuery, ReviewTransactionRequest } from '../models/types';
import { maskPhone } from '../utils/phone';

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const query: TransactionQuery = {
    userId: req.query.userId ? parseInt(req.query.userId as string, 10) : undefined,
    type: req.query.type as TransactionQuery['type'],
    status: req.query.status as TransactionQuery['status'],
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    page: parseInt(req.query.page as string, 10) || 1,
    pageSize: parseInt(req.query.pageSize as string, 10) || 20,
  };

  if (req.user?.role === 'resident') {
    query.userId = req.user.userId;
  }

  const result = await queryTransactions(query);

  res.json({
    success: true,
    data: result,
  } as ApiResponse);
});

export const getMyTransactions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: '未认证' } as ApiResponse);
    return;
  }

  const query: TransactionQuery = {
    userId: req.user.userId,
    type: req.query.type as TransactionQuery['type'],
    status: req.query.status as TransactionQuery['status'],
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    page: parseInt(req.query.page as string, 10) || 1,
    pageSize: parseInt(req.query.pageSize as string, 10) || 20,
  };

  const result = await queryTransactions(query);

  res.json({
    success: true,
    data: result,
  } as ApiResponse);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const transaction = await getTransactionById(id);

  if (!transaction) {
    res.status(404).json({ success: false, error: '交易记录不存在' } as ApiResponse);
    return;
  }

  if (req.user?.role === 'resident' && transaction.user_id !== req.user.userId) {
    res.status(403).json({ success: false, error: '无权查看他人交易记录' } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    data: { transaction },
  } as ApiResponse);
});

export const review = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { status, note } = req.body as ReviewTransactionRequest;
  const reviewerId = req.user!.userId;

  if (!status || !['approved', 'rejected'].includes(status)) {
    res.status(400).json({ success: false, error: '无效的复核状态' } as ApiResponse);
    return;
  }

  const transaction = await reviewTransaction(id, reviewerId, status, note);

  res.json({
    success: true,
    message: `复核${status === 'approved' ? '通过' : '拒绝'}`,
    data: { transaction },
  } as ApiResponse);
});

export const getPendingReviews = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 20;

  const result = await getPendingReviewTransactions(page, pageSize);

  res.json({
    success: true,
    data: result,
  } as ApiResponse);
});

export const getPublicList = asyncHandler(async (req: Request, res: Response) => {
  const query: TransactionQuery = {
    type: req.query.type as TransactionQuery['type'],
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    page: parseInt(req.query.page as string, 10) || 1,
    pageSize: parseInt(req.query.pageSize as string, 10) || 20,
  };

  const result = await getTransactionsForPublicList(query);

  const maskedItems = result.items.map(item => ({
    ...item,
    user_phone: maskPhone(item.user_phone),
  }));

  res.json({
    success: true,
    data: {
      ...result,
      items: maskedItems,
    },
  } as ApiResponse);
});

export const manualAward = asyncHandler(async (req: Request, res: Response) => {
  const { user_id, amount, description, idempotency_key } = req.body;
  const operatorId = req.user!.userId;

  if (!user_id || !amount) {
    res.status(400).json({ success: false, error: '缺少必填字段' } as ApiResponse);
    return;
  }

  const transaction = await awardPoints(
    user_id,
    amount,
    description || '手动发放积分',
    'award',
    idempotency_key,
    operatorId
  );

  const needsReview = transaction.review_status === 'pending';

  res.status(201).json({
    success: true,
    message: needsReview ? '积分发放申请已提交，等待复核' : '积分发放成功',
    data: { transaction, needsReview },
  } as ApiResponse);
});

export const manualFreeze = asyncHandler(async (req: Request, res: Response) => {
  const { user_id, amount, description, idempotency_key } = req.body;

  if (!user_id || !amount) {
    res.status(400).json({ success: false, error: '缺少必填字段' } as ApiResponse);
    return;
  }

  const transaction = await freezePoints(
    user_id,
    amount,
    description || '手动冻结积分',
    idempotency_key
  );

  res.status(201).json({
    success: true,
    message: '积分冻结成功',
    data: { transaction },
  } as ApiResponse);
});

export const manualRefund = asyncHandler(async (req: Request, res: Response) => {
  const { user_id, amount, description, related_transaction_id, idempotency_key } = req.body;

  if (!user_id || !amount) {
    res.status(400).json({ success: false, error: '缺少必填字段' } as ApiResponse);
    return;
  }

  const transaction = await refundPoints(
    user_id,
    amount,
    description || '手动退还积分',
    related_transaction_id,
    idempotency_key
  );

  res.status(201).json({
    success: true,
    message: '积分退还成功',
    data: { transaction },
  } as ApiResponse);
});
