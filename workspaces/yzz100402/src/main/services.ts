import { getDb, run, getOne, getAll, saveToDisk } from './db';
import type {
  Patient,
  Department,
  Doctor,
  QueueStatus,
  CallRecord,
  QueueDetail,
  DailyStat,
  WaitingExportRow,
} from '../shared/types';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { Database } from 'sql.js';

function camelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function mapRow<T = any>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const k in row) {
    out[camelCase(k)] = row[k];
  }
  return out as T;
}

function persist() {
  saveToDisk();
}

export async function getDepartments(): Promise<Department[]> {
  const db = await getDb();
  const rows = getAll<Record<string, unknown>>(
    db,
    'SELECT id, name, created_at as createdAt FROM departments ORDER BY id'
  );
  return rows.map((r) => mapRow<Department>(r));
}

export async function getDoctors(departmentId?: number): Promise<Doctor[]> {
  const db = await getDb();
  let sql =
    'SELECT id, name, department_id as departmentId, title, is_active as isActive, created_at as createdAt FROM doctors';
  const params: unknown[] = [];
  if (departmentId) {
    sql += ' WHERE department_id = ?';
    params.push(departmentId);
  }
  sql += ' ORDER BY is_active DESC, id';
  const rows = getAll<Record<string, unknown>>(db, sql, params);
  return rows.map((r) => mapRow<Doctor>(r));
}

export async function setDoctorActive(doctorId: number, isActive: boolean): Promise<boolean> {
  const db = await getDb();
  run(db, 'UPDATE doctors SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, doctorId]);
  persist();
  return true;
}

export async function findPatient(
  name: string,
  phone?: string,
  idCard?: string
): Promise<Patient | null> {
  const db = await getDb();
  let patient: Patient | null = null;
  if (idCard) {
    const row = getOne<Record<string, unknown>>(
      db,
      'SELECT id, name, phone, id_card as idCard, age, gender, created_at as createdAt FROM patients WHERE id_card = ?',
      [idCard]
    );
    if (row) patient = mapRow<Patient>(row);
  }
  if (!patient && phone) {
    const row = getOne<Record<string, unknown>>(
      db,
      'SELECT id, name, phone, id_card as idCard, age, gender, created_at as createdAt FROM patients WHERE phone = ?',
      [phone]
    );
    if (row) patient = mapRow<Patient>(row);
  }
  if (!patient) {
    const row = getOne<Record<string, unknown>>(
      db,
      'SELECT id, name, phone, id_card as idCard, age, gender, created_at as createdAt FROM patients WHERE name = ? ORDER BY id DESC LIMIT 1',
      [name]
    );
    if (row) patient = mapRow<Patient>(row);
  }
  return patient;
}

export async function createPatient(data: {
  name: string;
  phone?: string;
  idCard?: string;
  age?: number;
  gender?: '男' | '女';
}): Promise<Patient> {
  const db = await getDb();
  const info = run(db, 'INSERT INTO patients (name, phone, id_card, age, gender) VALUES (?, ?, ?, ?, ?)', [
    data.name,
    data.phone || null,
    data.idCard || null,
    data.age || null,
    data.gender || null,
  ]);
  persist();
  return (await getPatientById(db, info.lastInsertRowid))!;
}

async function getPatientById(db: Database, id: number): Promise<Patient | null> {
  const row = getOne<Record<string, unknown>>(
    db,
    'SELECT id, name, phone, id_card as idCard, age, gender, created_at as createdAt FROM patients WHERE id = ?',
    [id]
  );
  return row ? mapRow<Patient>(row) : null;
}

export async function updatePatient(id: number, data: Partial<Patient>): Promise<Patient> {
  const db = await getDb();
  const existing = (await getPatientById(db, id))!;
  run(
    db,
    'UPDATE patients SET name = ?, phone = ?, id_card = ?, age = ?, gender = ? WHERE id = ?',
    [
      data.name ?? existing.name,
      data.phone ?? existing.phone ?? null,
      data.idCard ?? existing.idCard ?? null,
      data.age ?? existing.age ?? null,
      data.gender ?? existing.gender ?? null,
      id,
    ]
  );
  persist();
  return (await getPatientById(db, id))!;
}

export async function checkDuplicateToday(patientId: number, doctorId: number): Promise<boolean> {
  const db = await getDb();
  const row = getOne<Record<string, unknown>>(
    db,
    "SELECT COUNT(*) as c FROM queue WHERE patient_id = ? AND doctor_id = ? AND date(created_at) = date('now','localtime') AND status IN ('waiting','calling','called')",
    [patientId, doctorId]
  );
  return ((row?.c as number) || 0) > 0;
}

export async function generateQueueNumber(departmentId: number, doctorId: number): Promise<string> {
  const db = await getDb();
  const dep = getOne<Record<string, unknown>>(db, 'SELECT name FROM departments WHERE id = ?', [
    departmentId,
  ]);
  const doc = getOne<Record<string, unknown>>(db, 'SELECT name FROM doctors WHERE id = ?', [
    doctorId,
  ]);
  const depCode = ((dep?.name as string) || '科').charAt(0);
  const docCode = ((doc?.name as string) || '医').charAt(0);
  const today = dayjs().format('YYYYMMDD');
  const row = getOne<Record<string, unknown>>(
    db,
    "SELECT COUNT(*) as c FROM queue WHERE doctor_id = ? AND date(created_at) = date('now','localtime')",
    [doctorId]
  );
  const seq = String(((row?.c as number) || 0) + 1).padStart(3, '0');
  return `${today}-${depCode}${docCode}-${seq}`;
}

export async function addToQueue(data: {
  patientId: number;
  departmentId: number;
  doctorId: number;
  isUrgent: boolean;
  urgentReason?: string;
  isFollowUp: boolean;
  followUpNote?: string;
}): Promise<QueueDetail> {
  const db = await getDb();
  const queueNumber = await generateQueueNumber(data.departmentId, data.doctorId);
  const info = run(
    db,
    'INSERT INTO queue (queue_number, patient_id, department_id, doctor_id, is_urgent, urgent_reason, is_follow_up, follow_up_note, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      queueNumber,
      data.patientId,
      data.departmentId,
      data.doctorId,
      data.isUrgent ? 1 : 0,
      data.urgentReason || null,
      data.isFollowUp ? 1 : 0,
      data.followUpNote || null,
      'waiting',
    ]
  );
  run(db, 'INSERT INTO call_records (queue_id, action) VALUES (?, ?)', [info.lastInsertRowid, 'checkin']);
  persist();
  return (await getQueueDetail(info.lastInsertRowid))!;
}

export async function getQueueDetail(queueId: number): Promise<QueueDetail | null> {
  const db = await getDb();
  const row = getOne<Record<string, unknown>>(
    db,
    `SELECT
      q.id as queue_id, q.queue_number as queue_number, q.patient_id as queue_patient_id,
      q.department_id as queue_department_id, q.doctor_id as queue_doctor_id,
      q.is_urgent as queue_is_urgent, q.urgent_reason as queue_urgent_reason,
      q.is_follow_up as queue_is_follow_up, q.follow_up_note as queue_follow_up_note,
      q.status as queue_status, q.check_in_time as queue_check_in_time,
      q.called_time as queue_called_time, q.called_count as queue_called_count,
      q.recover_position as queue_recover_position, q.created_at as queue_created_at,
      p.id as patient_id, p.name as patient_name, p.phone as patient_phone,
      p.id_card as patient_id_card, p.age as patient_age, p.gender as patient_gender,
      p.created_at as patient_created_at,
      d.id as department_id, d.name as department_name, d.created_at as department_created_at,
      doc.id as doctor_id, doc.name as doctor_name, doc.department_id as doctor_department_id,
      doc.title as doctor_title, doc.is_active as doctor_is_active, doc.created_at as doctor_created_at
    FROM queue q
    JOIN patients p ON q.patient_id = p.id
    JOIN departments d ON q.department_id = d.id
    JOIN doctors doc ON q.doctor_id = doc.id
    WHERE q.id = ?`,
    [queueId]
  );
  if (!row) return null;
  return splitPrefixedRow(row);
}

function splitPrefixedRow(row: Record<string, unknown>): QueueDetail {
  const result: Record<string, unknown> = {};
  for (const key in row) {
    if (key.startsWith('queue_')) {
      if (!result.queue) result.queue = {};
      (result.queue as Record<string, unknown>)[camelCase(key.slice(6))] = row[key];
    } else if (key.startsWith('patient_')) {
      if (!result.patient) result.patient = {};
      (result.patient as Record<string, unknown>)[camelCase(key.slice(8))] = row[key];
    } else if (key.startsWith('department_')) {
      if (!result.department) result.department = {};
      (result.department as Record<string, unknown>)[camelCase(key.slice(11))] = row[key];
    } else if (key.startsWith('doctor_')) {
      if (!result.doctor) result.doctor = {};
      (result.doctor as Record<string, unknown>)[camelCase(key.slice(7))] = row[key];
    }
  }
  return result as unknown as QueueDetail;
}

export async function getTodayQueue(doctorId?: number): Promise<QueueDetail[]> {
  const db = await getDb();
  let sql = `SELECT
    q.id as queue_id, q.queue_number as queue_number, q.patient_id as queue_patient_id,
    q.department_id as queue_department_id, q.doctor_id as queue_doctor_id,
    q.is_urgent as queue_is_urgent, q.urgent_reason as queue_urgent_reason,
    q.is_follow_up as queue_is_follow_up, q.follow_up_note as queue_follow_up_note,
    q.status as queue_status, q.check_in_time as queue_check_in_time,
    q.called_time as queue_called_time, q.called_count as queue_called_count,
    q.recover_position as queue_recover_position, q.created_at as queue_created_at,
    p.id as patient_id, p.name as patient_name, p.phone as patient_phone,
    p.id_card as patient_id_card, p.age as patient_age, p.gender as patient_gender,
    p.created_at as patient_created_at,
    d.id as department_id, d.name as department_name, d.created_at as department_created_at,
    doc.id as doctor_id, doc.name as doctor_name, doc.department_id as doctor_department_id,
    doc.title as doctor_title, doc.is_active as doctor_is_active, doc.created_at as doctor_created_at
  FROM queue q
  JOIN patients p ON q.patient_id = p.id
  JOIN departments d ON q.department_id = d.id
  JOIN doctors doc ON q.doctor_id = doc.id
  WHERE date(q.created_at) = date('now','localtime')`;
  const params: unknown[] = [];
  if (doctorId) {
    sql += ' AND q.doctor_id = ?';
    params.push(doctorId);
  }
  sql +=
    " ORDER BY CASE q.status WHEN 'calling' THEN 0 WHEN 'waiting' THEN 1 WHEN 'recovered' THEN 2 WHEN 'passed' THEN 3 WHEN 'called' THEN 4 ELSE 5 END, q.is_urgent DESC, q.is_follow_up DESC, q.id";
  const rows = getAll<Record<string, unknown>>(db, sql, params);
  return rows.map((r) => splitPrefixedRow(r));
}

export async function callNext(doctorId: number): Promise<QueueDetail | null> {
  const db = await getDb();
  const doctor = getOne<Record<string, unknown>>(db, 'SELECT is_active FROM doctors WHERE id = ?', [
    doctorId,
  ]);
  if (!doctor || (doctor.is_active as number) === 0) {
    throw new Error('该医生已停诊，无法继续叫号');
  }
  const row = getOne<Record<string, unknown>>(
    db,
    `SELECT id FROM queue
     WHERE doctor_id = ? AND status IN ('waiting','recovered')
     ORDER BY is_urgent DESC, CASE status WHEN 'recovered' THEN 0 ELSE 1 END, id
     LIMIT 1`,
    [doctorId]
  );
  if (!row) return null;
  return callNumber(row.id as number);
}

export async function callNumber(queueId: number): Promise<QueueDetail | null> {
  const db = await getDb();
  const q = getOne<Record<string, unknown>>(db, 'SELECT doctor_id, status FROM queue WHERE id = ?', [
    queueId,
  ]) as { doctor_id: number; status: QueueStatus } | null;
  if (!q) return null;
  const doctor = getOne<Record<string, unknown>>(db, 'SELECT is_active FROM doctors WHERE id = ?', [
    q.doctor_id,
  ]);
  if (!doctor || (doctor.is_active as number) === 0) {
    throw new Error('该医生已停诊，无法叫号');
  }
  if (!['waiting', 'recovered', 'passed'].includes(q.status)) {
    return getQueueDetail(queueId);
  }
  const action = q.status === 'passed' ? 'recall' : 'call';
  run(
    db,
    "UPDATE queue SET status = 'calling', called_time = datetime('now','localtime'), called_count = called_count + 1 WHERE id = ?",
    [queueId]
  );
  run(db, 'INSERT INTO call_records (queue_id, action) VALUES (?, ?)', [queueId, action]);
  persist();
  return getQueueDetail(queueId);
}

export async function passNumber(queueId: number): Promise<QueueDetail | null> {
  const db = await getDb();
  run(db, "UPDATE queue SET status = 'passed' WHERE id = ?", [queueId]);
  run(db, 'INSERT INTO call_records (queue_id, action) VALUES (?, ?)', [queueId, 'pass']);
  persist();
  return getQueueDetail(queueId);
}

export async function recoverNumber(queueId: number): Promise<QueueDetail | null> {
  const db = await getDb();
  const q = getOne<Record<string, unknown>>(db, 'SELECT id, doctor_id FROM queue WHERE id = ?', [
    queueId,
  ]) as { id: number; doctor_id: number } | null;
  if (!q) return null;
  const nextWaiting = getOne<Record<string, unknown>>(
    db,
    "SELECT id FROM queue WHERE doctor_id = ? AND status = 'waiting' AND id > ? ORDER BY id LIMIT 1",
    [q.doctor_id, queueId]
  );
  const insertAfter = nextWaiting ? (nextWaiting.id as number) - 0.5 : queueId + 1000;
  run(db, "UPDATE queue SET status = 'recovered', recover_position = ? WHERE id = ?", [
    insertAfter,
    queueId,
  ]);
  run(db, 'INSERT INTO call_records (queue_id, action) VALUES (?, ?)', [queueId, 'recover']);
  persist();
  return getQueueDetail(queueId);
}

export async function changeDoctor(
  queueId: number,
  newDoctorId: number,
  note?: string
): Promise<QueueDetail | null> {
  const db = await getDb();
  const q = getOne<Record<string, unknown>>(db, 'SELECT doctor_id FROM queue WHERE id = ?', [queueId]);
  if (!q) return null;
  const newDoctor = getOne<Record<string, unknown>>(
    db,
    'SELECT department_id, is_active FROM doctors WHERE id = ?',
    [newDoctorId]
  ) as { department_id: number; is_active: number } | null;
  if (!newDoctor) return null;
  if (newDoctor.is_active === 0) {
    throw new Error('目标医生已停诊');
  }
  run(db, 'UPDATE queue SET doctor_id = ?, department_id = ? WHERE id = ?', [
    newDoctorId,
    newDoctor.department_id,
    queueId,
  ]);
  run(
    db,
    'INSERT INTO call_records (queue_id, action, from_doctor_id, to_doctor_id, note) VALUES (?, ?, ?, ?, ?)',
    [queueId, 'change_doctor', q.doctor_id as number, newDoctorId, note || null]
  );
  persist();
  return getQueueDetail(queueId);
}

export async function cancelNumber(queueId: number, note?: string): Promise<QueueDetail | null> {
  const db = await getDb();
  run(db, "UPDATE queue SET status = 'cancelled' WHERE id = ?", [queueId]);
  run(db, 'INSERT INTO call_records (queue_id, action, note) VALUES (?, ?, ?)', [
    queueId,
    'cancel',
    note || null,
  ]);
  persist();
  return getQueueDetail(queueId);
}

export async function finishCall(queueId: number): Promise<QueueDetail | null> {
  const db = await getDb();
  run(db, "UPDATE queue SET status = 'called' WHERE id = ?", [queueId]);
  persist();
  return getQueueDetail(queueId);
}

export async function getCallRecords(date?: string): Promise<CallRecord[]> {
  const db = await getDb();
  const sql = date
    ? "SELECT id, queue_id as queueId, action, from_doctor_id as fromDoctorId, to_doctor_id as toDoctorId, note, created_at as createdAt FROM call_records WHERE date(created_at) = ? ORDER BY id DESC"
    : "SELECT id, queue_id as queueId, action, from_doctor_id as fromDoctorId, to_doctor_id as toDoctorId, note, created_at as createdAt FROM call_records ORDER BY id DESC LIMIT 200";
  const params = date ? [date] : [];
  const rows = getAll<Record<string, unknown>>(db, sql, params);
  return rows.map((r) => mapRow<CallRecord>(r));
}

export async function getDailyStats(startDate?: string, endDate?: string): Promise<DailyStat[]> {
  const db = await getDb();
  const start = startDate || dayjs().subtract(7, 'day').format('YYYY-MM-DD');
  const end = endDate || dayjs().format('YYYY-MM-DD');
  const rows = getAll<Record<string, unknown>>(
    db,
    `SELECT
      date(created_at) as date,
      COUNT(*) as totalCount,
      AVG(CASE WHEN called_time IS NOT NULL THEN (julianday(called_time) - julianday(check_in_time)) * 1440 END) as avgWaitMinutes,
      MAX(CASE WHEN called_time IS NOT NULL THEN (julianday(called_time) - julianday(check_in_time)) * 1440 ELSE 0 END) as maxWaitMinutes,
      SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passedCount,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledCount,
      SUM(is_urgent) as urgentCount
    FROM queue
    WHERE date(created_at) BETWEEN ? AND ?
    GROUP BY date(created_at)
    ORDER BY date DESC`,
    [start, end]
  );
  const recordStats = getAll<Record<string, unknown>>(
    db,
    `SELECT
      date(created_at) as date,
      SUM(CASE WHEN action = 'recall' THEN 1 ELSE 0 END) as recallCount,
      SUM(CASE WHEN action = 'change_doctor' THEN 1 ELSE 0 END) as changeDoctorCount
    FROM call_records
    WHERE date(created_at) BETWEEN ? AND ?
    GROUP BY date(created_at)`,
    [start, end]
  );
  const recordMap = new Map<string, Record<string, unknown>>();
  for (const r of recordStats) recordMap.set(r.date as string, r);
  return rows.map((r) => {
    const rs = recordMap.get(r.date as string) || {};
    return {
      date: r.date as string,
      totalCount: r.totalCount as number,
      avgWaitMinutes: Math.round((r.avgWaitMinutes as number) || 0),
      maxWaitMinutes: Math.round((r.maxWaitMinutes as number) || 0),
      passedCount: r.passedCount as number,
      cancelledCount: r.cancelledCount as number,
      urgentCount: r.urgentCount as number,
      recallCount: (rs.recallCount as number) || 0,
      changeDoctorCount: (rs.changeDoctorCount as number) || 0,
    };
  });
}

export async function exportWaitingList(): Promise<string> {
  const db = await getDb();
  const rows = getAll<Record<string, unknown>>(
    db,
    `SELECT
      q.queue_number as queueNumber,
      p.name as patientName,
      d.name as departmentName,
      doc.name as doctorName,
      q.is_urgent as isUrgent,
      q.is_follow_up as isFollowUp,
      q.check_in_time as checkInTime,
      (julianday('now','localtime') - julianday(q.check_in_time)) * 1440 as waitMinutes
    FROM queue q
    JOIN patients p ON q.patient_id = p.id
    JOIN departments d ON q.department_id = d.id
    JOIN doctors doc ON q.doctor_id = doc.id
    WHERE date(q.created_at) = date('now','localtime')
      AND q.status IN ('waiting','recovered','calling')
    ORDER BY q.is_urgent DESC, q.id`
  ) as unknown as WaitingExportRow[];
  const userData = app.getPath('userData');
  const exportDir = path.join(userData, 'exports');
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
  const fileName = `未叫患者名单_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`;
  const filePath = path.join(exportDir, fileName);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('未叫患者名单');
  sheet.columns = [
    { header: '号码', key: 'queueNumber', width: 20 },
    { header: '姓名', key: 'patientName', width: 12 },
    { header: '科室', key: 'departmentName', width: 12 },
    { header: '医生', key: 'doctorName', width: 12 },
    { header: '加急', key: 'isUrgent', width: 6 },
    { header: '复诊', key: 'isFollowUp', width: 6 },
    { header: '签到时间', key: 'checkInTime', width: 20 },
    { header: '已等待(分钟)', key: 'waitMinutes', width: 12 },
  ];
  for (const r of rows) {
    sheet.addRow({
      queueNumber: r.queueNumber,
      patientName: r.patientName,
      departmentName: r.departmentName,
      doctorName: r.doctorName,
      isUrgent: r.isUrgent ? '是' : '否',
      isFollowUp: r.isFollowUp ? '是' : '否',
      checkInTime: r.checkInTime,
      waitMinutes: Math.round((r.waitMinutes as unknown as number) || 0),
    });
  }
  await workbook.xlsx.writeFile(filePath);
  await setAppState('lunchBreakExportPath', filePath);
  return filePath;
}

export async function setAppState(key: string, value: string) {
  const db = await getDb();
  const existing = getOne<Record<string, unknown>>(db, 'SELECT key FROM app_state WHERE key = ?', [
    key,
  ]);
  if (existing) {
    run(db, 'UPDATE app_state SET value = ? WHERE key = ?', [value, key]);
  } else {
    run(db, 'INSERT INTO app_state (key, value) VALUES (?, ?)', [key, value]);
  }
  persist();
}

export async function getAppState(key: string): Promise<string | null> {
  const db = await getDb();
  const row = getOne<Record<string, unknown>>(db, 'SELECT value FROM app_state WHERE key = ?', [key]);
  return row ? (row.value as string) : null;
}

export async function deleteAppState(key: string) {
  const db = await getDb();
  run(db, 'DELETE FROM app_state WHERE key = ?', [key]);
  persist();
}

export function generateReceiptHtml(detail: QueueDetail): string {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const type = detail.queue.isUrgent ? '加急' : detail.queue.isFollowUp ? '复诊' : '初诊';
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Microsoft YaHei', sans-serif; width: 300px; padding: 10px; margin: 0; }
  .title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 8px; }
  .sub { text-align: center; font-size: 12px; color: #666; margin-bottom: 12px; }
  .big-num { text-align: center; font-size: 32px; font-weight: bold; color: #d32f2f; margin: 12px 0; letter-spacing: 2px; }
  .row { font-size: 14px; margin: 4px 0; }
  .label { color: #666; }
  .val { font-weight: bold; }
  .footer { text-align: center; font-size: 12px; color: #999; margin-top: 16px; padding-top: 8px; border-top: 1px dashed #ccc; }
  .urgent-tag { display: inline-block; background: #ff9800; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 6px; }
</style>
</head>
<body>
  <div class="title">小诊所叫号单</div>
  <div class="sub">${now}</div>
  <div class="big-num">${detail.queue.queueNumber.split('-')[2]}</div>
  <div class="row"><span class="label">患者：</span><span class="val">${detail.patient.name}</span>${
    detail.queue.isUrgent ? "<span class='urgent-tag'>加急</span>" : ''
  }</div>
  <div class="row"><span class="label">类型：</span><span class="val">${type}</span></div>
  <div class="row"><span class="label">科室：</span><span class="val">${
    detail.department.name
  }</span></div>
  <div class="row"><span class="label">医生：</span><span class="val">${
    detail.doctor.name
  } ${detail.doctor.title || ''}</span></div>
  <div class="row"><span class="label">签到：</span><span class="val">${
    detail.queue.checkInTime
  }</span></div>
  ${
    detail.queue.followUpNote
      ? `<div class="row"><span class="label">备注：</span><span class="val">${detail.queue.followUpNote}</span></div>`
      : ''
  }
  ${
    detail.queue.urgentReason
      ? `<div class="row"><span class="label">加急原因：</span><span class="val">${detail.queue.urgentReason}</span></div>`
      : ''
  }
  <div class="footer">请在候诊区等候叫号</div>
</body>
</html>`;
}
