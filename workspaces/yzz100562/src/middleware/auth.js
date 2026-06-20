const jwt = require('jsonwebtoken');
const { getDb, findById } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'repair-parts-secret-2024';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, technician_id: user.technician_id || null },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    const db = getDb();
    const user = findById(db, 'users', decoded.id);
    if (!user) return res.status(401).json({ error: '用户不存在' });
    req.user = { id: user.id, role: user.role, technician_id: user.technician_id || null, name: user.name };
    next();
  } catch (e) {
    return res.status(401).json({ error: '令牌无效或已过期' });
  }
}

function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: '未认证' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '无权限执行此操作' });
    }
    next();
  };
}

module.exports = { generateToken, authMiddleware, roleMiddleware, JWT_SECRET };
