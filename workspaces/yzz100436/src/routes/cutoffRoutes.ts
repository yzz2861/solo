import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { CutoffService } from '../services/CutoffService';
import { ApiResponse } from '../types/api';

const router = Router();

router.post('/cutoffs', asyncHandler(async (req: Request, res: Response) => {
  const { name, cutoffTime, createdBy } = req.body;
  const cutoff = await CutoffService.createCutoff(name, new Date(cutoffTime), createdBy);
  const response: ApiResponse = {
    success: true,
    data: cutoff,
    message: '截单批次创建成功'
  };
  res.json(response);
}));

router.post('/cutoffs/:cutoffId/close', asyncHandler(async (req: Request, res: Response) => {
  const cutoff = await CutoffService.closeCutoff(req.params.cutoffId, req.body);
  const response: ApiResponse = {
    success: true,
    data: cutoff,
    message: '截单关闭成功'
  };
  res.json(response);
}));

router.get('/cutoffs/:cutoffId', asyncHandler(async (req: Request, res: Response) => {
  const cutoff = await CutoffService.getCutoffDetail(req.params.cutoffId);
  if (!cutoff) {
    res.status(404).json({ success: false, error: '截单批次不存在' });
    return;
  }
  const response: ApiResponse = {
    success: true,
    data: cutoff
  };
  res.json(response);
}));

router.get('/cutoffs', asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as any;
  const cutoffs = await CutoffService.getCutoffList(status);
  const response: ApiResponse = {
    success: true,
    data: cutoffs
  };
  res.json(response);
}));

router.get('/cutoffs/active/latest', asyncHandler(async (req: Request, res: Response) => {
  const cutoff = await CutoffService.getActiveCutoff();
  const response: ApiResponse = {
    success: true,
    data: cutoff
  };
  res.json(response);
}));

export { router as cutoffRoutes };
