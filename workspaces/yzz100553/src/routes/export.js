const express = require('express');
const dayjs = require('dayjs');
const { auth, requireRole } = require('../middleware/auth');
const reportService = require('../services/reportService');

const router = express.Router();

router.get('/reservations', auth, requireRole('librarian'), (req, res) => {
  const { start_date, end_date } = req.query;
  const startDate = start_date || dayjs().startOf('month').format('YYYY-MM-DD');
  const endDate = end_date || dayjs().endOf('month').format('YYYY-MM-DD');

  const csv = reportService.exportReservationsCsv(startDate, endDate);

  const filename = `预约记录_${startDate}_${endDate}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(csv);
});

router.get('/violations', auth, requireRole('librarian'), (req, res) => {
  const { start_date, end_date } = req.query;
  const startDate = start_date || dayjs().startOf('month').format('YYYY-MM-DD');
  const endDate = end_date || dayjs().endOf('month').format('YYYY-MM-DD');

  const csv = reportService.exportViolationsCsv(startDate, endDate);

  const filename = `违规记录_${startDate}_${endDate}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(csv);
});

router.get('/release-logs', auth, requireRole('librarian'), (req, res) => {
  const { start_date, end_date } = req.query;
  const startDate = start_date || dayjs().startOf('month').format('YYYY-MM-DD');
  const endDate = end_date || dayjs().endOf('month').format('YYYY-MM-DD');

  const csv = reportService.exportReleaseLogsCsv(startDate, endDate);

  const filename = `释放记录_${startDate}_${endDate}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(csv);
});

router.get('/monthly-summary', auth, requireRole('librarian'), (req, res) => {
  const { start_date, end_date } = req.query;
  const startDate = start_date || dayjs().startOf('month').format('YYYY-MM-DD');
  const endDate = end_date || dayjs().endOf('month').format('YYYY-MM-DD');

  const report = reportService.generateMonthlyReport(startDate, endDate);
  res.json(report);
});

module.exports = router;
