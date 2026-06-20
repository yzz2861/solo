import { Router } from 'express';
import db, { nowStr } from '../db';
import { ok, fail, serverError, getPagination, refreshOverdueFlags } from '../utils';

const router = Router();

router.use((_req, _res, next) => {
  try {
    refreshOverdueFlags();
  } catch (e) {
    console.warn('refresh overdue failed', e);
  }
  next();
});

router.get('/', (req, res) => {
  try {
    const { page, page_size, offset } = getPagination(req.query);
    const { alert_type, alert_level, acknowledged, sampling_id } = req.query as any;
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (alert_type) {
      where.push('alert_type = ?');
      params.push(alert_type);
    }
    if (alert_level) {
      where.push('alert_level = ?');
      params.push(alert_level);
    }
    if (acknowledged === '0' || acknowledged === '1') {
      where.push('acknowledged = ?');
      params.push(Number(acknowledged));
    }
    if (sampling_id) {
      where.push('sampling_id = ?');
      params.push(Number(sampling_id));
    }
    const whereSQL = where.join(' AND ');
    const list = db
      .prepare(
        `SELECT a.*, s.barcode, s.outlet_name, s.status as sample_status
         FROM alert_records a
         LEFT JOIN sampling_records s ON s.id = a.sampling_id
         WHERE ${whereSQL}
         ORDER BY a.id DESC
         LIMIT ? OFFSET ?`
      )
      .all([...params, page_size, offset]);
    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM alert_records a WHERE ${whereSQL}`).get(params) as any
    ).c;
    ok(res, { list, total, page, page_size, total_pages: Math.ceil(total / page_size) });
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/summary', (_req, res) => {
  try {
    const unacked = db
      .prepare(
        `SELECT alert_type, alert_level, COUNT(*) as count
         FROM alert_records
         WHERE acknowledged = 0
         GROUP BY alert_type, alert_level`
      )
      .all();
    const stats: any = {
      total_unacked: 0,
      preservation: 0,
      dispatch: 0,
      lab_sla: 0,
      re_sample: 0,
      by_level: { warning: 0, critical: 0 },
      details: unacked,
    };
    for (const r of unacked as any[]) {
      stats.total_unacked += r.count;
      if (stats[r.alert_type] !== undefined) stats[r.alert_type] += r.count;
      if (stats.by_level[r.alert_level] !== undefined) stats.by_level[r.alert_level] += r.count;
    }
    ok(res, stats);
  } catch (e) {
    serverError(res, e);
  }
});

router.post('/:id/ack', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { acknowledged_by } = req.body || {};
    const exist = db.prepare('SELECT id FROM alert_records WHERE id=?').get(id);
    if (!exist) return fail(res, '提醒不存在', 404, 404);
    db.prepare(
      `UPDATE alert_records
       SET acknowledged=1, acknowledged_by=?, acknowledged_at=?
       WHERE id=?`
    ).run(acknowledged_by || 'system', nowStr(), id);
    ok(res, { id }, '已确认');
  } catch (e) {
    serverError(res, e);
  }
});

router.post('/ack-all', (req, res) => {
  try {
    const { acknowledged_by, alert_type } = req.body || {};
    const where: string[] = ['acknowledged = 0'];
    const params: any[] = [];
    if (alert_type) {
      where.push('alert_type = ?');
      params.push(alert_type);
    }
    const whereSQL = where.join(' AND ');
    const stmt = db.prepare(
      `UPDATE alert_records
       SET acknowledged=1, acknowledged_by=?, acknowledged_at=?
       WHERE ${whereSQL}`
    );
    const info = stmt.run(acknowledged_by || 'system', nowStr(), ...params);
    ok(res, { ack_count: info.changes }, `已确认 ${info.changes} 条`);
  } catch (e) {
    serverError(res, e);
  }
});

export default router;
