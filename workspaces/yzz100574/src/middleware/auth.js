const { get } = require('../db');

function authMiddleware(requiredRoles = []) {
  return async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: '未登录，请先登录' });
    }

    try {
      const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) {
        return res.status(401).json({ error: '用户不存在' });
      }

      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        return res.status(403).json({ error: '权限不足' });
      }

      req.user = user;
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = authMiddleware;
