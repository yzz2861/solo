import { Router } from 'express';
import { getOrders } from '../services/orderService';
import { generateDailyReport, generateCSV } from '../utils/report';

const router = Router();

router.get('/daily', (req, res) => {
  const dateStr = typeof req.query.date as string | undefined;
  const date = dateStr ? new Date(dateStr) : new Date();
  const orders = getOrders(date);
  const report = generateDailyReport(orders, date);
  res.json(report);
});

router.get('/daily/export', (req, res) => {
  const dateStr = typeof req.query.date as string | undefined;
  const date = dateStr ? new Date(dateStr) : new Date();
  const orders = getOrders(date);
  const report = generateDailyReport(orders, date);
  const csv = generateCSV(report);
  const filename = `daily-report-${report.date}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv);
});

export default router;
