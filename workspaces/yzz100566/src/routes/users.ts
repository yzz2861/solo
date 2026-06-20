import { Router } from 'express';
import db from '../db';
import { ok, fail, serverError } from '../utils';

const router = Router();

router.get('/', (req, res) => {
  try {
    const role = (req.query.role as string)?.trim();
    const where = role ? 'WHERE role = ?' : '';
    const params = role ? [role] : [];
    const list = db.prepare(`SELECT * FROM users ${where} ORDER BY id`).all(params);
    ok(res, list);
  } catch (e) {
    serverError(res, e);
  }
});

router.post('/', (req, res) => {
  try {
    const { username, display_name, role } = req.body || {};
    if (!username || !display_name || !role) return fail(res, '字段不完整');
    const valid = ['env_officer', 'lab', 'station_master'];
    if (!valid.includes(role)) return fail(res, 'role 无效');
    const exist = db.prepare('SELECT id FROM users WHERE username=?').get(username);
    if (exist) return fail(res, '用户名已存在');
    const info = db
      .prepare('INSERT INTO users (username, display_name, role) VALUES (?,?,?)')
      .run(username, display_name, role);
    ok(res, { id: info.lastInsertRowid }, '创建成功');
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/current', (req, res) => {
  try {
    const uid = req.header('X-User-Id');
    if (!uid) {
      return ok(res, {
        id: 1,
        username: 'env001',
        display_name: '张环保',
        role: 'env_officer',
      });
    }
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(uid);
    if (!u) return fail(res, '用户不存在', 404, 404);
    ok(res, u);
  } catch (e) {
    serverError(res, e);
  }
});

export default router;
