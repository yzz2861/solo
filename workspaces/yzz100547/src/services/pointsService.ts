import { getDb } from '../database';
import {
  PointsTransaction,
  TransactionType,
  TransactionStatus,
  ReviewStatus,
  TransactionQuery,
  PaginatedResponse,
} from '../models/types';
import { AppError } from '../utils/errors';
import { updateUserPoints, getUserById } from './userService';
import config from '../config';

async function createTransaction(
  userId: number,
  type: TransactionType,
  amount: number,
  description: string,
  idempotencyKey?: string,
  relatedId?: number
): Promise<PointsTransaction> {
  const db = await getDb();
  const user = await getUserById(userId);
  if (!user) {
    throw new AppError('用户不存在', 404);
  }

  const balanceAfter = user.points_balance + (type === 'award' || type === 'refund' ? amount : -amount);

  if (balanceAfter < 0) {
    throw new AppError('积分不足', 400);
  }

  const reviewStatus: ReviewStatus | undefined =
    Math.abs(amount) >= config.reviewThresholdPoints
      ? 'pending'
      : undefined;

  const result = await db.run(
    `INSERT INTO points_transactions
     (user_id, type, amount, balance_after, related_id, status, idempotency_key, description, review_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    userId,
    type,
    amount,
    balanceAfter,
    relatedId || null,
    reviewStatus ? 'pending' : 'completed',
    idempotencyKey || null,
    description,
    reviewStatus || null
  );

  const transaction = await db.get('SELECT * FROM points_transactions WHERE id = ?', result.lastID);
  return transaction as PointsTransaction;
}

export async function awardPoints(
  userId: number,
  amount: number,
  description: string,
  type: TransactionType = 'award',
  idempotencyKey?: string,
  operatorId?: number,
  relatedId?: number
): Promise<PointsTransaction> {
  if (amount <= 0) {
    throw new AppError('积分数量必须大于0', 400);
  }

  const db = await getDb();

  if (idempotencyKey) {
    const existing = await db.get(
      'SELECT * FROM points_transactions WHERE idempotency_key = ? AND type = ?',
      idempotencyKey,
      type
    );
    if (existing) {
      return existing as PointsTransaction;
    }
  }

  const needsReview = amount >= config.reviewThresholdPoints;
  const balanceAfter = needsReview
    ? (await getUserById(userId))!.points_balance
    : await updateUserPoints(userId, amount);

  const reviewStatus: ReviewStatus | undefined = needsReview ? 'pending' : undefined;

  const result = await db.run(
    `INSERT INTO points_transactions
     (user_id, type, amount, balance_after, related_id, status, idempotency_key, description, review_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    userId,
    type,
    amount,
    balanceAfter,
    relatedId || null,
    needsReview ? 'pending' : 'completed',
    idempotencyKey || null,
    description,
    reviewStatus || null
  );

  if (needsReview && operatorId) {
    await db.run(
      'UPDATE points_transactions SET reviewed_by = ? WHERE id = ?',
      operatorId,
      result.lastID
    );
  }

  const transaction = await db.get('SELECT * FROM points_transactions WHERE id = ?', result.lastID);
  return transaction as PointsTransaction;
}

export async function freezePoints(
  userId: number,
  amount: number,
  description: string,
  idempotencyKey?: string
): Promise<PointsTransaction> {
  if (amount <= 0) {
    throw new AppError('冻结积分必须大于0', 400);
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new AppError('用户不存在', 404);
  }

  if (user.points_balance < amount) {
    throw new AppError('可用积分不足', 400);
  }

  const balanceAfter = await updateUserPoints(userId, -amount);

  const db = await getDb();
  const result = await db.run(
    `INSERT INTO points_transactions
     (user_id, type, amount, balance_after, status, idempotency_key, description)
     VALUES (?, ?, ?, ?, 'completed', ?, ?)`,
    userId,
    'freeze' as TransactionType,
    amount,
    balanceAfter,
    idempotencyKey || null,
    description
  );

  const transaction = await db.get('SELECT * FROM points_transactions WHERE id = ?', result.lastID);
  return transaction as PointsTransaction;
}

export async function refundPoints(
  userId: number,
  amount: number,
  description: string,
  relatedTransactionId?: number,
  idempotencyKey?: string
): Promise<PointsTransaction> {
  if (amount <= 0) {
    throw new AppError('退还积分必须大于0', 400);
  }

  const balanceAfter = await updateUserPoints(userId, amount);

  const db = await getDb();
  const result = await db.run(
    `INSERT INTO points_transactions
     (user_id, type, amount, balance_after, related_id, status, idempotency_key, description)
     VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)`,
    userId,
    'refund' as TransactionType,
    amount,
    balanceAfter,
    relatedTransactionId || null,
    idempotencyKey || null,
    description
  );

  const transaction = await db.get('SELECT * FROM points_transactions WHERE id = ?', result.lastID);
  return transaction as PointsTransaction;
}

export async function revokePoints(
  userId: number,
  amount: number,
  description: string,
  originalTransactionId?: number,
  operatorId?: number,
  relatedId?: number
): Promise<PointsTransaction> {
  if (amount <= 0) {
    throw new AppError('撤销积分必须大于0', 400);
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new AppError('用户不存在', 404);
  }

  if (user.points_balance < amount) {
    throw new AppError('用户积分不足，无法撤销', 400);
  }

  const balanceAfter = await updateUserPoints(userId, -amount);

  const db = await getDb();

  if (originalTransactionId) {
    await db.run(
      'UPDATE points_transactions SET status = ? WHERE id = ?',
      'reversed' as TransactionStatus,
      originalTransactionId
    );
  }

  const result = await db.run(
    `INSERT INTO points_transactions
     (user_id, type, amount, balance_after, related_id, status, description, reviewed_by, review_status, reviewed_at)
     VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, 'approved', ?)`,
    userId,
    'revoke' as TransactionType,
    amount,
    balanceAfter,
    relatedId || null,
    description,
    operatorId || null,
    new Date().toISOString()
  );

  const transaction = await db.get('SELECT * FROM points_transactions WHERE id = ?', result.lastID);
  return transaction as PointsTransaction;
}

export async function exchangePoints(
  userId: number,
  amount: number,
  description: string,
  relatedId?: number,
  idempotencyKey?: string,
  needsReview: boolean = false
): Promise<PointsTransaction> {
  if (amount <= 0) {
    throw new AppError('兑换积分必须大于0', 400);
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new AppError('用户不存在', 404);
  }

  if (user.points_balance < amount) {
    throw new AppError('积分不足', 400);
  }

  const balanceAfter = needsReview
    ? user.points_balance
    : await updateUserPoints(userId, -amount);

  const reviewStatus: ReviewStatus | undefined = needsReview ? 'pending' : undefined;

  const db = await getDb();
  const result = await db.run(
    `INSERT INTO points_transactions
     (user_id, type, amount, balance_after, related_id, status, idempotency_key, description, review_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    userId,
    'exchange' as TransactionType,
    amount,
    balanceAfter,
    relatedId || null,
    needsReview ? 'pending' : 'completed',
    idempotencyKey || null,
    description,
    reviewStatus || null
  );

  const transaction = await db.get('SELECT * FROM points_transactions WHERE id = ?', result.lastID);
  return transaction as PointsTransaction;
}

export async function reviewTransaction(
  transactionId: number,
  reviewerId: number,
  status: ReviewStatus,
  note?: string
): Promise<PointsTransaction> {
  const db = await getDb();
  const transaction = await db.get('SELECT * FROM points_transactions WHERE id = ?', transactionId) as PointsTransaction;

  if (!transaction) {
    throw new AppError('交易记录不存在', 404);
  }

  if (transaction.review_status === 'approved' || transaction.review_status === 'rejected') {
    throw new AppError('该交易已经过复核', 400);
  }

  const now = new Date().toISOString();

  if (status === 'approved') {
    if (transaction.type === 'award') {
      await updateUserPoints(transaction.user_id, transaction.amount);
    } else if (transaction.type === 'exchange') {
      await updateUserPoints(transaction.user_id, -transaction.amount);
    }
  }

  await db.run(
    `UPDATE points_transactions
     SET status = ?, review_status = ?, reviewed_at = ?, reviewed_by = ?, description = ?
     WHERE id = ?`,
    status === 'approved' ? 'completed' : 'failed',
    status,
    now,
    reviewerId,
    note ? `${transaction.description || ''} - 复核备注: ${note}`.trim() : transaction.description,
    transactionId
  );

  const updated = await db.get('SELECT * FROM points_transactions WHERE id = ?', transactionId);
  return updated as PointsTransaction;
}

export async function getTransactionById(id: number): Promise<PointsTransaction | null> {
  const db = await getDb();
  const transaction = await db.get('SELECT * FROM points_transactions WHERE id = ?', id);
  return transaction ? (transaction as PointsTransaction) : null;
}

export async function queryTransactions(query: TransactionQuery): Promise<PaginatedResponse<PointsTransaction>> {
  const db = await getDb();
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.userId) {
    conditions.push('user_id = ?');
    params.push(query.userId);
  }
  if (query.type) {
    conditions.push('type = ?');
    params.push(query.type);
  }
  if (query.status) {
    conditions.push('status = ?');
    params.push(query.status);
  }
  if (query.startDate) {
    conditions.push('created_at >= ?');
    params.push(query.startDate);
  }
  if (query.endDate) {
    conditions.push('created_at <= ?');
    params.push(query.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const transactions = await db.all(
    `SELECT * FROM points_transactions ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    pageSize,
    offset
  );

  const totalResult = await db.get(
    `SELECT COUNT(*) as count FROM points_transactions ${whereClause}`,
    ...params
  );
  const total = totalResult?.count || 0;

  return {
    items: transactions as PointsTransaction[],
    total,
    page,
    pageSize,
  };
}

export async function getTransactionsForPublicList(query: TransactionQuery): Promise<PaginatedResponse<PointsTransaction & { user_name: string; user_phone: string }>> {
  const db = await getDb();
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ["t.status = 'completed' AND (t.review_status IS NULL OR t.review_status = 'approved')"];
  const params: unknown[] = [];

  if (query.type) {
    conditions.push('t.type = ?');
    params.push(query.type);
  }
  if (query.startDate) {
    conditions.push('t.created_at >= ?');
    params.push(query.startDate);
  }
  if (query.endDate) {
    conditions.push('t.created_at <= ?');
    params.push(query.endDate);
  }

  const whereClause = conditions.join(' AND ');

  const transactions = await db.all(
    `SELECT t.*, u.name as user_name, u.phone as user_phone
     FROM points_transactions t
     JOIN users u ON t.user_id = u.id
     WHERE ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`,
    ...params,
    pageSize,
    offset
  );

  const totalResult = await db.get(
    `SELECT COUNT(*) as count FROM points_transactions t WHERE ${whereClause}`,
    ...params
  );
  const total = totalResult?.count || 0;

  return {
    items: transactions as (PointsTransaction & { user_name: string; user_phone: string })[],
    total,
    page,
    pageSize,
  };
}

export async function getPendingReviewTransactions(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<PointsTransaction>> {
  return queryTransactions({
    status: 'pending',
    page,
    pageSize,
  });
}

export async function getReversedTransactions(query: TransactionQuery): Promise<PaginatedResponse<PointsTransaction>> {
  return queryTransactions({
    ...query,
    type: 'revoke',
  });
}
