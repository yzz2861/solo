import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { OrderService } from '../services/OrderService';
import { ApiResponse } from '../types/api';

const router = Router();

router.post('/orders', asyncHandler(async (req: Request, res: Response) => {
  const order = await OrderService.createOrder(req.body);
  const response: ApiResponse = {
    success: true,
    data: order,
    message: '订单创建成功'
  };
  res.json(response);
}));

router.put('/orders/:orderId/items/:itemId', asyncHandler(async (req: Request, res: Response) => {
  const userRole = req.headers['x-user-role'] as string || 'customer';
  const orderItem = await OrderService.updateOrderItem(
    req.params.orderId,
    req.params.itemId,
    req.body,
    userRole
  );
  const response: ApiResponse = {
    success: true,
    data: orderItem,
    message: '订单项更新成功'
  };
  res.json(response);
}));

router.get('/orders/:orderId', asyncHandler(async (req: Request, res: Response) => {
  const order = await OrderService.getOrderDetail(req.params.orderId);
  if (!order) {
    res.status(404).json({ success: false, error: '订单不存在' });
    return;
  }
  const response: ApiResponse = {
    success: true,
    data: order
  };
  res.json(response);
}));

router.get('/cutoffs/:cutoffId/orders', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const result = await OrderService.getOrdersByCutoff(req.params.cutoffId, { page, pageSize });
  const response: ApiResponse = {
    success: true,
    data: result
  };
  res.json(response);
}));

router.get('/cutoffs/:cutoffId/communities/:communityId/orders', asyncHandler(async (req: Request, res: Response) => {
  const orders = await OrderService.getOrdersByCommunity(req.params.cutoffId, req.params.communityId);
  const response: ApiResponse = {
    success: true,
    data: orders
  };
  res.json(response);
}));

export { router as orderRoutes };
