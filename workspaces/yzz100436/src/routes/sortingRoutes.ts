import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { SortingService } from '../services/SortingService';
import { ApiResponse } from '../types/api';

const router = Router();

router.post('/sorting-lists', asyncHandler(async (req: Request, res: Response) => {
  const sortingList = await SortingService.createSortingList(req.body);
  const response: ApiResponse = {
    success: true,
    data: sortingList,
    message: '分拣单创建成功'
  };
  res.json(response);
}));

router.get('/sorting-lists/:sortingListId', asyncHandler(async (req: Request, res: Response) => {
  const sortingList = await SortingService.getSortingListDetail(req.params.sortingListId);
  if (!sortingList) {
    res.status(404).json({ success: false, error: '分拣单不存在' });
    return;
  }
  const response: ApiResponse = {
    success: true,
    data: sortingList
  };
  res.json(response);
}));

router.get('/cutoffs/:cutoffId/sorting-lists', asyncHandler(async (req: Request, res: Response) => {
  const sortingLists = await SortingService.getSortingListsByCutoff(req.params.cutoffId);
  const response: ApiResponse = {
    success: true,
    data: sortingLists
  };
  res.json(response);
}));

router.put('/sorting-bags/:bagId', asyncHandler(async (req: Request, res: Response) => {
  const bag = await SortingService.updateSortingBag(req.params.bagId, req.body);
  const response: ApiResponse = {
    success: true,
    data: bag,
    message: '分拣袋状态更新成功'
  };
  res.json(response);
}));

router.get('/sorting-bags/:bagId/label', asyncHandler(async (req: Request, res: Response) => {
  const label = await SortingService.getSortingBagLabel(req.params.bagId);
  const response: ApiResponse = {
    success: true,
    data: label
  };
  res.json(response);
}));

router.post('/sorting-lists/:sortingListId/complete', asyncHandler(async (req: Request, res: Response) => {
  const sortingList = await SortingService.completeSortingList(req.params.sortingListId);
  const response: ApiResponse = {
    success: true,
    data: sortingList,
    message: '分拣单已完成'
  };
  res.json(response);
}));

router.get('/cutoffs/:cutoffId/communities/:communityId/sorting-list', asyncHandler(async (req: Request, res: Response) => {
  const sortingList = await SortingService.getCommunitySortingList(
    req.params.cutoffId,
    req.params.communityId
  );
  const response: ApiResponse = {
    success: true,
    data: sortingList
  };
  res.json(response);
}));

export { router as sortingRoutes };
