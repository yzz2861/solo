const express = require('express');
const { prepare } = require('../db');
const dayjs = require('dayjs');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 20, 
      keyword, 
      startDate, 
      endDate,
      hasReservation,
      hasRecognition,
      hasManualRelease,
      plateMismatch,
      overtime,
      auditStatus,
      releaseType,
      gate
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 20;
    const offset = (pageNum - 1) * size;

    let whereClauses = [];
    let params = [];

    if (keyword) {
      whereClauses.push('(plate_number LIKE ? OR reservation_no LIKE ? OR visitor_name LIKE ? OR operator LIKE ?)');
      const likeKeyword = `%${keyword}%`;
      params.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword);
    }

    if (startDate) {
      whereClauses.push('visit_date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push('visit_date <= ?');
      params.push(endDate);
    }

    if (hasReservation === '1') {
      whereClauses.push('has_reservation = 1');
    } else if (hasReservation === '0') {
      whereClauses.push('has_reservation = 0');
    }

    if (hasRecognition === '1') {
      whereClauses.push('has_recognition = 1');
    } else if (hasRecognition === '0') {
      whereClauses.push('has_recognition = 0');
    }

    if (hasManualRelease === '1') {
      whereClauses.push('has_manual_release = 1');
    } else if (hasManualRelease === '0') {
      whereClauses.push('has_manual_release = 0');
    }

    if (plateMismatch === '1') {
      whereClauses.push('plate_matched = 0');
    }

    if (overtime === '1') {
      whereClauses.push('is_overtime = 1');
    }

    if (auditStatus) {
      whereClauses.push('audit_status = ?');
      params.push(auditStatus);
    }

    if (releaseType) {
      whereClauses.push('release_type = ?');
      params.push(releaseType);
    }

    if (gate) {
      whereClauses.push('gate = ?');
      params.push(gate);
    }

    let whereSql = '';
    if (whereClauses.length > 0) {
      whereSql = ' WHERE ' + whereClauses.join(' AND ');
    }

    const countSql = `SELECT COUNT(*) as total FROM visit_records${whereSql}`;
    const totalResult = prepare(countSql).get(...params);
    const total = totalResult ? totalResult.total : 0;

    const listSql = `SELECT * FROM visit_records${whereSql} ORDER BY COALESCE(release_time, recognize_time, visit_date) DESC LIMIT ? OFFSET ?`;
    const list = prepare(listSql).all(...params, size, offset);

    res.json({
      success: true,
      data: {
        list,
        total,
        page: pageNum,
        pageSize: size,
        totalPages: Math.ceil(total / size)
      }
    });
  } catch (err) {
    console.error('查询访客记录出错:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const record = prepare('SELECT * FROM visit_records WHERE id = ?').get(id);
    
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    let reservation = null;
    let recognition = null;
    let manualRelease = null;

    if (record.reservation_id) {
      reservation = prepare('SELECT * FROM reservations WHERE id = ?').get(record.reservation_id);
    }

    if (record.recognition_id) {
      recognition = prepare('SELECT * FROM recognitions WHERE id = ?').get(record.recognition_id);
    }

    if (record.manual_release_id) {
      manualRelease = prepare('SELECT * FROM manual_releases WHERE id = ?').get(record.manual_release_id);
    }

    res.json({
      success: true,
      data: {
        record,
        reservation,
        recognition,
        manualRelease
      }
    });
  } catch (err) {
    console.error('查询记录详情出错:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/anomalies/summary', (req, res) => {
  try {
    const stats = {
      total: prepare('SELECT COUNT(*) as count FROM visit_records').get().count,
      noReservation: prepare('SELECT COUNT(*) as count FROM visit_records WHERE has_reservation = 0').get().count,
      plateMismatch: prepare('SELECT COUNT(*) as count FROM visit_records WHERE plate_matched = 0').get().count,
      overtime: prepare('SELECT COUNT(*) as count FROM visit_records WHERE is_overtime = 1').get().count,
      manualOnly: prepare('SELECT COUNT(*) as count FROM visit_records WHERE has_manual_release = 1 AND has_reservation = 0').get().count,
      pendingAudit: prepare("SELECT COUNT(*) as count FROM visit_records WHERE audit_status = 'pending'").get().count,
      audited: prepare("SELECT COUNT(*) as count FROM visit_records WHERE audit_status != 'pending'").get().count,
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('查询异常统计出错:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/gates/list', (req, res) => {
  try {
    const gates = prepare("SELECT DISTINCT gate FROM visit_records WHERE gate IS NOT NULL AND gate != '' ORDER BY gate").all();
    res.json({
      success: true,
      data: gates.map(g => g.gate)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
