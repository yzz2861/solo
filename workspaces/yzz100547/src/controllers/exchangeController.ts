import { Request, Response } from 'express';
import {
  createExchangeOrder,
  getExchangeOrderById,
  getUserExchangeOrders,
  listExchangeOrders,
  reviewExchangeOrder,
  cancelExchangeOrder,
  getPendingReviewOrders,
  getOrdersForPublicList,
} from '../services/exchangeService';
import { asyncHandler } from '../utils/errors';
import { ApiResponse, ExchangeRequest, ReviewOrderRequest } from '../models/types';
import { maskPhone } from '../utils/phone';
import { idempotencyMiddleware } from '../middleware/idempotency';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { inventory_item_id, quantity, idempotency_key } = req.body as ExchangeRequest;
  const userId = req.user!.userId;

  if (!inventory_item_id || !quantity) {
    res.status(400).json({ success: false, error: '缺少必填字段' } as ApiResponse);
    return;
  }

  const { order, needsReview } = await createExchangeOrder(
    userId,
    inventory_item_id,
    quantity,
    idempotency_key
  );

  res.status(201).json({
    success: true,
    message: needsReview
      ? '兑换申请已提交，等待社工复核'
      : '兑换成功',
    data: { order, needsReview },
  } as ApiResponse);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const order = await getExchangeOrderById(id);

  if (!order) {
    res.status(404).json({ success: false, error: '兑换订单不存在' } as ApiResponse);
    return;
  }

  if (req.user?.role === 'resident' && order.user_id !== req.user.userId) {
    res.status(403).json({ success: false, error: '无权查看他人订单' } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    data: { order },
  } as ApiResponse);
});

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: '未认证' } as ApiResponse);
    return;
  }

  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 20;

  const { orders, total } = await getUserExchangeOrders(req.user.userId, page, pageSize);

  res.json({
    success: true,
    data: {
      orders,
      total,
      page,
      pageSize,
    },
  } as ApiResponse);
});

export const getUserOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 20;

  const { orders, total } = await getUserExchangeOrders(userId, page, pageSize);

  res.json({
    success: true,
    data: {
      orders,
      total,
      page,
      pageSize,
    },
  } as ApiResponse);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 20;
  const status = req.query.status as any;

  const { orders, total } = await listExchangeOrders(page, pageSize, status);

  res.json({
    success: true,
    data: {
      orders,
      total,
      page,
      pageSize,
    },
  } as ApiResponse);
});

export const review = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { status, note } = req.body as ReviewOrderRequest;
  const reviewerId = req.user!.userId;

  if (!status || !['approved', 'rejected'].includes(status)) {
    res.status(400).json({ success: false, error: '无效的复核状态' } as ApiResponse);
    return;
  }

  const order = await reviewExchangeOrder(id, reviewerId, status, note);

  res.json({
    success: true,
    message: `复核${status === 'approved' ? '通过' : '拒绝'}`,
    data: { order },
  } as ApiResponse);
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const userId = req.user!.userId;

  const order = await cancelExchangeOrder(id, userId);

  res.json({
    success: true,
    message: '订单已取消',
    data: { order },
  } as ApiResponse);
});

export const getPendingReviews = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 20;

  const { orders, total } = await getPendingReviewOrders(page, pageSize);

  res.json({
    success: true,
    data: {
      orders,
      total,
      page,
      pageSize,
    },
  } as ApiResponse);
});

export const getPublicList = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 20;

  const result = await getOrdersForPublicList(page, pageSize);

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
