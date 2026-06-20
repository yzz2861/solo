import { Router } from 'express';
import db from '../db';
import { ok, serverError, getPagination, refreshOverdueFlags } from '../utils';

const router = Router();

router.use((_req, _res, next) => {
  try {
    refreshOverdueFlags();
  } catch (e) {
    console.warn(e);
  }
  next();
});

router.get('/env/pending-dispatch', (req, res) => {
  try {
    const { page, page_size, offset } = getPagination(req.query);
    const { sampler_id } = req.query as any;
    const where: string[] = ["s.status IN ('sampled','re_sampled')"];
    const params: any[] = [];
    if (sampler_id) {
      where.push('s.sampler_id = ?');
      params.push(Number(sampler_id));
    }
    const whereSQL = where.join(' AND ');
    const list = db
      .prepare(
        `SELECT s.id, s.barcode, s.outlet_code, s.outlet_name,
                s.sampled_at, s.sampler, s.sampler_id, s.status,
                s.preservation_deadline, s.is_sample_overdue,
                s.dispatch_deadline, s.is_dispatch_overdue,
                s.is_re_sample, s.parent_sampling_id,
                CASE WHEN s.is_sample_overdue=1 THEN '保存超期'
                     WHEN s.is_dispatch_overdue=1 THEN '送检超期'
                     ELSE '正常' END as flag
         FROM sampling_records s
         WHERE ${whereSQL}
         ORDER BY s.is_sample_overdue DESC, s.is_dispatch_overdue DESC, s.sampled_at ASC
         LIMIT ? OFFSET ?`
      )
      .all([...params, page_size, offset]);
    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM sampling_records s WHERE ${whereSQL}`).get(params) as any
    ).c;
    const overdue_count = (
      db.prepare(
        `SELECT COUNT(*) as c FROM sampling_records s
         WHERE ${whereSQL} AND (s.is_sample_overdue=1 OR s.is_dispatch_overdue=1)`
      ).get(params) as any
    ).c;
    ok(res, {
      list,
      total,
      overdue_count,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    });
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/env/re-sampling', (req, res) => {
  try {
    const { page, page_size, offset } = getPagination(req.query);
    const list = db
      .prepare(
        `SELECT r.id as rejection_id, r.sampling_id, r.rejected_at, r.rejected_by,
                r.reject_reason, r.re_sample_requirement, r.re_sample_deadline,
                r.re_sample_completed, r.re_sample_sampling_id,
                s.barcode, s.outlet_name, s.sampled_at, s.sampler,
                CASE WHEN r.re_sample_completed=1 THEN '已补采'
                     WHEN datetime('now') > r.re_sample_deadline THEN '补采超期'
                     ELSE '待补采' END as status
         FROM rejection_records r
         LEFT JOIN sampling_records s ON s.id = r.sampling_id
         ORDER BY r.re_sample_completed ASC, r.re_sample_deadline ASC
         LIMIT ? OFFSET ?`
      )
      .all([page_size, offset]);
    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM rejection_records`).get() as any
    ).c;
    const pending_count = (
      db.prepare(`SELECT COUNT(*) as c FROM rejection_records WHERE re_sample_completed=0`).get() as any
    ).c;
    ok(res, {
      list,
      total,
      pending_count,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    });
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/lab/pending-receive', (req, res) => {
  try {
    const { page, page_size, offset } = getPagination(req.query);
    const list = db
      .prepare(
        `SELECT s.id, s.barcode, s.outlet_code, s.outlet_name,
                s.sampled_at, s.sampler,
                s.dispatched_at, s.dispatcher,
                s.preservation_deadline, s.is_sample_overdue,
                'dispatched' as status
         FROM sampling_records s
         WHERE s.status='dispatched'
         ORDER BY s.dispatched_at ASC
         LIMIT ? OFFSET ?`
      )
      .all([page_size, offset]);
    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM sampling_records WHERE status='dispatched'`).get() as any
    ).c;
    ok(res, { list, total, page, page_size, total_pages: Math.ceil(total / page_size) });
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/lab/pending-result', (req, res) => {
  try {
    const { page, page_size, offset } = getPagination(req.query);
    const list = db
      .prepare(
        `SELECT s.id, s.barcode, s.outlet_code, s.outlet_name,
                s.sampled_at, s.lab_received_at, s.lab_operator,
                s.lab_sla_deadline, s.is_lab_overdue, s.status
         FROM sampling_records s
         WHERE s.status IN ('received','resulted') AND s.result_reported_at IS NULL
         ORDER BY s.is_lab_overdue DESC, s.lab_sla_deadline ASC
         LIMIT ? OFFSET ?`
      )
      .all([page_size, offset]);
    const total = (
      db.prepare(
        `SELECT COUNT(*) as c FROM sampling_records
         WHERE status IN ('received','resulted') AND result_reported_at IS NULL`
      ).get() as any
    ).c;
    const overdue = (
      db.prepare(
        `SELECT COUNT(*) as c FROM sampling_records
         WHERE status IN ('received','resulted') AND result_reported_at IS NULL AND is_lab_overdue=1`
      ).get() as any
    ).c;
    ok(res, {
      list,
      total,
      overdue_count: overdue,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    });
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/master/dashboard', (_req, res) => {
  try {
    const byStatus: any = db
      .prepare(
        `SELECT status, COUNT(*) as count FROM sampling_records GROUP BY status`
      )
      .all();
    const statusMap: any = {};
    for (const r of byStatus as any[]) statusMap[r.status] = r.count;
    const overdue = (
      db.prepare(
        `SELECT
          SUM(CASE WHEN is_sample_overdue=1 THEN 1 ELSE 0 END) as preservation,
          SUM(CASE WHEN is_dispatch_overdue=1 THEN 1 ELSE 0 END) as dispatch,
          SUM(CASE WHEN is_lab_overdue=1 THEN 1 ELSE 0 END) as lab
         FROM sampling_records WHERE status NOT IN ('resulted','closed')`
      ).get() as any
    );
    const rejection = (
      db.prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN re_sample_completed=1 THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN re_sample_completed=0 THEN 1 ELSE 0 END) as pending
         FROM rejection_records`
      ).get() as any
    );
    const missing = (
      db.prepare(
        `SELECT COUNT(*) as c FROM sampling_records
         WHERE status='received' AND result_reported_at IS NULL`
      ).get() as any
    ).c;
    const todayCount = (
      db.prepare(
        `SELECT COUNT(*) as c FROM sampling_records WHERE DATE(sampled_at) = DATE('now','localtime')`
      ).get() as any
    ).c;
    ok(res, {
      by_status: statusMap,
      overdue: {
        preservation: overdue.preservation || 0,
        dispatch: overdue.dispatch || 0,
        lab: overdue.lab || 0,
        total: (overdue.preservation || 0) + (overdue.dispatch || 0) + (overdue.lab || 0),
      },
      rejections: {
        total: rejection.total || 0,
        completed: rejection.completed || 0,
        pending: rejection.pending || 0,
      },
      missing_results: missing || 0,
      today_sampled: todayCount || 0,
    });
  } catch (e) {
    serverError(res, e);
  }
});

export default router;
