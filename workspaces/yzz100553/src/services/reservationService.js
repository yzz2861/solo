const dayjs = require('dayjs');
const db = require('../config/database');
const config = require('../config');
const { validateTimeRange } = require('../utils/helpers');

const checkTimeConflict = async (roomId, startTime, endTime, excludeId = null) => {
  let query = `
    SELECT COUNT(*) as count FROM reservations
    WHERE room_id = ?
      AND status IN ('reserved', 'checked_in')
      AND start_time < ?
      AND end_time > ?
  `;
  const params = [roomId, endTime, startTime];

  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }

  const result = await db.get(query, ...params);
  return result.count > 0;
};

const hasActiveOverlappingReservation = async (userId, startTime, endTime, excludeId = null) => {
  let query = `
    SELECT COUNT(*) as count FROM reservations
    WHERE user_id = ?
      AND status IN ('reserved', 'checked_in')
      AND start_time < ?
      AND end_time > ?
  `;
  const params = [userId, endTime, startTime];

  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }

  const result = await db.get(query, ...params);
  return result.count > 0;
};

const isUserBlacklisted = async (userId) => {
  const user = await db.get('SELECT blacklisted_until, violation_count FROM users WHERE id = ?', userId);
  if (!user) return { blacklisted: true, reason: '用户不存在' };

  if (user.blacklisted_until && dayjs(user.blacklisted_until).isAfter(dayjs())) {
    return {
      blacklisted: true,
      reason: `账号已被限制预约，解封时间：${user.blacklisted_until}`,
      remainingDays: dayjs(user.blacklisted_until).diff(dayjs(), 'day') + 1,
    };
  }

  return { blacklisted: false, violationCount: user.violation_count };
};

const createReservation = async ({ roomId, userId, contactName, contactPhone, groupSize, startTime, endTime, purpose }) => {
  const timeValidation = validateTimeRange(startTime, endTime);
  if (!timeValidation.valid) {
    return { success: false, error: timeValidation.message };
  }

  const room = await db.get('SELECT * FROM rooms WHERE id = ? AND status = "active"', roomId);
  if (!room) {
    return { success: false, error: '房间不存在或不可用' };
  }

  if (groupSize < 1) {
    return { success: false, error: '小组人数至少1人' };
  }

  if (groupSize > room.capacity) {
    return { success: false, error: `小组人数超过房间容量（最多${room.capacity}人）` };
  }

  const blacklistCheck = await isUserBlacklisted(userId);
  if (blacklistCheck.blacklisted) {
    return { success: false, error: blacklistCheck.reason };
  }

  const hasConflict = await checkTimeConflict(roomId, startTime, endTime);
  if (hasConflict) {
    return { success: false, error: '该时段房间已被预约' };
  }

  const hasOverlap = await hasActiveOverlappingReservation(userId, startTime, endTime);
  if (hasOverlap) {
    return { success: false, error: '您在该时段已有其他预约，不能同时占用多个房间' };
  }

  const checkInDeadline = dayjs(startTime).add(config.checkInWindowMinutes, 'minute').format('YYYY-MM-DD HH:mm:ss');

  const result = await db.run(
    `INSERT INTO reservations (
      room_id, user_id, contact_name, contact_phone, group_size,
      start_time, end_time, check_in_deadline, purpose
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    roomId, userId, contactName, contactPhone, groupSize,
    startTime, endTime, checkInDeadline, purpose || null
  );

  const reservation = await getReservationById(result.lastID);
  return { success: true, data: reservation };
};

const getReservationById = async (id) => {
  const row = await db.get(`
    SELECT r.*, ro.name as room_name, u.name as user_name
    FROM reservations r
    JOIN rooms ro ON r.room_id = ro.id
    JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `, id);

  return row ? {
    id: row.id,
    room_id: row.room_id,
    room_name: row.room_name,
    user_id: row.user_id,
    user_name: row.user_name,
    contact_name: row.contact_name,
    contact_phone: row.contact_phone,
    group_size: row.group_size,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status,
    checked_in_at: row.checked_in_at,
    check_in_deadline: row.check_in_deadline,
    purpose: row.purpose,
    created_at: row.created_at,
  } : null;
};

const cancelReservation = async (reservationId, userId, isLibrarian = false) => {
  const reservation = await db.get('SELECT * FROM reservations WHERE id = ?', reservationId);

  if (!reservation) {
    return { success: false, error: '预约不存在' };
  }

  if (!isLibrarian && reservation.user_id !== userId) {
    return { success: false, error: '无权取消他人预约' };
  }

  if (reservation.status !== 'reserved' && reservation.status !== 'checked_in') {
    return { success: false, error: '该预约状态无法取消' };
  }

  await db.run(
    'UPDATE reservations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    'cancelled', reservationId
  );

  await db.run(
    'INSERT INTO release_logs (reservation_id, released_by, release_type, reason) VALUES (?, ?, ?, ?)',
    reservationId, userId, 'user_cancel', isLibrarian ? '馆员取消' : '用户主动取消'
  );

  const updated = await getReservationById(reservationId);
  return { success: true, data: updated };
};

const checkIn = async (reservationId, userId) => {
  const reservation = await db.get('SELECT * FROM reservations WHERE id = ?', reservationId);

  if (!reservation) {
    return { success: false, error: '预约不存在' };
  }

  if (reservation.user_id !== userId) {
    return { success: false, error: '无权为他人预约签到' };
  }

  if (reservation.status !== 'reserved') {
    return { success: false, error: `当前状态为${reservation.status}，无法签到` };
  }

  const now = dayjs();
  const deadline = dayjs(reservation.check_in_deadline);

  if (now.isAfter(deadline)) {
    return { success: false, error: '已超过签到截止时间，预约已失效' };
  }

  if (now.isBefore(dayjs(reservation.start_time).subtract(10, 'minute'))) {
    return { success: false, error: '签到时间未到，请在预约开始前10分钟内签到' };
  }

  await db.run(
    `UPDATE reservations
     SET status = 'checked_in', checked_in_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    reservationId
  );

  const updated = await getReservationById(reservationId);
  return { success: true, data: updated };
};

const releaseReservation = async (reservationId, releasedBy, releaseType, reason, remark = null) => {
  const reservation = await db.get('SELECT * FROM reservations WHERE id = ?', reservationId);

  if (!reservation) {
    return { success: false, error: '预约不存在' };
  }

  if (reservation.status !== 'reserved' && reservation.status !== 'checked_in') {
    return { success: false, error: '该预约已结束或已取消' };
  }

  await db.run(
    "UPDATE reservations SET status = 'released', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    reservationId
  );

  await db.run(
    'INSERT INTO release_logs (reservation_id, released_by, release_type, reason, remark) VALUES (?, ?, ?, ?, ?)',
    reservationId, releasedBy, releaseType, reason, remark
  );

  const updated = await getReservationById(reservationId);
  return { success: true, data: updated };
};

const addViolation = async (userId, reservationId, type, description) => {
  await db.run(
    'INSERT INTO violations (user_id, reservation_id, type, description) VALUES (?, ?, ?, ?)',
    userId, reservationId, type, description
  );

  const user = await db.get('SELECT violation_count FROM users WHERE id = ?', userId);
  const newCount = (user?.violation_count || 0) + 1;

  let blacklistedUntil = null;
  if (newCount >= config.maxViolationsBeforeBlacklist) {
    blacklistedUntil = dayjs().add(config.blacklistDays, 'day').format('YYYY-MM-DD HH:mm:ss');
  }

  await db.run(
    `UPDATE users
     SET violation_count = ?,
         blacklisted_until = COALESCE(?, blacklisted_until),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    newCount, blacklistedUntil, userId
  );

  return { violationCount: newCount, blacklistedUntil };
};

const processNoShow = async (reservationId) => {
  const reservation = await db.get('SELECT * FROM reservations WHERE id = ?', reservationId);
  if (!reservation || reservation.status !== 'reserved') return false;

  const releaseResult = await releaseReservation(
    reservationId,
    null,
    'auto_release',
    '未按时签到，系统自动释放'
  );

  if (releaseResult.success) {
    await addViolation(
      reservation.user_id,
      reservationId,
      'no_show',
      `预约${reservation.start_time}至${reservation.end_time}未按时签到`
    );
  }

  return releaseResult.success;
};

const checkAndReleaseExpired = async () => {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

  const expired = await db.all(
    `SELECT * FROM reservations
     WHERE status = 'reserved'
       AND check_in_deadline <= ?`,
    now
  );

  let count = 0;
  for (const reservation of expired) {
    const ok = await processNoShow(reservation.id);
    if (ok) count++;
  }

  return count;
};

module.exports = {
  checkTimeConflict,
  hasActiveOverlappingReservation,
  isUserBlacklisted,
  createReservation,
  getReservationById,
  cancelReservation,
  checkIn,
  releaseReservation,
  addViolation,
  processNoShow,
  checkAndReleaseExpired,
};
