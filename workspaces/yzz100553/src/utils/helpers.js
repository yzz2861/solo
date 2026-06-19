const dayjs = require('dayjs');

const validateTimeRange = (startTime, endTime) => {
  const start = dayjs(startTime);
  const end = dayjs(endTime);

  if (!start.isValid() || !end.isValid()) {
    return { valid: false, message: '时间格式无效' };
  }

  if (end.isBefore(start) || end.isSame(start)) {
    return { valid: false, message: '结束时间必须晚于开始时间' };
  }

  if (start.isBefore(dayjs())) {
    return { valid: false, message: '预约开始时间不能早于当前时间' };
  }

  const durationMinutes = end.diff(start, 'minute');
  if (durationMinutes < 30) {
    return { valid: false, message: '预约时长最少为30分钟' };
  }

  if (durationMinutes > 240) {
    return { valid: false, message: '单次预约最长4小时' };
  }

  return { valid: true };
};

const formatReservation = (row) => {
  if (!row) return null;
  return {
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
  };
};

module.exports = { validateTimeRange, formatReservation };
