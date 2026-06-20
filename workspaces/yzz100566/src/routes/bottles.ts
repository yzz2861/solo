import { Router } from 'express';
import db from '../db';
import { ok, fail, serverError, getPagination } from '../utils';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { page, page_size, offset } = getPagination(req.query);
    const status = (req.query.status as string)?.trim();
    const kw = (req.query.keyword as string)?.trim();
    const where: string[] = [];
    const params: any[] = [];
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    if (kw) {
      where.push('barcode LIKE ?');
      params.push(`%${kw}%`);
    }
    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const list = db
      .prepare(
        `SELECT b.*,
          (SELECT COUNT(*) FROM sampling_records s WHERE s.bottle_id = b.id) as usage_count
         FROM sample_bottles b
         ${whereSQL}
         ORDER BY id DESC LIMIT ? OFFSET ?`
      )
      .all([...params, page_size, offset]);
    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM sample_bottles ${whereSQL}`).get(params) as any
    ).c;
    ok(res, { list, total, page, page_size, total_pages: Math.ceil(total / page_size) });
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/:id', (req, res) => {
  try {
    const r = db
      .prepare(
        `SELECT b.*,
          (SELECT COUNT(*) FROM sampling_records s WHERE s.bottle_id = b.id) as usage_count
         FROM sample_bottles b WHERE b.id=?`
      )
      .get(req.params.id);
    if (!r) return fail(res, '样瓶不存在', 404, 404);
    ok(res, r);
  } catch (e) {
    serverError(res, e);
  }
});

router.post('/', (req, res) => {
  try {
    const { barcode } = req.body || {};
    if (!barcode) return fail(res, 'barcode 必填');
    const exist = db.prepare('SELECT id, barcode, status FROM sample_bottles WHERE barcode=?').get(barcode);
    if (exist) {
      return fail(
        res,
        `条码重复，该条码已入库（ID:${(exist as any).id}，状态：${(exist as any).status}）`,
        409
      );
    }
    const info = db.prepare('INSERT INTO sample_bottles (barcode) VALUES (?)').run(barcode);
    ok(res, { id: info.lastInsertRowid, barcode }, '入库成功');
  } catch (e) {
    serverError(res, e);
  }
});

router.post('/batch', (req, res) => {
  try {
    const { barcodes, prefix, start, end, padding = 6 } = req.body || {};
    let list: string[] = [];
    if (Array.isArray(barcodes) && barcodes.length) {
      list = barcodes.map((b: string) => String(b).trim()).filter(Boolean);
    } else if (prefix && Number.isInteger(start) && Number.isInteger(end) && end >= start) {
      for (let i = start; i <= end; i++) {
        list.push(prefix + String(i).padStart(padding, '0'));
      }
    } else {
      return fail(res, '需要提供 barcodes 数组 或 prefix+start+end 范围');
    }
    if (list.length === 0) return fail(res, '条码列表为空');
    const insertStmt = db.prepare('INSERT OR IGNORE INTO sample_bottles (barcode) VALUES (?)');
    const checkStmt = db.prepare('SELECT barcode FROM sample_bottles WHERE barcode=?');
    const tx = db.transaction(() => {
      const duplicates: string[] = [];
      const inserted: string[] = [];
      for (const bc of list) {
        const ex = checkStmt.get(bc);
        if (ex) {
          duplicates.push(bc);
        } else {
          insertStmt.run(bc);
          inserted.push(bc);
        }
      }
      return { inserted, duplicates, total: list.length };
    });
    const result = tx();
    ok(res, result, `批量入库完成：成功${result.inserted.length}，重复${result.duplicates.length}`);
  } catch (e) {
    serverError(res, e);
  }
});

router.put('/:id', (req, res) => {
  try {
    const { barcode, status } = req.body || {};
    const exist: any = db.prepare('SELECT id FROM sample_bottles WHERE id=?').get(req.params.id);
    if (!exist) return fail(res, '样瓶不存在', 404, 404);
    if (barcode) {
      const other = db
        .prepare('SELECT id FROM sample_bottles WHERE barcode=? AND id<>?')
        .get(barcode, req.params.id);
      if (other) return fail(res, '条码已被占用', 409);
    }
    const validStatus = ['unused', 'used', 'discarded'];
    if (status && !validStatus.includes(status)) return fail(res, '无效的状态');
    db.prepare(
      `UPDATE sample_bottles SET barcode=COALESCE(?,barcode), status=COALESCE(?,status) WHERE id=?`
    ).run(barcode || null, status || null, req.params.id);
    ok(res, null, '更新成功');
  } catch (e) {
    serverError(res, e);
  }
});

export default router;
