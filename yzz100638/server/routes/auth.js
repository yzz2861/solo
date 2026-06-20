const express = require('express');
const router = express.Router();
const DataStore = require('../store/dataStore');

const dataStore = new DataStore();

router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: '用户名不能为空' });
    }

    const user = await dataStore.getUserByUsername(username);

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

module.exports = router;
