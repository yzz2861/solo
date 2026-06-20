const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'access_card_service_jwt_secret_key_2024';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      realName: user.real_name
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: '认证令牌无效或已过期' });
  }
}

function roleMiddleware(...allowedRoles) {
  return function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足，该操作需要以下角色之一: ' + allowedRoles.join(', ') });
    }
    
    next();
  };
}

function logOperation(userId, action, targetType, targetId, details, ipAddress) {
  try {
    db.prepare(`
      INSERT INTO operation_logs (user_id, action, target_type, target_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, action, targetType, targetId, JSON.stringify(details), ipAddress);
  } catch (err) {
    console.error('操作日志记录失败:', err);
  }
}

module.exports = {
  generateToken,
  authMiddleware,
  roleMiddleware,
  logOperation
};
