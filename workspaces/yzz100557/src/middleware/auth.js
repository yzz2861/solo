const express = require('express');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db/singleton');

const JWT_SECRET = process.env.JWT_SECRET || 'catering-inspection-secret-key-2024';

function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    supplier_id: user.supplier_id
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  const token = authHeader.substring(7);
  (async () => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const db = await getDB();
      const user = db.prepare('SELECT id, username, name, role, supplier_id, token FROM users WHERE id = ?').get(decoded.id);
      if (!user) {
        return res.status(401).json({ error: '用户不存在' });
      }
      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({ error: '认证令牌无效或已过期: ' + err.message });
    }
  })();
}

function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '请先登录' });
    }
    if (!roles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({ error: `需要以下角色权限: ${roles.join(', ')}` });
    }
    next();
  };
}

function supplierOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: '请先登录' });
  }
  if (req.user.role === 'admin') return next();
  if (req.user.role !== 'supplier' || !req.user.supplier_id) {
    return res.status(403).json({ error: '仅供应商可访问此接口' });
  }
  next();
}

module.exports = {
  generateToken,
  authRequired,
  roleRequired,
  supplierOnly,
  JWT_SECRET
};
