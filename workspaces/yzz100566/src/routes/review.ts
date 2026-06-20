import { Router } from 'express';
import db, { diffHours } from '../db';
import { ok, serverError, getPagination } from '../utils';

const router = Router();

router.get('/overtime-breakdown', (req, res) => {
  try {
    const { start_date, end_date } = req.query as any;
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (start_date) {
      where.push('DATE(sampled_at) >= ?');
      params.push(start_date);
    }
    if (end_date) {
      where.push('DATE(sampled_at) <= ?');
      params.push(end_date);
    }
    const whereSQL = where.join(' AND ');

    const rows = db
      .prepare(
        `SELECT id, barcode, outlet_name, sampled_at, dispatched_at,
                lab_received_at, result_reported_at,
                is_sample_overdue, is_dispatch_overdue, is_lab_overdue,
                status
         FROM sampling_records WHERE ${whereSQL}
         ORDER BY sampled_at DESC`
      )
      .all(params) as any[];

    const details: any[] = [];
    let sampleOver = 0,
      dispatchOver = 0,
      labOver = 0;
    let sampleAvgH = 0,
      sampleCnt = 0,
      dispatchAvgH = 0,
      dispatchCnt = 0,
      labAvgH = 0,
      labCnt = 0;

    for (const r of rows) {
      const d: any = {
        id: r.id,
        barcode: r.barcode,
        outlet_name: r.outlet_name,
        sampled_at: r.sampled_at,
        status: r.status,
        sample_overdue: !!r.is_sample_overdue,
        dispatch_overdue: !!r.is_dispatch_overdue,
        lab_overdue: !!r.is_lab_overdue,
      };
      if (r.is_sample_overdue) sampleOver++;
      if (r.is_dispatch_overdue) dispatchOver++;
      if (r.is_lab_overdue) labOver++;
      if (r.dispatched_at) {
        d.dispatch_hours = +diffHours(r.sampled_at, r.dispatched_at).toFixed(2);
        dispatchAvgH += d.dispatch_hours;
        dispatchCnt++;
      }
      if (r.lab_received_at) {
        d.lab_receive_hours = r.dispatched_at
          ? +diffHours(r.dispatched_at, r.lab_received_at).toFixed(2)
          : null;
        sampleAvgH += d.lab_receive_hours || 0;
        if (d.lab_receive_hours) sampleCnt++;
      }
      if (r.result_reported_at && r.lab_received_at) {
        d.lab_process_hours = +diffHours(r.lab_received_at, r.result_reported_at).toFixed(2);
        labAvgH += d.lab_process_hours;
        labCnt++;
      }
      details.push(d);
    }

    ok(res, {
      summary: {
        total: rows.length,
        sample_overdue_count: sampleOver,
        dispatch_overdue_count: dispatchOver,
        lab_overdue_count: labOver,
        avg_dispatch_hours: dispatchCnt ? +(dispatchAvgH / dispatchCnt).toFixed(2) : 0,
        avg_lab_receive_hours: sampleCnt ? +(sampleAvgH / sampleCnt).toFixed(2) : 0,
        avg_lab_process_hours: labCnt ? +(labAvgH / labCnt).toFixed(2) : 0,
      },
      details,
    });
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/by-outlet', (req, res) => {
  try {
    const { start_date, end_date } = req.query as any;
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (start_date) {
      where.push('DATE(sampled_at) >= ?');
      params.push(start_date);
    }
    if (end_date) {
      where.push('DATE(sampled_at) <= ?');
      params.push(end_date);
    }
    const whereSQL = where.join(' AND ');
    const rows = db
      .prepare(
        `SELECT outlet_id, outlet_code, outlet_name,
                COUNT(*) as total,
                SUM(CASE WHEN is_sample_overdue=1 THEN 1 ELSE 0 END) as sample_od,
                SUM(CASE WHEN is_dispatch_overdue=1 THEN 1 ELSE 0 END) as dispatch_od,
                SUM(CASE WHEN is_lab_overdue=1 THEN 1 ELSE 0 END) as lab_od,
                SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN is_re_sample=1 THEN 1 ELSE 0 END) as resampled,
                SUM(CASE WHEN status='resulted' OR status='closed' THEN 1 ELSE 0 END) as resulted
         FROM sampling_records
         WHERE ${whereSQL}
         GROUP BY outlet_id, outlet_code, outlet_name
         ORDER BY total DESC`
      )
      .all(params);
    ok(res, rows);
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/by-sampler', (req, res) => {
  try {
    const { start_date, end_date } = req.query as any;
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (start_date) {
      where.push('DATE(sampled_at) >= ?');
      params.push(start_date);
    }
    if (end_date) {
      where.push('DATE(sampled_at) <= ?');
      params.push(end_date);
    }
    const whereSQL = where.join(' AND ');
    const rows = db
      .prepare(
        `SELECT sampler_id, sampler,
                COUNT(*) as total,
                SUM(CASE WHEN is_sample_overdue=1 THEN 1 ELSE 0 END) as sample_od,
                SUM(CASE WHEN is_dispatch_overdue=1 THEN 1 ELSE 0 END) as dispatch_od
         FROM sampling_records
         WHERE ${whereSQL}
         GROUP BY sampler_id, sampler
         ORDER BY total DESC`
      )
      .all(params);
    ok(res, rows);
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/by-lab', (req, res) => {
  try {
    const { start_date, end_date } = req.query as any;
    const where: string[] = ['lab_operator_id IS NOT NULL'];
    const params: any[] = [];
    if (start_date) {
      where.push('DATE(lab_received_at) >= ?');
      params.push(start_date);
    }
    if (end_date) {
      where.push('DATE(lab_received_at) <= ?');
      params.push(end_date);
    }
    const whereSQL = where.join(' AND ');
    const rows = db
      .prepare(
        `SELECT lab_operator_id, lab_operator,
                COUNT(*) as received,
                SUM(CASE WHEN is_lab_overdue=1 THEN 1 ELSE 0 END) as lab_od,
                SUM(CASE WHEN result_reported_at IS NOT NULL THEN 1 ELSE 0 END) as reported
         FROM sampling_records
         WHERE ${whereSQL}
         GROUP BY lab_operator_id, lab_operator
         ORDER BY received DESC`
      )
      .all(params);
    ok(res, rows);
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/timeline', (req, res) => {
  try {
    const { page, page_size, offset } = getPagination(req.query);
    const { start_date, end_date } = req.query as any;
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (start_date) {
      where.push('DATE(sampled_at) >= ?');
      params.push(start_date);
    }
    if (end_date) {
      where.push('DATE(sampled_at) <= ?');
      params.push(end_date);
    }
    const whereSQL = where.join(' AND ');

    const list = db
      .prepare(
        `SELECT s.id, s.barcode, s.outlet_code, s.outlet_name, s.sampler, s.status,
                s.sampled_at, s.dispatched_at, s.lab_received_at, s.result_reported_at,
                s.is_sample_overdue, s.is_dispatch_overdue, s.is_lab_overdue,
                r.reject_reason, r.re_sample_completed
         FROM sampling_records s
         LEFT JOIN rejection_records r ON r.sampling_id = s.id
         WHERE ${whereSQL}
         ORDER BY s.sampled_at DESC
         LIMIT ? OFFSET ?`
      )
      .all([...params, page_size, offset]) as any[];

    const enriched = list.map((r) => {
      const stages: any[] = [];
      stages.push({ name: '采样', time: r.sampled_at, overdue: !!r.is_sample_overdue });
      if (r.dispatched_at)
        stages.push({ name: '送检', time: r.dispatched_at, overdue: !!r.is_dispatch_overdue });
      if (r.lab_received_at)
        stages.push({ name: '实验接收', time: r.lab_received_at });
      if (r.result_reported_at)
        stages.push({ name: '结果出具', time: r.result_reported_at, overdue: !!r.is_lab_overdue });
      if (r.reject_reason) stages.push({ name: '退样', time: null, reason: r.reject_reason });
      const root_cause = [];
      if (r.is_sample_overdue) root_cause.push('采样后未及时送检(保存超期)');
      if (r.is_dispatch_overdue) root_cause.push('送检超期');
      if (r.is_lab_overdue) root_cause.push('实验室结果出具超期');
      if (r.reject_reason) root_cause.push('样品退样原因：' + r.reject_reason);
      return { ...r, stages, root_cause };
    });

    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM sampling_records s WHERE ${whereSQL}`).get(params) as any
    ).c;
    ok(res, { list: enriched, total, page, page_size, total_pages: Math.ceil(total / page_size) });
  } catch (e) {
    serverError(res, e);
  }
});

export default router;
