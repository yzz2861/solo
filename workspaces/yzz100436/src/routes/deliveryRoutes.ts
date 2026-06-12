import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { DeliveryService } from '../services/DeliveryService';
import { ApiResponse } from '../types/api';

const router = Router();

router.post('/deliveries', asyncHandler(async (req: Request, res: Response) => {
  const delivery = await DeliveryService.recordDelivery(req.body);
  const response: ApiResponse = {
    success: true,
    data: delivery,
    message: '到货记录创建成功'
  };
  res.json(response);
}));

router.get('/cutoffs/:cutoffId/deliveries', asyncHandler(async (req: Request, res: Response) => {
  const deliveries = await DeliveryService.getDeliveriesByCutoff(req.params.cutoffId);
  const response: ApiResponse = {
    success: true,
    data: deliveries
  };
  res.json(response);
}));

router.get('/cutoffs/:cutoffId/shortages', asyncHandler(async (req: Request, res: Response) => {
  const shortages = await DeliveryService.getShortageItems(req.params.cutoffId);
  const response: ApiResponse = {
    success: true,
    data: shortages
  };
  res.json(response);
}));

export { router as deliveryRoutes };
