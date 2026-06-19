const express = require('express');
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');
const reservationService = require('../services/reservationService');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { room_id, contact_name, contact_phone, group_size, start_time, end_time, purpose } = req.body;

    if (!room_id || !contact_name || !contact_phone || !group_size || !start_time || !end_time) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const result = await reservationService.createReservation({
      roomId: room_id,
      userId: req.user.id,
      contactName: contact_name,
      contactPhone: contact_phone,
      groupSize: group_size,
      startTime: start_time,
      endTime: end_time,
      purpose,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json(result.data);
  } catch (err) {
    console.error('创建预约错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const { status, page = 1, page_size = 20 } = req.query;

    let query = `
      SELECT r.*, ro.name as room_name, u.name as user_name
      FROM reservations r
      JOIN rooms ro ON r.room_id = ro.id
      JOIN users u ON r.user_id = u.id
      WHERE r.user_id = ?
    `;
    const params = [req.user.id];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    query += ' ORDER BY r.start_time DESC LIMIT ? OFFSET ?';
    params.push(Number(page_size), (page - 1) * page_size);

    const reservations = await db.all(query, ...params);

    const countQuery = 'SELECT COUNT(*) as total FROM reservations WHERE user_id = ?' + (status ? ' AND status = ?' : '');
    const countParams = status ? [req.user.id, status] : [req.user.id];
    const { total } = await db.get(countQuery, ...countParams);

    res.json({
      list: reservations,
      pagination: {
        page: Number(page),
        page_size: Number(page_size),
        total,
      },
    });
  } catch (err) {
    console.error('获取我的预约错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/room/:roomId', auth, async (req, res) => {
  try {
    const { date, status } = req.query;
    const roomId = req.params.roomId;

    let query = `
      SELECT r.*, ro.name as room_name, u.name as user_name
      FROM reservations r
      JOIN rooms ro ON r.room_id = ro.id
      JOIN users u ON r.user_id = u.id
      WHERE r.room_id = ?
    `;
    const params = [roomId];

    if (date) {
      query += ' AND DATE(r.start_time) = DATE(?)';
      params.push(date);
    }

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    query += ' ORDER BY r.start_time ASC';

    const reservations = await db.all(query, ...params);
    res.json(reservations);
  } catch (err) {
    console.error('获取房间预约错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const reservation = await reservationService.getReservationById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ error: '预约不存在' });
    }

    if (req.user.role !== 'librarian' && reservation.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权查看他人预约' });
    }

    res.json(reservation);
  } catch (err) {
    console.error('获取预约详情错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { status, room_id, user_id, start_date, end_date, page = 1, page_size = 20 } = req.query;

    let query = `
      SELECT r.*, ro.name as room_name, u.name as user_name
      FROM reservations r
      JOIN rooms ro ON r.room_id = ro.id
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    if (room_id) {
      query += ' AND r.room_id = ?';
      params.push(room_id);
    }
    if (user_id) {
      query += ' AND r.user_id = ?';
      params.push(user_id);
    }
    if (start_date) {
      query += ' AND DATE(r.start_time) >= DATE(?)';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND DATE(r.start_time) <= DATE(?)';
      params.push(end_date);
    }

    const countQuery = query.replace('SELECT r.*, ro.name as room_name, u.name as user_name', 'SELECT COUNT(*) as total');
    const { total } = await db.get(countQuery, ...params);

    query += ' ORDER BY r.start_time DESC LIMIT ? OFFSET ?';
    params.push(Number(page_size), (page - 1) * page_size);

    const reservations = await db.all(query, ...params);

    res.json({
      list: reservations,
      pagination: {
        page: Number(page),
        page_size: Number(page_size),
        total,
      },
    });
  } catch (err) {
    console.error('获取预约列表错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const isLibrarian = req.user.role === 'librarian';
    const result = await reservationService.cancelReservation(req.params.id, req.user.id, isLibrarian);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result.data);
  } catch (err) {
    console.error('取消预约错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/:id/check-in', auth, async (req, res) => {
  try {
    const result = await reservationService.checkIn(req.params.id, req.user.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result.data);
  } catch (err) {
    console.error('签到错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/:id/release', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { reason, remark } = req.body;

    const result = await reservationService.releaseReservation(
      req.params.id,
      req.user.id,
      'manual_release',
      reason || '馆员人工释放',
      remark || null
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result.data);
  } catch (err) {
    console.error('释放预约错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/:id/release-log', auth, async (req, res) => {
  try {
    const logs = await db.all(`
      SELECT rl.*, u.name as released_by_name
      FROM release_logs rl
      LEFT JOIN users u ON rl.released_by = u.id
      WHERE rl.reservation_id = ?
      ORDER BY rl.released_at DESC
    `, req.params.id);

    res.json(logs);
  } catch (err) {
    console.error('获取释放日志错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
