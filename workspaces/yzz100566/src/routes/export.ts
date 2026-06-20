import { Router } from 'express';
import db from '../db';
import { fail, serverError, refreshOverdueFlags } from '../utils';
import { Parser } from 'json2csv';

const router = Router();

router.use((_req, _res, next) => {
  try {
    refreshOverdueFlags();
  } catch (e) {
    console.warn(e);
  }
  next();
});

function sendCsv(res: any, filename: string, rows: any[], fields: any[]) {
  try {
    const parser = new Parser({ fields });
    const csv = parser.parse(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.send('\uFEFF' + csv);
  } catch (e) {
    serverError(res, e);
  }
}

function buildWhere(query: any) {
  const { start_date, end_date, outlet_id } = query;
  const where: string[] = ['1=1'];
  const params: any[] = [];
  if (start_date) {
    where.push('DATE(s.sampled_at) >= ?');
    params.push(start_date);
  }
  if (end_date) {
    where.push('DATE(s.sampled_at) <= ?');
    params.push(end_date);
  }
  if (outlet_id) {
    where.push('s.outlet_id = ?');
    params.push(Number(outlet_id));
  }
  return { sql: where.join(' AND '), params };
}

router.get('/overtime', (req, res) => {
  try {
    const { sql, params } = buildWhere(req.query);
    const rows = db
      .prepare(
        `SELECT s.id, s.barcode, s.outlet_code, s.outlet_name,
                s.sampled_at, s.sampler,
                s.dispatched_at, s.dispatcher,
                s.lab_received_at, s.lab_operator,
                s.result_reported_at, s.result_reporter,
                CASE WHEN s.is_sample_overdue=1 THEN '是' ELSE '否' END as 保存超期,
                CASE WHEN s.is_dispatch_overdue=1 THEN '是' ELSE '否' END as 送检超期,
                CASE WHEN s.is_lab_overdue=1 THEN '是' ELSE '否' END as 报告超期,
                s.status
         FROM sampling_records s
         WHERE ${sql} AND (s.is_sample_overdue=1 OR s.is_dispatch_overdue=1 OR s.is_lab_overdue=1)
         ORDER BY s.sampled_at DESC`
      )
      .all(params);
    sendCsv(res, '超期记录.csv', rows, [
      { label: 'ID', value: 'id' },
      { label: '条码', value: 'barcode' },
      { label: '排口编码', value: 'outlet_code' },
      { label: '排口名称', value: 'outlet_name' },
      { label: '采样时间', value: 'sampled_at' },
      { label: '采样人', value: 'sampler' },
      { label: '送检时间', value: 'dispatched_at' },
      { label: '送检人', value: 'dispatcher' },
      { label: '实验室接收', value: 'lab_received_at' },
      { label: '接收人', value: 'lab_operator' },
      { label: '报告时间', value: 'result_reported_at' },
      { label: '报告人', value: 'result_reporter' },
      { label: '保存超期', value: '保存超期' },
      { label: '送检超期', value: '送检超期' },
      { label: '报告超期', value: '报告超期' },
      { label: '状态', value: 'status' },
    ]);
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/rejections', (req, res) => {
  try {
    const { start_date, end_date } = req.query as any;
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (start_date) {
      where.push('DATE(r.rejected_at) >= ?');
      params.push(start_date);
    }
    if (end_date) {
      where.push('DATE(r.rejected_at) <= ?');
      params.push(end_date);
    }
    const whereSQL = where.join(' AND ');
    const rows = db
      .prepare(
        `SELECT r.id, r.sampling_id, s.barcode, s.outlet_code, s.outlet_name,
                s.sampled_at, s.sampler,
                r.rejected_at, r.rejected_by, r.reject_reason,
                r.re_sample_requirement, r.re_sample_deadline,
                CASE WHEN r.re_sample_completed=1 THEN '已补采' ELSE '未补采' END as re_sample_status,
                r2.barcode as new_barcode,
                r2.sampled_at as new_sampled_at,
                r2.sampler as new_sampler
         FROM rejection_records r
         LEFT JOIN sampling_records s ON s.id = r.sampling_id
         LEFT JOIN sampling_records r2 ON r2.id = r.re_sample_sampling_id
         WHERE ${whereSQL}
         ORDER BY r.rejected_at DESC`
      )
      .all(params);
    sendCsv(res, '退样与补采.csv', rows, [
      { label: '退样ID', value: 'id' },
      { label: '原采样ID', value: 'sampling_id' },
      { label: '原条码', value: 'barcode' },
      { label: '排口编码', value: 'outlet_code' },
      { label: '排口名称', value: 'outlet_name' },
      { label: '原采样时间', value: 'sampled_at' },
      { label: '原采样人', value: 'sampler' },
      { label: '退样时间', value: 'rejected_at' },
      { label: '退样人', value: 'rejected_by' },
      { label: '退样原因', value: 'reject_reason' },
      { label: '补采要求', value: 're_sample_requirement' },
      { label: '补采截止', value: 're_sample_deadline' },
      { label: '补采状态', value: 're_sample_status' },
      { label: '新条码', value: 'new_barcode' },
      { label: '新采样时间', value: 'new_sampled_at' },
      { label: '新采样人', value: 'new_sampler' },
    ]);
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/missing-results', (req, res) => {
  try {
    const { sql, params } = buildWhere(req.query);
    const rows = db
      .prepare(
        `SELECT s.id, s.barcode, s.outlet_code, s.outlet_name,
                s.sampled_at, s.sampler,
                s.dispatched_at, s.dispatcher,
                s.lab_received_at, s.lab_operator,
                s.lab_sla_deadline,
                CASE WHEN s.is_lab_overdue=1 THEN '是' ELSE '否' END as 报告超期,
                s.status
         FROM sampling_records s
         WHERE ${sql} AND s.status IN ('received')
         ORDER BY s.lab_sla_deadline ASC`
      )
      .all(params);
    sendCsv(res, '缺结果记录.csv', rows, [
      { label: 'ID', value: 'id' },
      { label: '条码', value: 'barcode' },
      { label: '排口编码', value: 'outlet_code' },
      { label: '排口名称', value: 'outlet_name' },
      { label: '采样时间', value: 'sampled_at' },
      { label: '采样人', value: 'sampler' },
      { label: '送检时间', value: 'dispatched_at' },
      { label: '送检人', value: 'dispatcher' },
      { label: '实验室接收', value: 'lab_received_at' },
      { label: '接收人', value: 'lab_operator' },
      { label: '报告截止', value: 'lab_sla_deadline' },
      { label: '报告超期', value: '报告超期' },
      { label: '状态', value: 'status' },
    ]);
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/resample-completed', (req, res) => {
  try {
    const { start_date, end_date } = req.query as any;
    const where: string[] = ['r.re_sample_completed=1'];
    const params: any[] = [];
    if (start_date) {
      where.push('DATE(r2.sampled_at) >= ?');
      params.push(start_date);
    }
    if (end_date) {
      where.push('DATE(r2.sampled_at) <= ?');
      params.push(end_date);
    }
    const whereSQL = where.join(' AND ');
    const rows = db
      .prepare(
        `SELECT r.id, r.sampling_id as old_id, s.barcode as old_barcode,
                s.outlet_code, s.outlet_name,
                r.rejected_at, r.reject_reason, r.re_sample_requirement,
                r.re_sample_sampling_id as new_id,
                r2.barcode as new_barcode,
                r2.sampled_at as new_sampled_at,
                r2.sampler as new_sampler,
                r2.dispatched_at as new_dispatched_at,
                r2.status as new_status,
                r2.result_cod, r2.result_nh3n, r2.result_tp, r2.result_tn,
                r2.result_ph, r2.result_ss, r2.result_remark,
                r2.result_reported_at
         FROM rejection_records r
         LEFT JOIN sampling_records s ON s.id = r.sampling_id
         LEFT JOIN sampling_records r2 ON r2.id = r.re_sample_sampling_id
         WHERE ${whereSQL}
         ORDER BY r2.sampled_at DESC`
      )
      .all(params);
    sendCsv(res, '补采完成.csv', rows, [
      { label: '退样记录ID', value: 'id' },
      { label: '原采样ID', value: 'old_id' },
      { label: '原条码', value: 'old_barcode' },
      { label: '排口编码', value: 'outlet_code' },
      { label: '排口名称', value: 'outlet_name' },
      { label: '退样时间', value: 'rejected_at' },
      { label: '退样原因', value: 'reject_reason' },
      { label: '补采要求', value: 're_sample_requirement' },
      { label: '新采样ID', value: 'new_id' },
      { label: '新条码', value: 'new_barcode' },
      { label: '新采样时间', value: 'new_sampled_at' },
      { label: '新采样人', value: 'new_sampler' },
      { label: '新送检时间', value: 'new_dispatched_at' },
      { label: '新状态', value: 'new_status' },
      { label: 'COD', value: 'result_cod' },
      { label: '氨氮', value: 'result_nh3n' },
      { label: '总磷', value: 'result_tp' },
      { label: '总氮', value: 'result_tn' },
      { label: 'pH', value: 'result_ph' },
      { label: 'SS', value: 'result_ss' },
      { label: '备注', value: 'result_remark' },
      { label: '报告时间', value: 'result_reported_at' },
    ]);
  } catch (e) {
    serverError(res, e);
  }
});

router.get('/full', (req, res) => {
  try {
    const { sql, params } = buildWhere(req.query);
    const rows = db
      .prepare(
        `SELECT s.id, s.barcode, s.outlet_code, s.outlet_name,
                s.sampled_at, s.sampler,
                s.preservation_deadline,
                CASE WHEN s.is_sample_overdue=1 THEN '是' ELSE '否' END as 保存超期,
                s.dispatched_at, s.dispatcher,
                s.dispatch_deadline,
                CASE WHEN s.is_dispatch_overdue=1 THEN '是' ELSE '否' END as 送检超期,
                s.lab_received_at, s.lab_operator,
                s.lab_sla_deadline,
                CASE WHEN s.is_lab_overdue=1 THEN '是' ELSE '否' END as 报告超期,
                s.status,
                r.reject_reason, r.re_sample_requirement,
                s.result_cod, s.result_nh3n, s.result_tp, s.result_tn,
                s.result_ph, s.result_ss, s.result_remark,
                s.result_reported_at, s.result_reporter
         FROM sampling_records s
         LEFT JOIN rejection_records r ON r.sampling_id = s.id
         WHERE ${sql}
         ORDER BY s.sampled_at DESC`
      )
      .all(params);
    sendCsv(res, '污水送样全记录.csv', rows, [
      { label: 'ID', value: 'id' },
      { label: '条码', value: 'barcode' },
      { label: '排口编码', value: 'outlet_code' },
      { label: '排口名称', value: 'outlet_name' },
      { label: '采样时间', value: 'sampled_at' },
      { label: '采样人', value: 'sampler' },
      { label: '保存截止', value: 'preservation_deadline' },
      { label: '保存超期', value: '保存超期' },
      { label: '送检时间', value: 'dispatched_at' },
      { label: '送检人', value: 'dispatcher' },
      { label: '送检截止', value: 'dispatch_deadline' },
      { label: '送检超期', value: '送检超期' },
      { label: '实验室接收', value: 'lab_received_at' },
      { label: '接收人', value: 'lab_operator' },
      { label: '报告截止', value: 'lab_sla_deadline' },
      { label: '报告超期', value: '报告超期' },
      { label: '状态', value: 'status' },
      { label: '退样原因', value: 'reject_reason' },
      { label: '补采要求', value: 're_sample_requirement' },
      { label: 'COD(mg/L)', value: 'result_cod' },
      { label: '氨氮(mg/L)', value: 'result_nh3n' },
      { label: '总磷(mg/L)', value: 'result_tp' },
      { label: '总氮(mg/L)', value: 'result_tn' },
      { label: 'pH', value: 'result_ph' },
      { label: 'SS(mg/L)', value: 'result_ss' },
      { label: '备注', value: 'result_remark' },
      { label: '报告时间', value: 'result_reported_at' },
      { label: '报告人', value: 'result_reporter' },
    ]);
  } catch (e) {
    serverError(res, e);
  }
});

export default router;
