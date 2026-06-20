import { Router } from 'express';
import db from '../db';
import { ok, fail, serverError, getPagination } from '../utils';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { page, page_size, offset } = getPagination(req.query);
    const kw = (req.query.keyword as string)?.trim();
    const where = kw ? 'WHERE code LIKE ? OR name LIKE ?' : '';
    const params = kw ? [`%${kw}%`, `%${kw}%`] : [];
    const list = db
      .prepare(`SELECT * FROM outlets ${where} ORDER BY id LIMIT ? OFFSET ?`)
      .all([...params, page_size, offset]);
    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM outlets ${where}`).get(params) as any
    ).c;
    ok(res, { list, total, page, page_size, total_pages: Math.ceil(total / page_size) });
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/:id', (req, res) => {
  try {
    const r = db.prepare('SELECT * FROM outlets WHERE id=?').get(req.params.id);
    if (!r) return fail(res, '排口不存在', 404, 404);
    ok(res, r);
  } catch (e) {
    serverError(res, e);
  }
});

router.post('/', (req, res) => {
  try {
    const { code, name, description } = req.body || {};
    if (!code || !name) return fail(res, 'code 和 name 必填');
    const exist = db.prepare('SELECT id FROM outlets WHERE code=?').get(code);
    if (exist) return fail(res, '排口编码已存在');
    const info = db
      .prepare('INSERT INTO outlets (code,name,description) VALUES (?,?,?)')
      .run(code, name, description || null);
    ok(res, { id: info.lastInsertRowid }, '创建成功');
  } catch (e) {
    serverError(res, e);
  }
});

router.put('/:id', (req, res) => {
  try {
    const { code, name, description } = req.body || {};
    const exist = db.prepare('SELECT id FROM outlets WHERE id=?').get(req.params.id);
    if (!exist) return fail(res, '排口不存在', 404, 404);
    if (code) {
      const other = db
        .prepare('SELECT id FROM outlets WHERE code=? AND id<>?')
        .get(code, req.params.id);
      if (other) return fail(res, '排口编码已被占用');
    }
    db.prepare(
      `UPDATE outlets SET code=COALESCE(?,code), name=COALESCE(?,name), description=? WHERE id=?`
    ).run(code || null, name || null, description ?? undefined, req.params.id);
    ok(res, null, '更新成功');
  } catch (e) {
    serverError(res, e);
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM outlets WHERE id=?').run(req.params.id);
    ok(res, null, '删除成功');
  } catch (e) {
    serverError(res, e);
  }
});

export default router;
