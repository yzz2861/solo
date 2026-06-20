const jwt = require('jsonwebtoken');
const db = require('../database/db');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production');
    
    db.get('SELECT id, username, name, role, department FROM users WHERE id = ?', [decoded.userId])
      .then(user => {
        if (!user) {
          return res.status(401).json({ error: '用户不存在' });
        }
        req.user = user;
        next();
      })
      .catch(err => {
        res.status(500).json({ error: '认证失败' });
      });
  } catch (err) {
    return res.status(401).json({ error: '无效的认证令牌' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    next();
  };
};

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production',
    { expiresIn: '7d' }
  );
};

module.exports = { authenticate, requireRole, generateToken };
