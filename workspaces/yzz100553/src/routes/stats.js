const express = require('express');
const dayjs = require('dayjs');
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || dayjs().startOf('month').format('YYYY-MM-DD');
    const endDate = end_date || dayjs().endOf('month').format('YYYY-MM-DD');

    const totalReservations = await db.get(
      'SELECT COUNT(*) as count FROM reservations WHERE DATE(start_time) BETWEEN DATE(?) AND DATE(?)',
      startDate, endDate
    );

    const checkedInCount = await db.get(
      `SELECT COUNT(*) as count FROM reservations
       WHERE status = 'checked_in' AND DATE(start_time) BETWEEN DATE(?) AND DATE(?)`,
      startDate, endDate
    );

    const completedCount = await db.get(
      `SELECT COUNT(*) as count FROM reservations
       WHERE status = 'completed' AND DATE(start_time) BETWEEN DATE(?) AND DATE(?)`,
      startDate, endDate
    );

    const cancelledCount = await db.get(
      `SELECT COUNT(*) as count FROM reservations
       WHERE status = 'cancelled' AND DATE(start_time) BETWEEN DATE(?) AND DATE(?)`,
      startDate, endDate
    );

    const noShowCount = await db.get(
      `SELECT COUNT(*) as count FROM violations
       WHERE type = 'no_show' AND DATE(recorded_at) BETWEEN DATE(?) AND DATE(?)`,
      startDate, endDate
    );

    const releasedCount = await db.get(
      `SELECT COUNT(*) as count FROM release_logs
       WHERE release_type = 'manual_release' AND DATE(released_at) BETWEEN DATE(?) AND DATE(?)`,
      startDate, endDate
    );

    const autoReleaseCount = await db.get(
      `SELECT COUNT(*) as count FROM release_logs
       WHERE release_type = 'auto_release' AND DATE(released_at) BETWEEN DATE(?) AND DATE(?)`,
      startDate, endDate
    );

    const activeRooms = await db.get("SELECT COUNT(*) as count FROM rooms WHERE status = 'active'");

    const totalMinutesRow = await db.get(
      `SELECT SUM(
         (julianday(end_time) - julianday(start_time)) * 24 * 60
       ) as total_minutes
       FROM reservations
       WHERE status IN ('reserved', 'checked_in', 'completed')
         AND DATE(start_time) BETWEEN DATE(?) AND DATE(?)`,
      startDate, endDate
    );

    const totalMinutesBooked = totalMinutesRow.total_minutes || 0;
    const daysDiff = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
    const capacityMinutes = activeRooms.count * daysDiff * 8 * 60;
    const utilizationRate = capacityMinutes > 0
      ? ((totalMinutesBooked / capacityMinutes) * 100).toFixed(1)
      : 0;

    res.json({
      period: { start_date: startDate, end_date: endDate },
      total_reservations: totalReservations.count,
      checked_in_count: checkedInCount.count,
      completed_count: completedCount.count,
      cancelled_count: cancelledCount.count,
      no_show_count: noShowCount.count,
      manual_release_count: releasedCount.count,
      auto_release_count: autoReleaseCount.count,
      total_minutes_booked: Math.round(totalMinutesBooked),
      utilization_rate: Number(utilizationRate),
      active_rooms: activeRooms.count,
    });
  } catch (err) {
    console.error('获取概览统计错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/rooms', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || dayjs().startOf('month').format('YYYY-MM-DD');
    const endDate = end_date || dayjs().endOf('month').format('YYYY-MM-DD');

    const rooms = await db.all(
      `SELECT r.id, r.name, r.capacity, r.location,
         COUNT(res.id) as reservation_count,
         SUM(CASE WHEN res.status = 'checked_in' OR res.status = 'completed' THEN 1 ELSE 0 END) as used_count,
         SUM(CASE WHEN res.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
         SUM(
           CASE WHEN res.status IN ('checked_in', 'completed')
           THEN (julianday(res.end_time) - julianday(res.start_time)) * 24 * 60
           ELSE 0 END
         ) as used_minutes
       FROM rooms r
       LEFT JOIN reservations res ON r.id = res.room_id
         AND DATE(res.start_time) BETWEEN DATE(?) AND DATE(?)
       WHERE r.status = 'active'
       GROUP BY r.id
       ORDER BY reservation_count DESC`,
      startDate, endDate
    );

    const daysDiff = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;

    const result = rooms.map(room => {
      const capacityMinutes = daysDiff * 8 * 60;
      const usedMinutes = room.used_minutes || 0;
      const utilizationRate = capacityMinutes > 0
        ? ((usedMinutes / capacityMinutes) * 100).toFixed(1)
        : 0;

      return {
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        location: room.location,
        reservation_count: room.reservation_count,
        used_count: room.used_count,
        cancelled_count: room.cancelled_count,
        used_minutes: Math.round(usedMinutes),
        utilization_rate: Number(utilizationRate),
      };
    });

    res.json(result);
  } catch (err) {
    console.error('获取房间统计错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/no-shows', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || dayjs().startOf('month').format('YYYY-MM-DD');
    const endDate = end_date || dayjs().endOf('month').format('YYYY-MM-DD');

    const violations = await db.all(
      `SELECT v.*, u.name as user_name, u.username,
         r.start_time, r.end_time, ro.name as room_name
       FROM violations v
       JOIN users u ON v.user_id = u.id
       JOIN reservations r ON v.reservation_id = r.id
       JOIN rooms ro ON r.room_id = ro.id
       WHERE v.type = 'no_show'
         AND DATE(v.recorded_at) BETWEEN DATE(?) AND DATE(?)
       ORDER BY v.recorded_at DESC`,
      startDate, endDate
    );

    res.json(violations);
  } catch (err) {
    console.error('获取爽约记录错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/releases', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { start_date, end_date, type } = req.query;
    const startDate = start_date || dayjs().startOf('month').format('YYYY-MM-DD');
    const endDate = end_date || dayjs().endOf('month').format('YYYY-MM-DD');

    let query = `
      SELECT rl.*, u.name as released_by_name,
        res.start_time, res.end_time, ro.name as room_name,
        res_u.name as user_name
      FROM release_logs rl
      LEFT JOIN users u ON rl.released_by = u.id
      JOIN reservations res ON rl.reservation_id = res.id
      JOIN rooms ro ON res.room_id = ro.id
      JOIN users res_u ON res.user_id = res_u.id
      WHERE DATE(rl.released_at) BETWEEN DATE(?) AND DATE(?)
    `;
    const params = [startDate, endDate];

    if (type) {
      query += ' AND rl.release_type = ?';
      params.push(type);
    }

    query += ' ORDER BY rl.released_at DESC';

    const logs = await db.all(query, ...params);
    res.json(logs);
  } catch (err) {
    console.error('获取释放记录错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/blacklist-suggestions', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { min_violations = 2 } = req.query;

    const users = await db.all(
      `SELECT u.id, u.username, u.name, u.phone, u.email,
         u.violation_count, u.blacklisted_until,
         COUNT(v.id) as recent_violations
       FROM users u
       LEFT JOIN violations v ON u.id = v.user_id
         AND v.recorded_at >= datetime('now', '-30 days')
       WHERE u.role = 'student'
         AND u.violation_count >= ?
       GROUP BY u.id
       ORDER BY u.violation_count DESC`,
      Number(min_violations)
    );

    const suggestions = users.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      email: user.email,
      violation_count: user.violation_count,
      recent_violations: user.recent_violations,
      blacklisted_until: user.blacklisted_until,
      is_currently_blacklisted: !!user.blacklisted_until && dayjs(user.blacklisted_until).isAfter(dayjs()),
      suggestion: user.violation_count >= 3 ? '建议加入黑名单' : '需重点关注',
    }));

    res.json(suggestions);
  } catch (err) {
    console.error('获取黑名单建议错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/daily', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || dayjs().startOf('month').format('YYYY-MM-DD');
    const endDate = end_date || dayjs().endOf('month').format('YYYY-MM-DD');

    const dailyStats = await db.all(
      `SELECT
         DATE(start_time) as date,
         COUNT(*) as total_reservations,
         SUM(CASE WHEN status IN ('checked_in', 'completed') THEN 1 ELSE 0 END) as used_count,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
         SUM(
           CASE WHEN status IN ('checked_in', 'completed')
           THEN (julianday(end_time) - julianday(start_time)) * 24 * 60
           ELSE 0 END
         ) as used_minutes
       FROM reservations
       WHERE DATE(start_time) BETWEEN DATE(?) AND DATE(?)
       GROUP BY DATE(start_time)
       ORDER BY date ASC`,
      startDate, endDate
    );

    res.json(dailyStats);
  } catch (err) {
    console.error('获取每日统计错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
