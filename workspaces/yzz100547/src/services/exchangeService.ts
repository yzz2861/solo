import { getDb } from '../database';
import { ExchangeOrder, OrderStatus, ReviewStatus } from '../models/types';
import { AppError } from '../utils/errors';
import { checkStock, deductStock, restoreStock, getInventoryItemById } from './inventoryService';
import { exchangePoints, refundPoints, reviewTransaction, getTransactionById } from './pointsService';
import { getUserPoints } from './userService';
import config from '../config';

export async function createExchangeOrder(
  userId: number,
  inventoryItemId: number,
  quantity: number,
  idempotencyKey?: string
): Promise<{ order: ExchangeOrder; needsReview: boolean }> {
  if (quantity <= 0) {
    throw new AppError('兑换数量必须大于0', 400);
  }

  const db = await getDb();

  if (idempotencyKey) {
    const existing = await db.get(
      'SELECT * FROM exchange_orders WHERE idempotency_key = ?',
      idempotencyKey
    );
    if (existing) {
      const order = existing as ExchangeOrder;
      const needsReview = order.status === 'pending' && order.reviewed_at === undefined;
      return { order, needsReview };
    }
  }

  const stockCheck = await checkStock(inventoryItemId, quantity);
  if (!stockCheck.available) {
    throw new AppError(`库存不足，当前库存: ${stockCheck.currentStock}，需要: ${stockCheck.required}`, 400);
  }

  const item = await getInventoryItemById(inventoryItemId);
  if (!item) {
    throw new AppError('商品不存在', 404);
  }

  const totalPoints = item.points_cost * quantity;

  const userPoints = await getUserPoints(userId);
  if (userPoints < totalPoints) {
    throw new AppError('积分不足', 400);
  }

  const needsReview = totalPoints >= config.reviewThresholdPoints;

  if (!needsReview) {
    await deductStock(inventoryItemId, quantity);
  }

  const orderResult = await db.run(
    `INSERT INTO exchange_orders
     (user_id, inventory_item_id, quantity, total_points, status, idempotency_key)
     VALUES (?, ?, ?, ?, ?, ?)`,
    userId,
    inventoryItemId,
    quantity,
    totalPoints,
    needsReview ? 'pending' : 'completed',
    idempotencyKey || null
  );

  const orderId = orderResult.lastID as number;

  const description = `兑换: ${item.name} x ${quantity}`;

  await exchangePoints(
    userId,
    totalPoints,
    description,
    orderId,
    idempotencyKey,
    needsReview
  );

  const order = await db.get('SELECT * FROM exchange_orders WHERE id = ?', orderId);

  return { order: order as ExchangeOrder, needsReview };
}

export async function getExchangeOrderById(id: number): Promise<ExchangeOrder | null> {
  const db = await getDb();
  const order = await db.get('SELECT * FROM exchange_orders WHERE id = ?', id);
  return order ? (order as ExchangeOrder) : null;
}

export async function getUserExchangeOrders(
  userId: number,
  page: number = 1,
  pageSize: number = 20
): Promise<{ orders: ExchangeOrder[]; total: number }> {
  const db = await getDb();
  const offset = (page - 1) * pageSize;

  const orders = await db.all(
    'SELECT * FROM exchange_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    userId,
    pageSize,
    offset
  );

  const totalResult = await db.get(
    'SELECT COUNT(*) as count FROM exchange_orders WHERE user_id = ?',
    userId
  );
  const total = totalResult?.count || 0;

  return { orders: orders as ExchangeOrder[], total };
}

export async function listExchangeOrders(
  page: number = 1,
  pageSize: number = 20,
  status?: OrderStatus
): Promise<{ orders: ExchangeOrder[]; total: number }> {
  const db = await getDb();
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const orders = await db.all(
    `SELECT * FROM exchange_orders ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    pageSize,
    offset
  );

  const totalResult = await db.get(
    `SELECT COUNT(*) as count FROM exchange_orders ${whereClause}`,
    ...params
  );
  const total = totalResult?.count || 0;

  return { orders: orders as ExchangeOrder[], total };
}

export async function reviewExchangeOrder(
  orderId: number,
  reviewerId: number,
  status: 'approved' | 'rejected',
  note?: string
): Promise<ExchangeOrder> {
  const db = await getDb();
  const order = await getExchangeOrderById(orderId);

  if (!order) {
    throw new AppError('兑换订单不存在', 404);
  }

  if (order.status !== 'pending') {
    throw new AppError('该订单状态不允许复核', 400);
  }

  const now = new Date().toISOString();

  if (status === 'approved') {
    const stockCheck = await checkStock(order.inventory_item_id, order.quantity);
    if (!stockCheck.available) {
      throw new AppError(`库存不足，无法批准。当前库存: ${stockCheck.currentStock}`, 400);
    }

    await deductStock(order.inventory_item_id, order.quantity);

    const tx = await db.get(
      `SELECT id FROM points_transactions
       WHERE related_id = ? AND type = 'exchange' AND status = 'pending'`,
      orderId
    );

    if (tx) {
      await reviewTransaction(tx.id, reviewerId, 'approved', note);
    }

    await db.run(
      `UPDATE exchange_orders
       SET status = ?, reviewed_at = ?, reviewed_by = ?, review_note = ?
       WHERE id = ?`,
      'completed' as OrderStatus,
      now,
      reviewerId,
      note || null,
      orderId
    );
  } else {
    const tx = await db.get(
      `SELECT id FROM points_transactions
       WHERE related_id = ? AND type = 'exchange' AND status = 'pending'`,
      orderId
    );

    if (tx) {
      await reviewTransaction(tx.id, reviewerId, 'rejected', note);
    }

    await db.run(
      `UPDATE exchange_orders
       SET status = ?, reviewed_at = ?, reviewed_by = ?, review_note = ?
       WHERE id = ?`,
      'rejected' as OrderStatus,
      now,
      reviewerId,
      note || null,
      orderId
    );
  }

  const updated = await getExchangeOrderById(orderId);
  return updated!;
}

export async function cancelExchangeOrder(
  orderId: number,
  userId: number
): Promise<ExchangeOrder> {
  const db = await getDb();
  const order = await getExchangeOrderById(orderId);

  if (!order) {
    throw new AppError('兑换订单不存在', 404);
  }

  if (order.user_id !== userId) {
    throw new AppError('只能取消自己的订单', 403);
  }

  if (order.status !== 'pending') {
    throw new AppError('该订单状态不允许取消', 400);
  }

  const tx = await db.get(
    `SELECT id FROM points_transactions
     WHERE related_id = ? AND type = 'exchange' AND status = 'pending'`,
    orderId
  );

  if (tx) {
    await db.run(
      'UPDATE points_transactions SET status = ?, review_status = ? WHERE id = ?',
      'failed',
      'rejected',
      tx.id
    );
  }

  await db.run(
    'UPDATE exchange_orders SET status = ? WHERE id = ?',
    'cancelled' as OrderStatus,
    orderId
  );

  const updated = await getExchangeOrderById(orderId);
  return updated!;
}

export async function getPendingReviewOrders(
  page: number = 1,
  pageSize: number = 20
): Promise<{ orders: ExchangeOrder[]; total: number }> {
  return listExchangeOrders(page, pageSize, 'pending');
}

export async function getOrdersForPublicList(
  page: number = 1,
  pageSize: number = 20
): Promise<{
  items: (ExchangeOrder & { user_name: string; user_phone: string; item_name: string })[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const db = await getDb();
  const offset = (page - 1) * pageSize;

  const orders = await db.all(
    `SELECT o.*, u.name as user_name, u.phone as user_phone, i.name as item_name
     FROM exchange_orders o
     JOIN users u ON o.user_id = u.id
     JOIN inventory_items i ON o.inventory_item_id = i.id
     WHERE o.status IN ('completed', 'approved')
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    pageSize,
    offset
  );

  const totalResult = await db.get(
    `SELECT COUNT(*) as count FROM exchange_orders WHERE status IN ('completed', 'approved')`
  );
  const total = totalResult?.count || 0;

  return {
    items: orders as (ExchangeOrder & { user_name: string; user_phone: string; item_name: string })[],
    total,
    page,
    pageSize,
  };
}
