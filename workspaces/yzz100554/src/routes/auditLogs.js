const express = require('express');
const { run, get, all } = require('../config/database');
const { authenticate, requireBoss } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireBoss, async (req, res) => {
  const { user_id, action, table_name, start_date, end_date, page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (user_id) {
    whereClause += ' AND al.user_id = ?';
    params.push(parseInt(user_id));
  }
  
  if (action) {
    whereClause += ' AND al.action LIKE ?';
    params.push(`%${action}%`);
  }
  
  if (table_name) {
    whereClause += ' AND al.table_name = ?';
    params.push(table_name);
  }
  
  if (start_date) {
    whereClause += ' AND al.created_at >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    whereClause += ' AND al.created_at <= ?';
    params.push(end_date);
  }
  
  const logs = await all(`
    SELECT al.*, u.name as user_name, u.username, u.role
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ${whereClause}
    ORDER BY al.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, parseInt(pageSize), parseInt(offset)]);
  
  const { total } = await get(`
    SELECT COUNT(*) as total FROM audit_logs al ${whereClause}
  `, params);
  
  const formattedLogs = logs.map(log => ({
    ...log,
    old_values: log.old_values ? JSON.parse(log.old_values) : null,
    new_values: log.new_values ? JSON.parse(log.new_values) : null
  }));
  
  res.json({
    data: formattedLogs,
    pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total }
  });
});

router.get('/record/:tableName/:recordId', authenticate, requireBoss, async (req, res) => {
  const { tableName, recordId } = req.params;
  const { page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  
  const logs = await all(`
    SELECT al.*, u.name as user_name, u.username, u.role
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.table_name = ? AND al.record_id = ?
    ORDER BY al.created_at DESC
    LIMIT ? OFFSET ?
  `, [tableName, parseInt(recordId), parseInt(pageSize), parseInt(offset)]);
  
  const { total } = await get(`
    SELECT COUNT(*) as total FROM audit_logs al
    WHERE al.table_name = ? AND al.record_id = ?
  `, [tableName, parseInt(recordId)]);
  
  const formattedLogs = logs.map(log => ({
    ...log,
    old_values: log.old_values ? JSON.parse(log.old_values) : null,
    new_values: log.new_values ? JSON.parse(log.new_values) : null
  }));
  
  res.json({
    data: formattedLogs,
    pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total }
  });
});

router.get('/statistics', authenticate, requireBoss, async (req, res) => {
  const { start_date, end_date } = req.query;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (start_date) {
    whereClause += ' AND al.created_at >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    whereClause += ' AND al.created_at <= ?';
    params.push(end_date);
  }
  
  const byAction = await all(`
    SELECT action, COUNT(*) as count
    FROM audit_logs al
    ${whereClause}
    GROUP BY action
    ORDER BY count DESC
  `, params);
  
  const byTableParams = [...params];
  const byTable = await all(`
    SELECT table_name, COUNT(*) as count
    FROM audit_logs al
    WHERE table_name IS NOT NULL
    ${whereClause.replace('WHERE 1=1', '')}
    GROUP BY table_name
    ORDER BY count DESC
  `, byTableParams);
  
  const byUserParams = [...params];
  const byUser = await all(`
    SELECT u.id, u.name, u.username, u.role, COUNT(*) as count
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.user_id IS NOT NULL
    ${whereClause.replace('WHERE 1=1', '')}
    GROUP BY u.id, u.name, u.username, u.role
    ORDER BY count DESC
  `, byUserParams);
  
  const { total } = await get(`
    SELECT COUNT(*) as total FROM audit_logs al ${whereClause}
  `, params);
  
  res.json({
    data: {
      total_operations: total,
      by_action: byAction,
      by_table: byTable,
      by_user: byUser
    }
  });
});

module.exports = router;
