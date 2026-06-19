import { createObjectCsvStringifier } from 'csv-writer';
import {
  getExchangeStockExport,
  getReversalExport,
  getPointsRankingExport,
  StockExportItem,
  ReversalExportItem,
  PointsRankingExportItem,
} from './reportService';
import { TransactionQuery, RankingQuery } from '../models/types';
import { queryTransactions } from './pointsService';

export async function exportInventoryStockToCsv(): Promise<string> {
  const data = await getExchangeStockExport();

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'id', title: '商品ID' },
      { id: 'name', title: '商品名称' },
      { id: 'description', title: '描述' },
      { id: 'category', title: '分类' },
      { id: 'points_cost', title: '所需积分' },
      { id: 'stock_quantity', title: '当前库存' },
      { id: 'total_exchanged', title: '已兑换数量' },
      { id: 'total_points_used', title: '已用积分总额' },
      { id: 'created_at', title: '创建时间' },
      { id: 'updated_at', title: '更新时间' },
    ],
  });

  const records = data.map((item: StockExportItem) => ({
    id: item.id,
    name: item.name,
    description: item.description || '',
    category: item.category || '',
    points_cost: item.points_cost,
    stock_quantity: item.stock_quantity,
    total_exchanged: item.total_exchanged,
    total_points_used: item.total_points_used,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));

  return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
}

export async function exportReversalsToCsv(query: TransactionQuery = {}): Promise<string> {
  const data = await getReversalExport(query);

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'id', title: '回退记录ID' },
      { id: 'user_name', title: '用户姓名' },
      { id: 'user_phone', title: '用户手机号' },
      { id: 'amount', title: '回退积分' },
      { id: 'balance_after', title: '回退后余额' },
      { id: 'description', title: '回退原因' },
      { id: 'original_transaction_description', title: '原交易描述' },
      { id: 'related_id', title: '关联ID' },
      { id: 'created_at', title: '回退时间' },
      { id: 'reviewed_by', title: '操作人ID' },
    ],
  });

  const records = data.map((item: ReversalExportItem) => ({
    id: item.id,
    user_name: item.user_name,
    user_phone: item.user_phone,
    amount: item.amount,
    balance_after: item.balance_after,
    description: item.description || '',
    original_transaction_description: item.original_transaction_description || '',
    related_id: item.related_id || '',
    created_at: item.created_at,
    reviewed_by: item.reviewed_by || '',
  }));

  return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
}

export async function exportPointsRankingToCsv(query: RankingQuery = {}): Promise<string> {
  const data = await getPointsRankingExport(query);

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'rank', title: '排名' },
      { id: 'user_id', title: '用户ID' },
      { id: 'user_name', title: '姓名' },
      { id: 'user_phone', title: '手机号' },
      { id: 'total_awarded', title: '累计获得积分' },
      { id: 'total_exchanged', title: '累计兑换积分' },
      { id: 'balance', title: '当前余额' },
    ],
  });

  const records = data.map((item: PointsRankingExportItem) => ({
    rank: item.rank,
    user_id: item.user_id,
    user_name: item.user_name,
    user_phone: item.user_phone,
    total_awarded: item.total_awarded,
    total_exchanged: item.total_exchanged,
    balance: item.balance,
  }));

  return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
}

export async function exportUserTransactionsToCsv(userId: number): Promise<string> {
  const { items } = await queryTransactions({ userId, pageSize: 10000 });

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'id', title: '交易ID' },
      { id: 'type', title: '交易类型' },
      { id: 'amount', title: '积分变动' },
      { id: 'balance_after', title: '变动后余额' },
      { id: 'status', title: '状态' },
      { id: 'review_status', title: '复核状态' },
      { id: 'description', title: '描述' },
      { id: 'created_at', title: '交易时间' },
    ],
  });

  const typeMap: Record<string, string> = {
    award: '积分入账',
    freeze: '积分冻结',
    exchange: '积分兑换',
    refund: '积分退回',
    revoke: '积分撤销',
  };

  const statusMap: Record<string, string> = {
    pending: '待处理',
    completed: '已完成',
    failed: '已失败',
    reversed: '已撤销',
  };

  const reviewStatusMap: Record<string, string> = {
    pending: '待复核',
    approved: '已通过',
    rejected: '已拒绝',
  };

  const records = items.map((item) => ({
    id: item.id,
    type: typeMap[item.type] || item.type,
    amount: item.type === 'award' || item.type === 'refund' ? `+${item.amount}` : `-${item.amount}`,
    balance_after: item.balance_after,
    status: statusMap[item.status] || item.status,
    review_status: item.review_status ? (reviewStatusMap[item.review_status] || item.review_status) : '无需复核',
    description: item.description || '',
    created_at: item.created_at,
  }));

  return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
}
