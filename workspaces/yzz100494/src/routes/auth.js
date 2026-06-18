const express = require('express');
const bcrypt = require('bcryptjs');
const { get } = require('../db');
const { signToken, authMiddleware } = require('../middleware/auth');
const { success, fail } = require('../utils/response');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return fail(res, '用户名和密码不能为空');

    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return fail(res, '用户不存在', 404, 404);

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return fail(res, '密码错误', 401, 401);

    const token = signToken({ id: user.id, username: user.username, role: user.role });
    success(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        real_name: user.real_name,
        role: user.role,
        phone: user.phone,
        student_no: user.student_no
      }
    }, '登录成功');
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.get('/me', authMiddleware, (req, res) => {
  success(res, req.user);
});

module.exports = router;
