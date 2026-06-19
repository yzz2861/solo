import { Request, Response } from 'express';
import {
  createInventoryItem,
  getInventoryItemById,
  listInventoryItems,
  updateInventoryItem,
  deductStock,
  restoreStock,
  checkStock,
} from '../services/inventoryService';
import { asyncHandler } from '../utils/errors';
import { ApiResponse, CreateInventoryRequest, UpdateInventoryRequest } from '../models/types';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, points_cost, stock_quantity, category } = req.body as CreateInventoryRequest;

  if (!name || points_cost === undefined || stock_quantity === undefined) {
    res.status(400).json({ success: false, error: '缺少必填字段' } as ApiResponse);
    return;
  }

  const item = await createInventoryItem(name, points_cost, stock_quantity, description, category);

  res.status(201).json({
    success: true,
    message: '库存商品创建成功',
    data: { item },
  } as ApiResponse);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const item = await getInventoryItemById(id);

  if (!item) {
    res.status(404).json({ success: false, error: '库存商品不存在' } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    data: { item },
  } as ApiResponse);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 20;
  const category = req.query.category as string;
  const includeOutOfStock = req.query.includeOutOfStock === 'true';

  const { items, total } = await listInventoryItems(page, pageSize, category, includeOutOfStock);

  res.json({
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
    },
  } as ApiResponse);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updates = req.body as UpdateInventoryRequest;

  const item = await updateInventoryItem(id, updates);

  res.json({
    success: true,
    message: '库存商品更新成功',
    data: { item },
  } as ApiResponse);
});

export const deduct = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    res.status(400).json({ success: false, error: '扣减数量必须大于0' } as ApiResponse);
    return;
  }

  const item = await deductStock(id, quantity);

  res.json({
    success: true,
    message: '库存扣减成功',
    data: { item },
  } as ApiResponse);
});

export const restore = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    res.status(400).json({ success: false, error: '恢复数量必须大于0' } as ApiResponse);
    return;
  }

  const item = await restoreStock(id, quantity);

  res.json({
    success: true,
    message: '库存恢复成功',
    data: { item },
  } as ApiResponse);
});

export const check = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const quantity = parseInt(req.query.quantity as string, 10) || 1;

  const result = await checkStock(id, quantity);

  res.json({
    success: true,
    data: result,
  } as ApiResponse);
});
