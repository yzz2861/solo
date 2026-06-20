import { Response } from 'express';
import { ApiResponse } from './types';
import db, { nowStr, isOverdue } from './db';
import { SamplingRecord } from './types';

export function ok<T>(res: Response, data: T, message = 'ok'): void {
  const body: ApiResponse<T> = { code: 0, message, data };
  res.status(200).json(body);
}

export function fail(res: Response, message: string, code = 400, httpCode = 200): void {
  const body: ApiResponse<null> = { code, message, data: null };
  res.status(httpCode).json(body);
}

export function serverError(res: Response, err: any): void {
  console.error(err);
  fail(res, '服务器内部错误: ' + (err?.message || String(err)), 500, 500);
}

export function getPagination(
  query: any
): { page: number; page_size: number; offset: number } {
  const page = Math.max(1, parseInt(query?.page || '1', 10));
  const page_size = Math.min(200, Math.max(1, parseInt(query?.page_size || '20', 10)));
  const offset = (page - 1) * page_size;
  return { page, page_size, offset };
}

export function refreshOverdueFlags() {
  const all = db
    .prepare(
      `SELECT id, status, preservation_deadline, dispatch_deadline, lab_sla_deadline,
              is_sample_overdue, is_dispatch_overdue, is_lab_overdue,
              dispatched_at, lab_received_at
       FROM sampling_records
       WHERE status NOT IN ('resulted','closed')`
    )
    .all() as SamplingRecord[];

  const updateSample = db.prepare(
    `UPDATE sampling_records SET is_sample_overdue=?, updated_at=? WHERE id=?`
  );
  const updateDispatch = db.prepare(
    `UPDATE sampling_records SET is_dispatch_overdue=?, updated_at=? WHERE id=?`
  );
  const updateLab = db.prepare(
    `UPDATE sampling_records SET is_lab_overdue=?, updated_at=? WHERE id=?`
  );

  const insertAlert = db.prepare(
    `INSERT INTO alert_records (sampling_id, alert_type, alert_message, alert_level, triggered_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  const hasAlert = db.prepare(
    `SELECT COUNT(*) as c FROM alert_records WHERE sampling_id=? AND alert_type=? AND acknowledged=0`
  );

  const now = nowStr();

  for (const r of all) {
    const sampleOD = isOverdue(r.preservation_deadline) ? 1 : 0;
    if (sampleOD !== r.is_sample_overdue) {
      updateSample.run(sampleOD, now, r.id);
      if (sampleOD && (hasAlert.get(r.id, 'preservation') as any).c === 0) {
        insertAlert.run(
          r.id,
          'preservation',
          `样瓶[${r.id}]已超过保存时限`,
          'critical',
          now
        );
      }
    }

    if (!r.dispatched_at) {
      const dispatchOD = isOverdue(r.dispatch_deadline) ? 1 : 0;
      if (dispatchOD !== r.is_dispatch_overdue) {
        updateDispatch.run(dispatchOD, now, r.id);
        if (dispatchOD && (hasAlert.get(r.id, 'dispatch') as any).c === 0) {
          insertAlert.run(
            r.id,
            'dispatch',
            `样瓶[${r.id}]已超过送检时限`,
            'warning',
            now
          );
        }
      }
    }

    if (r.lab_received_at && r.lab_sla_deadline && r.status !== 'resulted') {
      const labOD = isOverdue(r.lab_sla_deadline) ? 1 : 0;
      if (labOD !== r.is_lab_overdue) {
        updateLab.run(labOD, now, r.id);
        if (labOD && (hasAlert.get(r.id, 'lab_sla') as any).c === 0) {
          insertAlert.run(
            r.id,
            'lab_sla',
            `样瓶[${r.id}]实验室结果回填超期`,
            'warning',
            now
          );
        }
      }
    }
  }

  const rejections = db
    .prepare(
      `SELECT r.id, r.sampling_id, r.re_sample_deadline, r.re_sample_completed
       FROM rejection_records r
       WHERE r.re_sample_completed=0`
    )
    .all() as any[];
  for (const rj of rejections) {
    if (isOverdue(rj.re_sample_deadline) &&
        (hasAlert.get(rj.sampling_id, 're_sample') as any).c === 0) {
      insertAlert.run(
        rj.sampling_id,
        're_sample',
        `样瓶[${rj.sampling_id}]补采任务已超期`,
        'critical',
        now
      );
    }
  }
}

export function buildWhere(conditions: Record<string, any>): {
  sql: string;
  params: any[];
} {
  const parts: string[] = [];
  const params: any[] = [];
  for (const k of Object.keys(conditions)) {
    if (conditions[k] === undefined || conditions[k] === null || conditions[k] === '') {
      continue;
    }
    parts.push(`${k} = ?`);
    params.push(conditions[k]);
  }
  const sql = parts.length ? 'WHERE ' + parts.join(' AND ') : '';
  return { sql, params };
}
