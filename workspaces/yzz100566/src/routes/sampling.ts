import { Router } from 'express';
import db, {
  addHours,
  nowStr,
  PRESERVATION_HOURS,
  DISPATCH_SLA_HOURS,
  LAB_RESULTS_SLA_HOURS,
} from '../db';
import {
  ok,
  fail,
  serverError,
  getPagination,
  refreshOverdueFlags,
} from '../utils';
import { SAMPLE_STATUS } from '../types';

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
    const {
      status,
      outlet_id,
      barcode,
      sampler_id,
      start_date,
      end_date,
      is_overdue,
      is_re_sample,
    } = req.query as any;
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (status) {
      where.push('s.status = ?');
      params.push(status);
    }
    if (outlet_id) {
      where.push('s.outlet_id = ?');
      params.push(Number(outlet_id));
    }
    if (barcode) {
      where.push('s.barcode LIKE ?');
      params.push(`%${barcode}%`);
    }
    if (sampler_id) {
      where.push('s.sampler_id = ?');
      params.push(Number(sampler_id));
    }
    if (start_date) {
      where.push('DATE(s.sampled_at) >= ?');
      params.push(start_date);
    }
    if (end_date) {
      where.push('DATE(s.sampled_at) <= ?');
      params.push(end_date);
    }
    if (is_overdue === '1') {
      where.push('(s.is_sample_overdue=1 OR s.is_dispatch_overdue=1 OR s.is_lab_overdue=1)');
    }
    if (is_re_sample === '1') {
      where.push('s.is_re_sample = 1');
    } else if (is_re_sample === '0') {
      where.push('s.is_re_sample = 0');
    }
    const whereSQL = where.join(' AND ');
    const list = db
      .prepare(
        `SELECT s.*,
          (SELECT r.reject_reason FROM rejection_records r WHERE r.sampling_id = s.id) as reject_reason,
          (SELECT r.re_sample_requirement FROM rejection_records r WHERE r.sampling_id = s.id) as re_sample_requirement,
          (SELECT r.re_sample_deadline FROM rejection_records r WHERE r.sampling_id = s.id) as re_sample_deadline,
          (SELECT r.re_sample_completed FROM rejection_records r WHERE r.sampling_id = s.id) as re_sample_completed
         FROM sampling_records s
         WHERE ${whereSQL}
         ORDER BY s.id DESC
         LIMIT ? OFFSET ?`
      )
      .all([...params, page_size, offset]);
    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM sampling_records s WHERE ${whereSQL}`).get(params) as any
    ).c;
    ok(res, { list, total, page, page_size, total_pages: Math.ceil(total / page_size) });
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/:id', (req, res) => {
  try {
    const r: any = db
      .prepare(
        `SELECT s.*,
          (SELECT r.reject_reason FROM rejection_records r WHERE r.sampling_id = s.id) as reject_reason,
          (SELECT r.rejected_at FROM rejection_records r WHERE r.sampling_id = s.id) as rejected_at,
          (SELECT r.rejected_by FROM rejection_records r WHERE r.sampling_id = s.id) as rejected_by,
          (SELECT r.re_sample_requirement FROM rejection_records r WHERE r.sampling_id = s.id) as re_sample_requirement,
          (SELECT r.re_sample_deadline FROM rejection_records r WHERE r.sampling_id = s.id) as re_sample_deadline,
          (SELECT r.re_sample_completed FROM rejection_records r WHERE r.sampling_id = s.id) as re_sample_completed,
          (SELECT r.re_sample_sampling_id FROM rejection_records r WHERE r.sampling_id = s.id) as re_sample_sampling_id
         FROM sampling_records s WHERE s.id=?`
      )
      .get(req.params.id);
    if (!r) return fail(res, '采样记录不存在', 404, 404);
    const timeline: any[] = [
      { stage: '采样', time: r.sampled_at, operator: r.sampler, remark: `排口：${r.outlet_name}` },
    ];
    if (r.dispatched_at) timeline.push({ stage: '送检', time: r.dispatched_at, operator: r.dispatcher });
    if (r.lab_received_at) timeline.push({ stage: '实验室接收', time: r.lab_received_at, operator: r.lab_operator });
    if (r.rejected_at) timeline.push({ stage: '退样', time: r.rejected_at, operator: r.rejected_by, remark: r.reject_reason });
    if (r.result_reported_at) timeline.push({ stage: '结果回填', time: r.result_reported_at, operator: r.result_reporter });
    r.timeline = timeline;
    if (r.parent_sampling_id) {
      r.parent = db
        .prepare('SELECT id, barcode, outlet_name, sampled_at, sampler FROM sampling_records WHERE id=?')
        .get(r.parent_sampling_id);
    }
    if (r.re_sample_sampling_id) {
      r.resample = db
        .prepare('SELECT id, barcode, outlet_name, sampled_at, sampler, status FROM sampling_records WHERE id=?')
        .get(r.re_sample_sampling_id);
    }
    ok(res, r);
  } catch (e) {
    serverError(res, e);
  }
});

router.post('/', (req, res) => {
  try {
    const {
      barcode,
      outlet_id,
      sampled_at,
      sampler_id,
      parent_sampling_id,
      re_sample_reason,
    } = req.body || {};
    if (!barcode || !outlet_id || !sampled_at || !sampler_id) {
      return fail(res, 'barcode、outlet_id、sampled_at、sampler_id 必填');
    }
    const bottle: any = db
      .prepare('SELECT * FROM sample_bottles WHERE barcode=?')
      .get(barcode);
    if (!bottle) return fail(res, '样瓶条码不存在，请先入库');
    if (bottle.status !== 'unused') {
      return fail(res, `样瓶状态为 ${bottle.status}，不能使用`);
    }
    const used: any = db
      .prepare('SELECT id FROM sampling_records WHERE bottle_id=? AND status NOT IN (\'rejected\')')
      .get(bottle.id);
    if (used) {
      return fail(res, `条码 ${barcode} 已被采样记录 #${used.id} 使用，禁止重复入库`);
    }
    const outlet: any = db.prepare('SELECT * FROM outlets WHERE id=?').get(outlet_id);
    if (!outlet) return fail(res, '排口不存在');
    const user: any = db.prepare('SELECT * FROM users WHERE id=?').get(sampler_id);
    if (!user) return fail(res, '采样人不存在');

    let parentInfo: any = null;
    if (parent_sampling_id) {
      parentInfo = db
        .prepare('SELECT * FROM sampling_records WHERE id=?')
        .get(parent_sampling_id);
      if (!parentInfo) return fail(res, '父采样记录不存在');
    }

    const preservation_deadline = addHours(sampled_at, PRESERVATION_HOURS);
    const dispatch_deadline = addHours(sampled_at, DISPATCH_SLA_HOURS);

    const tx = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO sampling_records
          (bottle_id, barcode, outlet_id, outlet_code, outlet_name,
           sampled_at, sampler, sampler_id, status,
           preservation_deadline, dispatch_deadline,
           parent_sampling_id, is_re_sample, re_sample_reason)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        )
        .run(
          bottle.id,
          barcode,
          outlet.id,
          outlet.code,
          outlet.name,
          sampled_at,
          user.display_name,
          user.id,
          parentInfo ? SAMPLE_STATUS.RE_SAMPLED : SAMPLE_STATUS.SAMPLED,
          preservation_deadline,
          dispatch_deadline,
          parent_sampling_id || null,
          parent_sampling_id ? 1 : 0,
          re_sample_reason || null
        );
      db.prepare("UPDATE sample_bottles SET status='used' WHERE id=?").run(bottle.id);

      if (parent_sampling_id) {
        db.prepare(
          `UPDATE rejection_records
           SET re_sample_completed=1, re_sample_sampling_id=?
           WHERE sampling_id=?`
        ).run(info.lastInsertRowid, parent_sampling_id);
        db.prepare(
          `UPDATE sampling_records SET status='re_sampling', updated_at=? WHERE id=?`
        ).run(nowStr(), parent_sampling_id);
      }
      return info.lastInsertRowid;
    });
    const id = tx();
    ok(res, { id, barcode }, '采样记录创建成功');
  } catch (e) {
    serverError(res, e);
  }
});

router.post('/:id/dispatch', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { dispatcher_id, dispatched_at } = req.body || {};
    if (!dispatcher_id) return fail(res, 'dispatcher_id 必填');
    const rec: any = db.prepare('SELECT * FROM sampling_records WHERE id=?').get(id);
    if (!rec) return fail(res, '采样记录不存在', 404, 404);
    if (!['sampled', 're_sampled'].includes(rec.status)) {
      return fail(res, `当前状态为 ${rec.status}，不能送检`);
    }
    const user: any = db.prepare('SELECT * FROM users WHERE id=?').get(dispatcher_id);
    if (!user) return fail(res, '送检人不存在');
    const now = dispatched_at || nowStr();
    db.prepare(
      `UPDATE sampling_records
       SET status='dispatched', dispatched_at=?, dispatcher=?, dispatcher_id=?, updated_at=?
       WHERE id=?`
    ).run(now, user.display_name, user.id, nowStr(), id);
    ok(res, { id, dispatched_at: now }, '送检成功');
  } catch (e) {
    serverError(res, e);
  }
});

router.post('/batch-dispatch', (req, res) => {
  try {
    const { ids, dispatcher_id, dispatched_at } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) return fail(res, 'ids 不能为空');
    if (!dispatcher_id) return fail(res, 'dispatcher_id 必填');
    const user: any = db.prepare('SELECT * FROM users WHERE id=?').get(dispatcher_id);
    if (!user) return fail(res, '送检人不存在');
    const now = dispatched_at || nowStr();
    const stmt = db.prepare(
      `UPDATE sampling_records
       SET status='dispatched', dispatched_at=?, dispatcher=?, dispatcher_id=?, updated_at=?
       WHERE id=? AND status IN ('sampled','re_sampled')`
    );
    const tx = db.transaction(() => {
      let count = 0;
      for (const id of ids) {
        const info = stmt.run(now, user.display_name, user.id, nowStr(), Number(id));
        if (info.changes) count++;
      }
      return count;
    });
    const count = tx();
    ok(res, { dispatched_count: count, total: ids.length }, `批量送检完成：成功${count}/${ids.length}`);
  } catch (e) {
    serverError(res, e);
  }
});

router.post('/:id/receive', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { lab_operator_id, lab_received_at } = req.body || {};
    if (!lab_operator_id) return fail(res, 'lab_operator_id 必填');
    const rec: any = db.prepare('SELECT * FROM sampling_records WHERE id=?').get(id);
    if (!rec) return fail(res, '采样记录不存在', 404, 404);
    if (rec.status !== 'dispatched') {
      return fail(res, `当前状态为 ${rec.status}，不能执行接收`);
    }
    const user: any = db.prepare('SELECT * FROM users WHERE id=?').get(lab_operator_id);
    if (!user) return fail(res, '实验室人员不存在');
    const now = lab_received_at || nowStr();
    const lab_sla_deadline = addHours(now, LAB_RESULTS_SLA_HOURS);
    db.prepare(
      `UPDATE sampling_records
       SET status='received', lab_received_at=?, lab_operator=?, lab_operator_id=?,
           lab_sla_deadline=?, updated_at=?
       WHERE id=?`
    ).run(now, user.display_name, user.id, lab_sla_deadline, nowStr(), id);
    ok(res, { id, lab_received_at: now, lab_sla_deadline }, '实验室接收成功');
  } catch (e) {
    serverError(res, e);
  }
});

router.post('/:id/reject', (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      lab_operator_id,
      rejected_at,
      reject_reason,
      re_sample_requirement,
      re_sample_deadline,
    } = req.body || {};
    if (!lab_operator_id) return fail(res, 'lab_operator_id 必填');
    if (!reject_reason) return fail(res, 'reject_reason 退样原因必填');
    if (!re_sample_requirement) return fail(res, 're_sample_requirement 补采要求必填');
    const rec: any = db.prepare('SELECT * FROM sampling_records WHERE id=?').get(id);
    if (!rec) return fail(res, '采样记录不存在', 404, 404);
    if (!['dispatched', 'received'].includes(rec.status)) {
      return fail(res, `当前状态为 ${rec.status}，不能退样`);
    }
    const user: any = db.prepare('SELECT * FROM users WHERE id=?').get(lab_operator_id);
    if (!user) return fail(res, '实验室人员不存在');
    const now = rejected_at || nowStr();
    const deadline = re_sample_deadline || addHours(now, 24);

    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE sampling_records SET status='rejected', updated_at=? WHERE id=?`
      ).run(nowStr(), id);
      const exist = db
        .prepare('SELECT id FROM rejection_records WHERE sampling_id=?')
        .get(id);
      if (exist) {
        db.prepare(
          `UPDATE rejection_records
           SET rejected_at=?, rejected_by=?, reject_reason=?,
               re_sample_requirement=?, re_sample_deadline=?
           WHERE sampling_id=?`
        ).run(now, user.display_name, reject_reason, re_sample_requirement, deadline, id);
      } else {
        db.prepare(
          `INSERT INTO rejection_records
           (sampling_id, rejected_at, rejected_by, reject_reason, re_sample_requirement, re_sample_deadline)
           VALUES (?,?,?,?,?,?)`
        ).run(id, now, user.display_name, reject_reason, re_sample_requirement, deadline);
      }
    });
    tx();
    ok(res, { id, rejected_at: now, re_sample_deadline: deadline }, '退样完成，已生成补采要求');
  } catch (e) {
    serverError(res, e);
  }
});

router.post('/:id/result', (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    const {
      reporter_id,
      reported_at,
      result_cod,
      result_nh3n,
      result_tp,
      result_tn,
      result_ph,
      result_ss,
      result_remark,
    } = body;
    if (!reporter_id) return fail(res, 'reporter_id 必填');
    const hasValue =
      result_cod !== undefined ||
      result_nh3n !== undefined ||
      result_tp !== undefined ||
      result_tn !== undefined ||
      result_ph !== undefined ||
      result_ss !== undefined;
    if (!hasValue && !result_remark) return fail(res, '至少填写一个化验结果或备注');
    const rec: any = db.prepare('SELECT * FROM sampling_records WHERE id=?').get(id);
    if (!rec) return fail(res, '采样记录不存在', 404, 404);
    if (rec.status === 'rejected') return fail(res, '该记录已退样，不能回填结果');
    if (!['received', 'resulted'].includes(rec.status)) {
      return fail(res, `当前状态为 ${rec.status}，请先由实验室接收`);
    }
    const user: any = db.prepare('SELECT * FROM users WHERE id=?').get(reporter_id);
    if (!user) return fail(res, '回填人员不存在');
    const now = reported_at || nowStr();
    db.prepare(
      `UPDATE sampling_records
       SET status='resulted',
           result_cod=COALESCE(?, result_cod),
           result_nh3n=COALESCE(?, result_nh3n),
           result_tp=COALESCE(?, result_tp),
           result_tn=COALESCE(?, result_tn),
           result_ph=COALESCE(?, result_ph),
           result_ss=COALESCE(?, result_ss),
           result_remark=COALESCE(?, result_remark),
           result_reported_at=?,
           result_reporter=?,
           result_reporter_id=?,
           updated_at=?
       WHERE id=?`
    ).run(
      result_cod === undefined ? null : Number(result_cod),
      result_nh3n === undefined ? null : Number(result_nh3n),
      result_tp === undefined ? null : Number(result_tp),
      result_tn === undefined ? null : Number(result_tn),
      result_ph === undefined ? null : Number(result_ph),
      result_ss === undefined ? null : Number(result_ss),
      result_remark === undefined ? null : result_remark,
      now,
      user.display_name,
      user.id,
      nowStr(),
      id
    );
    ok(res, { id, result_reported_at: now }, '结果回填成功');
  } catch (e) {
    serverError(res, e);
  }
});

router.post('/:id/close', (req, res) => {
  try {
    const id = Number(req.params.id);
    const rec: any = db.prepare('SELECT * FROM sampling_records WHERE id=?').get(id);
    if (!rec) return fail(res, '采样记录不存在', 404, 404);
    if (!['resulted', 're_sampling'].includes(rec.status)) {
      return fail(res, `当前状态为 ${rec.status}，不能归档`);
    }
    if (rec.status === 're_sampling') {
      const rej: any = db
        .prepare('SELECT re_sample_completed FROM rejection_records WHERE sampling_id=?')
        .get(id);
      if (!rej || !rej.re_sample_completed) {
        return fail(res, '补采尚未完成，不能归档');
      }
    }
    db.prepare(`UPDATE sampling_records SET status='closed', updated_at=? WHERE id=?`).run(
      nowStr(),
      id
    );
    ok(res, { id }, '已归档');
  } catch (e) {
    serverError(res, e);
  }
});

export default router;
