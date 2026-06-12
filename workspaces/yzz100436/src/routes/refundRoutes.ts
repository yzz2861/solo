import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { RefundService } from '../services/RefundService';
import { ApiResponse } from '../types/api';

const router = Router();

router.post('/refunds', asyncHandler(async (req: Request, res: Response) => {
  const refund = await RefundService.createRefund(req.body);
  const response: ApiResponse = {
    success: true,
    data: refund,
    message: '退款申请创建成功'
  };
  res.json(response);
}));

router.put('/refunds/:refundId', asyncHandler(async (req: Request, res: Response) => {
  const refund = await RefundService.processRefund(req.params.refundId, req.body);
  const response: ApiResponse = {
    success: true,
    data: refund,
    message: '退款状态更新成功'
  };
  res.json(response);
}));

router.get('/refunds/:refundId', asyncHandler(async (req: Request, res: Response) => {
  const refund = await RefundService.getRefundDetail(req.params.refundId);
  if (!refund) {
    res.status(404).json({ success: false, error: '退款记录不存在' });
    return;
  }
  const response: ApiResponse = {
    success: true,
    data: refund
  };
  res.json(response);
}));

router.get('/cutoffs/:cutoffId/refunds', asyncHandler(async (req: Request, res: Response) => {
  const refunds = await RefundService.getRefundsByCutoff(req.params.cutoffId);
  const response: ApiResponse = {
    success: true,
    data: refunds
  };
  res.json(response);
}));

router.get('/refunds/export', asyncHandler(async (req: Request, res: Response) => {
  const params = {
    cutoffId: req.query.cutoffId as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    status: req.query.status as string
  };
  const exportData = await RefundService.exportRefunds(params);
  const response: ApiResponse = {
    success: true,
    data: exportData
  };
  res.json(response);
}));

export { router as refundRoutes };
