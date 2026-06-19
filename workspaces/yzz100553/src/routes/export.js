const express = require('express');
const dayjs = require('dayjs');
const { auth, requireRole } = require('../middleware/auth');
const reportService = require('../services/reportService');

const router = express.Router();

router.get('/reservations', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || dayjs().startOf('month').format('YYYY-MM-DD');
    const endDate = end_date || dayjs().endOf('month').format('YYYY-MM-DD');

    const csv = await reportService.exportReservationsCsv(startDate, endDate);

    const filename = `预约记录_${startDate}_${endDate}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(csv);
  } catch (err) {
    console.error('导出预约记录错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/violations', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || dayjs().startOf('month').format('YYYY-MM-DD');
    const endDate = end_date || dayjs().endOf('month').format('YYYY-MM-DD');

    const csv = await reportService.exportViolationsCsv(startDate, endDate);

    const filename = `违规记录_${startDate}_${endDate}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(csv);
  } catch (err) {
    console.error('导出违规记录错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/release-logs', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || dayjs().startOf('month').format('YYYY-MM-DD');
    const endDate = end_date || dayjs().endOf('month').format('YYYY-MM-DD');

    const csv = await reportService.exportReleaseLogsCsv(startDate, endDate);

    const filename = `释放记录_${startDate}_${endDate}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(csv);
  } catch (err) {
    console.error('导出释放记录错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/monthly-summary', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || dayjs().startOf('month').format('YYYY-MM-DD');
    const endDate = end_date || dayjs().endOf('month').format('YYYY-MM-DD');

    const report = await reportService.generateMonthlyReport(startDate, endDate);
    res.json(report);
  } catch (err) {
    console.error('获取月度汇总错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
