import { getDb } from '../database';
import { RankingQuery, TransactionQuery, InventoryItem, PointsTransaction, ExchangeOrder } from '../models/types';
import { queryTransactions, getReversedTransactions } from './pointsService';
import { listInventoryItems } from './inventoryService';
import { listExchangeOrders } from './exchangeService';
import { maskPhone } from '../utils/phone';

export interface UserRanking {
  user_id: number;
  user_name: string;
  user_phone: string;
  total_points: number;
  rank: number;
}

export interface StockExportItem extends InventoryItem {
  total_exchanged: number;
  total_points_used: number;
}

export interface ReversalExportItem extends PointsTransaction {
  user_name: string;
  user_phone: string;
  original_transaction_description?: string;
}

export interface PointsRankingExportItem {
  rank: number;
  user_id: number;
  user_name: string;
  user_phone: string;
  total_awarded: number;
  total_exchanged: number;
  balance: number;
}

export async function getPointsRanking(
  query: RankingQuery = {}
): Promise<{ rankings: UserRanking[]; total: number }> {
  const db = await getDb();
  const limit = query.limit || 100;

  const conditions: string[] = ["t.type = 'award' AND t.status = 'completed'"];
  const params: unknown[] = [];

  if (query.startDate) {
    conditions.push('t.created_at >= ?');
    params.push(query.startDate);
  }
  if (query.endDate) {
    conditions.push('t.created_at <= ?');
    params.push(query.endDate);
  }

  const whereClause = conditions.join(' AND ');

  const rankings = await db.all(
    `SELECT
       u.id as user_id,
       u.name as user_name,
       u.phone as user_phone,
       SUM(t.amount) as total_points,
       ROW_NUMBER() OVER (ORDER BY SUM(t.amount) DESC) as rank
     FROM points_transactions t
     JOIN users u ON t.user_id = u.id
     WHERE ${whereClause}
     GROUP BY t.user_id
     ORDER BY total_points DESC
     LIMIT ?`,
    ...params,
    limit
  );

  const totalResult = await db.get(
    `SELECT COUNT(DISTINCT user_id) as count FROM points_transactions t WHERE ${whereClause}`,
    ...params
  );
  const total = totalResult?.count || 0;

  const maskedRankings: UserRanking[] = rankings.map((r: UserRanking) => ({
    ...r,
    user_phone: maskPhone(r.user_phone),
  }));

  return { rankings: maskedRankings, total };
}

export async function getExchangeStockExport(): Promise<StockExportItem[]> {
  const db = await getDb();
  const { items } = await listInventoryItems(1, 1000, undefined, true);

  const exchangeStats = await db.all(
    `SELECT
       inventory_item_id,
       SUM(quantity) as total_exchanged,
       SUM(total_points) as total_points_used
     FROM exchange_orders
     WHERE status IN ('completed', 'approved')
     GROUP BY inventory_item_id`
  );

  const statsMap = new Map<number, { total_exchanged: number; total_points_used: number }>();
  exchangeStats.forEach((s: { inventory_item_id: number; total_exchanged: number; total_points_used: number }) => {
    statsMap.set(s.inventory_item_id, {
      total_exchanged: s.total_exchanged,
      total_points_used: s.total_points_used,
    });
  });

  return items.map((item: InventoryItem) => {
    const stats = statsMap.get(item.id) || { total_exchanged: 0, total_points_used: 0 };
    return {
      ...item,
      total_exchanged: stats.total_exchanged,
      total_points_used: stats.total_points_used,
    };
  });
}

export async function getReversalExport(
  query: TransactionQuery = {}
): Promise<ReversalExportItem[]> {
  const { items } = await getReversedTransactions({ ...query, pageSize: 1000 });
  const db = await getDb();

  const result: ReversalExportItem[] = [];

  for (const tx of items) {
    const user = await db.get('SELECT name, phone FROM users WHERE id = ?', tx.user_id);
    let originalTxDesc: string | undefined;

    if (tx.related_id) {
      const originalTx = await db.get(
        'SELECT description FROM points_transactions WHERE id = ?',
        tx.related_id
      );
      originalTxDesc = originalTx?.description;
    }

    result.push({
      ...tx,
      user_name: user?.name || '',
      user_phone: maskPhone(user?.phone || ''),
      original_transaction_description: originalTxDesc,
    });
  }

  return result;
}

export async function getPointsRankingExport(
  query: RankingQuery = {}
): Promise<PointsRankingExportItem[]> {
  const db = await getDb();
  const { rankings } = await getPointsRanking(query);

  const result: PointsRankingExportItem[] = [];

  for (const ranking of rankings) {
    const user = await db.get(
      'SELECT points_balance FROM users WHERE id = ?',
      ranking.user_id
    );

    const exchangedStats = await db.get(
      `SELECT COALESCE(SUM(amount), 0) as total_exchanged
       FROM points_transactions
       WHERE user_id = ? AND type = 'exchange' AND status = 'completed'`,
      ranking.user_id
    );

    result.push({
      rank: ranking.rank,
      user_id: ranking.user_id,
      user_name: ranking.user_name,
      user_phone: ranking.user_phone,
      total_awarded: ranking.total_points,
      total_exchanged: exchangedStats?.total_exchanged || 0,
      balance: user?.points_balance || 0,
    });
  }

  return result;
}

export async function getUserPointsSummary(userId: number): Promise<{
  total_awarded: number;
  total_exchanged: number;
  total_frozen: number;
  total_refunded: number;
  total_revoked: number;
  current_balance: number;
}> {
  const db = await getDb();

  const [awarded, exchanged, frozen, refunded, revoked, balance] = await Promise.all([
    db.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM points_transactions
       WHERE user_id = ? AND type = 'award' AND status = 'completed'`,
      userId
    ),
    db.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM points_transactions
       WHERE user_id = ? AND type = 'exchange' AND status = 'completed'`,
      userId
    ),
    db.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM points_transactions
       WHERE user_id = ? AND type = 'freeze' AND status = 'completed'`,
      userId
    ),
    db.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM points_transactions
       WHERE user_id = ? AND type = 'refund' AND status = 'completed'`,
      userId
    ),
    db.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM points_transactions
       WHERE user_id = ? AND type = 'revoke' AND status = 'completed'`,
      userId
    ),
    db.get('SELECT points_balance FROM users WHERE id = ?', userId),
  ]);

  return {
    total_awarded: awarded?.total || 0,
    total_exchanged: exchanged?.total || 0,
    total_frozen: frozen?.total || 0,
    total_refunded: refunded?.total || 0,
    total_revoked: revoked?.total || 0,
    current_balance: balance?.points_balance || 0,
  };
}
