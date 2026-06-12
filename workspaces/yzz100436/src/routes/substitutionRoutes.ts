import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { SubstitutionService } from '../services/SubstitutionService';
import { ApiResponse } from '../types/api';

const router = Router();

router.post('/substitutions', asyncHandler(async (req: Request, res: Response) => {
  const substitution = await SubstitutionService.createSubstitution(req.body);
  const response: ApiResponse = {
    success: true,
    data: substitution,
    message: '替换方案创建成功'
  };
  res.json(response);
}));

router.post('/substitutions/:substitutionId/approve', asyncHandler(async (req: Request, res: Response) => {
  const substitution = await SubstitutionService.approveSubstitution(
    req.params.substitutionId,
    req.body
  );
  const response: ApiResponse = {
    success: true,
    data: substitution,
    message: '团长审批通过'
  };
  res.json(response);
}));

router.post('/substitutions/:substitutionId/customer-response', asyncHandler(async (req: Request, res: Response) => {
  const substitution = await SubstitutionService.customerResponse(
    req.params.substitutionId,
    req.body
  );
  const response: ApiResponse = {
    success: true,
    data: substitution,
    message: req.body.response === 'accepted' ? '用户已接受替换' : '用户已拒绝替换'
  };
  res.json(response);
}));

router.get('/substitutions/:substitutionId', asyncHandler(async (req: Request, res: Response) => {
  const substitution = await SubstitutionService.getSubstitutionDetail(req.params.substitutionId);
  if (!substitution) {
    res.status(404).json({ success: false, error: '替换方案不存在' });
    return;
  }
  const response: ApiResponse = {
    success: true,
    data: substitution
  };
  res.json(response);
}));

router.get('/cutoffs/:cutoffId/substitutions', asyncHandler(async (req: Request, res: Response) => {
  const substitutions = await SubstitutionService.getSubstitutionsByCutoff(req.params.cutoffId);
  const response: ApiResponse = {
    success: true,
    data: substitutions
  };
  res.json(response);
}));

router.get('/cutoffs/:cutoffId/substitutions/accepted', asyncHandler(async (req: Request, res: Response) => {
  const substitutions = await SubstitutionService.getAcceptedSubstitutions(req.params.cutoffId);
  const response: ApiResponse = {
    success: true,
    data: substitutions
  };
  res.json(response);
}));

export { router as substitutionRoutes };
