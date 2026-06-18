const express = require('express');
const { all, get } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { success, fail } = require('../utils/response');

const router = express.Router();

router.get('/buildings', authMiddleware, async (req, res) => {
  try {
    const buildings = await all('SELECT * FROM buildings ORDER BY name');
    success(res, buildings);
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.get('/buildings/:id/rooms', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const rooms = await all('SELECT * FROM rooms WHERE building_id = ? ORDER BY floor, room_no', [id]);
    success(res, rooms);
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.get('/repair-types', authMiddleware, async (req, res) => {
  try {
    const types = await all('SELECT * FROM repair_types ORDER BY category, name');
    success(res, types);
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.get('/users/by-role', authMiddleware, async (req, res) => {
  try {
    const { role } = req.query;
    if (!role) return fail(res, 'role 参数必填');
    const users = await all(
      'SELECT id, username, real_name, phone FROM users WHERE role = ? ORDER BY real_name',
      [role]
    );
    success(res, users);
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

module.exports = router;
