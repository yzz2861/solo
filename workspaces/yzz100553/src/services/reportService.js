const { createObjectCsvStringifier } = require('csv-writer');
const db = require('../config/database');

const generateMonthlyReport = async (startDate, endDate) => {
  const overview = await db.get(
    `SELECT
       COUNT(*) as total_reservations,
       SUM(CASE WHEN status IN ('checked_in', 'completed') THEN 1 ELSE 0 END) as used_count,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
       SUM(CASE WHEN status = 'released' THEN 1 ELSE 0 END) as released_count
     FROM reservations
     WHERE DATE(start_time) BETWEEN DATE(?) AND DATE(?)`,
    startDate, endDate
  );

  const noShowRow = await db.get(
    `SELECT COUNT(*) as count FROM violations
     WHERE type = 'no_show' AND DATE(recorded_at) BETWEEN DATE(?) AND DATE(?)`,
    startDate, endDate
  );

  const manualReleaseRow = await db.get(
    `SELECT COUNT(*) as count FROM release_logs
     WHERE release_type = 'manual_release' AND DATE(released_at) BETWEEN DATE(?) AND DATE(?)`,
    startDate, endDate
  );

  return {
    overview: {
      ...overview,
      no_show_count: noShowRow.count,
      manual_release_count: manualReleaseRow.count,
    },
  };
};

const exportReservationsCsv = async (startDate, endDate) => {
  const reservations = await db.all(
    `SELECT r.id, ro.name as room_name, u.name as user_name, u.username,
       r.contact_name, r.contact_phone, r.group_size,
       r.start_time, r.end_time, r.status, r.checked_in_at,
       r.purpose, r.created_at
     FROM reservations r
     JOIN rooms ro ON r.room_id = ro.id
     JOIN users u ON r.user_id = u.id
     WHERE DATE(r.start_time) BETWEEN DATE(?) AND DATE(?)
     ORDER BY r.start_time ASC`,
    startDate, endDate
  );

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'id', title: '预约ID' },
      { id: 'room_name', title: '房间名称' },
      { id: 'user_name', title: '预约人' },
      { id: 'username', title: '学号/工号' },
      { id: 'contact_name', title: '联系人' },
      { id: 'contact_phone', title: '联系电话' },
      { id: 'group_size', title: '小组人数' },
      { id: 'start_time', title: '开始时间' },
      { id: 'end_time', title: '结束时间' },
      { id: 'status', title: '状态' },
      { id: 'checked_in_at', title: '签到时间' },
      { id: 'purpose', title: '用途' },
      { id: 'created_at', title: '创建时间' },
    ],
  });

  const statusMap = {
    reserved: '已预约',
    checked_in: '已签到',
    completed: '已完成',
    cancelled: '已取消',
    released: '已释放',
  };

  const records = reservations.map(r => ({
    ...r,
    status: statusMap[r.status] || r.status,
  }));

  return '\uFEFF' + csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
};

const exportViolationsCsv = async (startDate, endDate) => {
  const violations = await db.all(
    `SELECT v.id, u.name as user_name, u.username,
       ro.name as room_name, r.start_time, r.end_time,
       v.type, v.description, v.recorded_at
     FROM violations v
     JOIN users u ON v.user_id = u.id
     JOIN reservations r ON v.reservation_id = r.id
     JOIN rooms ro ON r.room_id = ro.id
     WHERE DATE(v.recorded_at) BETWEEN DATE(?) AND DATE(?)
     ORDER BY v.recorded_at ASC`,
    startDate, endDate
  );

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'id', title: '记录ID' },
      { id: 'user_name', title: '用户姓名' },
      { id: 'username', title: '学号/工号' },
      { id: 'room_name', title: '房间' },
      { id: 'start_time', title: '预约开始时间' },
      { id: 'end_time', title: '预约结束时间' },
      { id: 'type', title: '违规类型' },
      { id: 'description', title: '描述' },
      { id: 'recorded_at', title: '记录时间' },
    ],
  });

  const typeMap = {
    no_show: '爽约',
    manual_blacklist: '人工加入黑名单',
    overtime: '超时',
    other: '其他',
  };

  const records = violations.map(v => ({
    ...v,
    type: typeMap[v.type] || v.type,
  }));

  return '\uFEFF' + csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
};

const exportReleaseLogsCsv = async (startDate, endDate) => {
  const logs = await db.all(
    `SELECT rl.id, ro.name as room_name,
       res_u.name as user_name, res_u.username,
       res.start_time, res.end_time,
       rl.release_type, rl.reason, rl.remark,
       u.name as released_by_name, rl.released_at
     FROM release_logs rl
     JOIN reservations res ON rl.reservation_id = res.id
     JOIN rooms ro ON res.room_id = ro.id
     JOIN users res_u ON res.user_id = res_u.id
     LEFT JOIN users u ON rl.released_by = u.id
     WHERE DATE(rl.released_at) BETWEEN DATE(?) AND DATE(?)
     ORDER BY rl.released_at ASC`,
    startDate, endDate
  );

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'id', title: '记录ID' },
      { id: 'room_name', title: '房间' },
      { id: 'user_name', title: '预约人' },
      { id: 'username', title: '学号/工号' },
      { id: 'start_time', title: '预约开始' },
      { id: 'end_time', title: '预约结束' },
      { id: 'release_type', title: '释放类型' },
      { id: 'reason', title: '释放原因' },
      { id: 'remark', title: '备注' },
      { id: 'released_by_name', title: '操作人' },
      { id: 'released_at', title: '释放时间' },
    ],
  });

  const typeMap = {
    auto_release: '系统自动释放',
    manual_release: '人工释放',
    user_cancel: '用户取消',
  };

  const records = logs.map(l => ({
    ...l,
    release_type: typeMap[l.release_type] || l.release_type,
  }));

  return '\uFEFF' + csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
};

module.exports = {
  generateMonthlyReport,
  exportReservationsCsv,
  exportViolationsCsv,
  exportReleaseLogsCsv,
};
