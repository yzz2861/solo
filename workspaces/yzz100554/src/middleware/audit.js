const { run } = require('../config/database');

const auditLog = (action, tableName) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
          const recordId = parsedData?.data?.id || parsedData?.id || req.params?.id || null;
          
          run(`
            INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            req.user.id,
            action,
            tableName,
            recordId,
            JSON.stringify(req.body),
            req.ip,
            req.headers['user-agent']
          ]).catch(err => {
            console.error('审计日志记录失败:', err);
          });
        } catch (err) {
          console.error('审计日志记录失败:', err);
        }
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

const logAction = async (action, tableName, recordId, oldValues = null, newValues = null, userId) => {
  try {
    await run(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId,
      action,
      tableName,
      recordId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null
    ]);
  } catch (err) {
    console.error('审计日志记录失败:', err);
  }
};

module.exports = {
  auditLog,
  logAction
};
