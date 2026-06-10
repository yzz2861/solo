const express = require('express');
const { prepare } = require('../db');
const dayjs = require('dayjs');

const router = express.Router();

router.get('/overview', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateWhere = '';
    let params = [];

    if (startDate) {
      dateWhere += ' WHERE visit_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      dateWhere += dateWhere ? ' AND visit_date <= ?' : ' WHERE visit_date <= ?';
      params.push(endDate);
    }

    const totalRecords = prepare(`SELECT COUNT(*) as count FROM visit_records${dateWhere}`).get(...params).count;
    
    const reservationCount = prepare(
      `SELECT COUNT(*) as count FROM visit_records${dateWhere}${dateWhere ? ' AND' : ' WHERE'} has_reservation = 1`
    ).get(...params).count;
    
    const recognitionCount = prepare(
      `SELECT COUNT(*) as count FROM visit_records${dateWhere}${dateWhere ? ' AND' : ' WHERE'} has_recognition = 1`
    ).get(...params).count;
    
    const manualCount = prepare(
      `SELECT COUNT(*) as count FROM visit_records${dateWhere}${dateWhere ? ' AND' : ' WHERE'} has_manual_release = 1`
    ).get(...params).count;

    const noReservationCount = prepare(
      `SELECT COUNT(*) as count FROM visit_records${dateWhere}${dateWhere ? ' AND' : ' WHERE'} has_reservation = 0`
    ).get(...params).count;
    
    const plateMismatchCount = prepare(
      `SELECT COUNT(*) as count FROM visit_records${dateWhere}${dateWhere ? ' AND' : ' WHERE'} plate_matched = 0`
    ).get(...params).count;
    
    const overtimeCount = prepare(
      `SELECT COUNT(*) as count FROM visit_records${dateWhere}${dateWhere ? ' AND' : ' WHERE'} is_overtime = 1`
    ).get(...params).count;

    const pendingCount = prepare(
      `SELECT COUNT(*) as count FROM visit_records${dateWhere}${dateWhere ? ' AND' : ' WHERE'} audit_status = 'pending'`
    ).get(...params).count;

    const totalReservations = prepare('SELECT COUNT(*) as count FROM reservations').get().count;
    const totalRecognitions = prepare('SELECT COUNT(*) as count FROM recognitions').get().count;
    const totalManualReleases = prepare('SELECT COUNT(*) as count FROM manual_releases').get().count;

    const topGates = prepare(`
      SELECT gate, COUNT(*) as count 
      FROM visit_records 
      WHERE gate IS NOT NULL AND gate != ''
      GROUP BY gate 
      ORDER BY count DESC 
      LIMIT 5
    `).all();

    const topOperators = prepare(`
      SELECT operator, COUNT(*) as count 
      FROM visit_records 
      WHERE operator IS NOT NULL AND operator != ''
      GROUP BY operator 
      ORDER BY count DESC 
      LIMIT 5
    `).all();

    res.json({
      success: true,
      data: {
        totalRecords,
        reservationCount,
        recognitionCount,
        manualCount,
        noReservationCount,
        plateMismatchCount,
        overtimeCount,
        pendingCount,
        totalReservations,
        totalRecognitions,
        totalManualReleases,
        topGates,
        topOperators
      }
    });
  } catch (err) {
    console.error('获取统计概览出错:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/daily', (req, res) => {
  try {
    const { days = 7 } = req.query;
    const dayCount = parseInt(days) || 7;

    const dailyData = prepare(`
      SELECT 
        visit_date as date,
        COUNT(*) as total,
        SUM(has_reservation) as reservation_count,
        SUM(has_manual_release) as manual_count,
        SUM(CASE WHEN has_reservation = 0 THEN 1 ELSE 0 END) as no_reservation_count,
        SUM(CASE WHEN plate_matched = 0 THEN 1 ELSE 0 END) as mismatch_count,
        SUM(CASE WHEN is_overtime = 1 THEN 1 ELSE 0 END) as overtime_count
      FROM visit_records
      WHERE visit_date IS NOT NULL AND visit_date != ''
      GROUP BY visit_date
      ORDER BY visit_date DESC
      LIMIT ?
    `).all(dayCount);

    res.json({
      success: true,
      data: dailyData.reverse()
    });
  } catch (err) {
    console.error('获取每日统计出错:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
