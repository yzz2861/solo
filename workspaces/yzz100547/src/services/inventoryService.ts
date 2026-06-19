import { getDb } from '../database';
import { InventoryItem } from '../models/types';
import { AppError } from '../utils/errors';

export async function createInventoryItem(
  name: string,
  pointsCost: number,
  stockQuantity: number,
  description?: string,
  category?: string
): Promise<InventoryItem> {
  if (pointsCost <= 0) {
    throw new AppError('积分兑换价格必须大于0', 400);
  }
  if (stockQuantity < 0) {
    throw new AppError('库存数量不能为负', 400);
  }

  const db = await getDb();
  const now = new Date().toISOString();

  const result = await db.run(
    `INSERT INTO inventory_items (name, description, points_cost, stock_quantity, category, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    name,
    description || null,
    pointsCost,
    stockQuantity,
    category || null,
    now,
    now
  );

  const item = await db.get('SELECT * FROM inventory_items WHERE id = ?', result.lastID);
  return item as InventoryItem;
}

export async function getInventoryItemById(id: number): Promise<InventoryItem | null> {
  const db = await getDb();
  const item = await db.get('SELECT * FROM inventory_items WHERE id = ?', id);
  return item ? (item as InventoryItem) : null;
}

export async function listInventoryItems(
  page: number = 1,
  pageSize: number = 20,
  category?: string,
  includeOutOfStock: boolean = false
): Promise<{ items: InventoryItem[]; total: number }> {
  const db = await getDb();
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (!includeOutOfStock) {
    conditions.push('stock_quantity > 0');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const items = await db.all(
    `SELECT * FROM inventory_items ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    pageSize,
    offset
  );

  const totalResult = await db.get(
    `SELECT COUNT(*) as count FROM inventory_items ${whereClause}`,
    ...params
  );
  const total = totalResult?.count || 0;

  return { items: items as InventoryItem[], total };
}

export async function updateInventoryItem(
  id: number,
  updates: {
    name?: string;
    description?: string;
    points_cost?: number;
    stock_quantity?: number;
    category?: string;
  }
): Promise<InventoryItem> {
  const db = await getDb();
  const existing = await getInventoryItemById(id);

  if (!existing) {
    throw new AppError('库存商品不存在', 404);
  }

  if (updates.points_cost !== undefined && updates.points_cost <= 0) {
    throw new AppError('积分兑换价格必须大于0', 400);
  }
  if (updates.stock_quantity !== undefined && updates.stock_quantity < 0) {
    throw new AppError('库存数量不能为负', 400);
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.points_cost !== undefined) {
    fields.push('points_cost = ?');
    values.push(updates.points_cost);
  }
  if (updates.stock_quantity !== undefined) {
    fields.push('stock_quantity = ?');
    values.push(updates.stock_quantity);
  }
  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());

  values.push(id);

  await db.run(
    `UPDATE inventory_items SET ${fields.join(', ')} WHERE id = ?`,
    ...values
  );

  const updated = await getInventoryItemById(id);
  return updated!;
}

export async function deductStock(
  itemId: number,
  quantity: number
): Promise<InventoryItem> {
  if (quantity <= 0) {
    throw new AppError('扣减数量必须大于0', 400);
  }

  const db = await getDb();
  const item = await getInventoryItemById(itemId);

  if (!item) {
    throw new AppError('库存商品不存在', 404);
  }

  if (item.stock_quantity < quantity) {
    throw new AppError('库存不足', 400);
  }

  const newStock = item.stock_quantity - quantity;

  await db.run(
    'UPDATE inventory_items SET stock_quantity = ?, updated_at = ? WHERE id = ?',
    newStock,
    new Date().toISOString(),
    itemId
  );

  const updated = await getInventoryItemById(itemId);
  return updated!;
}

export async function restoreStock(
  itemId: number,
  quantity: number
): Promise<InventoryItem> {
  if (quantity <= 0) {
    throw new AppError('恢复库存数量必须大于0', 400);
  }

  const db = await getDb();
  const item = await getInventoryItemById(itemId);

  if (!item) {
    throw new AppError('库存商品不存在', 404);
  }

  const newStock = item.stock_quantity + quantity;

  await db.run(
    'UPDATE inventory_items SET stock_quantity = ?, updated_at = ? WHERE id = ?',
    newStock,
    new Date().toISOString(),
    itemId
  );

  const updated = await getInventoryItemById(itemId);
  return updated!;
}

export async function checkStock(itemId: number, quantity: number): Promise<{ available: boolean; currentStock: number; required: number }> {
  const item = await getInventoryItemById(itemId);

  if (!item) {
    throw new AppError('库存商品不存在', 404);
  }

  return {
    available: item.stock_quantity >= quantity,
    currentStock: item.stock_quantity,
    required: quantity,
  };
}
