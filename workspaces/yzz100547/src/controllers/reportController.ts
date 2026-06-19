import { Request, Response } from 'express';
import {
  getPointsRanking,
  getExchangeStockExport,
  getReversalExport,
  getUserPointsSummary,
} from '../services/reportService';
import {
  exportInventoryStockToCsv,
  exportReversalsToCsv,
  exportPointsRankingToCsv,
  exportUserTransactionsToCsv,
} from '../services/exportService';
import { asyncHandler } from '../utils/errors';
import { ApiResponse, RankingQuery, TransactionQuery } from '../models/types';
import { maskPhone } from '../utils/phone';

export const getRanking = asyncHandler(async (req: Request, res: Response) => {
  const query: RankingQuery = {
    limit: parseInt(req.query.limit as string, 10) || 100,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  };

  const { rankings, total } = await getPointsRanking(query);

  res.json({
    success: true,
    data: { rankings, total },
  } as ApiResponse);
});

export const getStockSummary = asyncHandler(async (req: Request, res: Response) => {
  const data = await getExchangeStockExport();

  res.json({
    success: true,
    data: { items: data },
  } as ApiResponse);
});

export const getReversalSummary = asyncHandler(async (req: Request, res: Response) => {
  const query: TransactionQuery = {
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    pageSize: 1000,
  };

  const data = await getReversalExport(query);

  res.json({
    success: true,
    data: { items: data },
  } as ApiResponse);
});

export const getUserSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId || req.query.userId as string, 10) || req.user!.userId;

  const summary = await getUserPointsSummary(userId);

  res.json({
    success: true,
    data: { summary },
  } as ApiResponse);
});

export const exportStockCsv = asyncHandler(async (req: Request, res: Response) => {
  const csv = await exportInventoryStockToCsv();

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="inventory_stock.csv"');
  res.send('\uFEFF' + csv);
});

export const exportReversalsCsv = asyncHandler(async (req: Request, res: Response) => {
  const query: TransactionQuery = {
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  };

  const csv = await exportReversalsToCsv(query);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="reversal_records.csv"');
  res.send('\uFEFF' + csv);
});

export const exportRankingCsv = asyncHandler(async (req: Request, res: Response) => {
  const query: RankingQuery = {
    limit: parseInt(req.query.limit as string, 10) || 1000,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  };

  const csv = await exportPointsRankingToCsv(query);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="points_ranking.csv"');
  res.send('\uFEFF' + csv);
});

export const exportUserTransactionsCsv = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);

  if (!userId) {
    res.status(400).json({ success: false, error: '缺少用户ID' } as ApiResponse);
    return;
  }

  const csv = await exportUserTransactionsToCsv(userId);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="user_${userId}_transactions.csv"`);
  res.send('\uFEFF' + csv);
});
