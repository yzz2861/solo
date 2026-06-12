import { getDB, getRows, getOne, saveDB } from '../db.ts';
import { v4 as uuidv4 } from 'uuid';
import type {
  StatsOverview,
  Attachment,
  AttachmentModel,
  Location,
  Patient,
  PatientAttachment,
  InventoryAdjustment,
  FollowUpRecord,
} from '../../shared/types.js';

const DEFAULT_OPERATOR = 'u_admin';

export async function getStatsOverview(): Promise<StatsOverview> {
  const db = await getDB();
  const totalStmt = db.prepare('SELECT COUNT(*) as c FROM attachments WHERE status != ?');
  totalStmt.bind(['recalled']);
  const total = (getOne<{ c: number }>(totalStmt)?.c ?? 0);

  const boundStmt = db.prepare("SELECT COUNT(*) as c FROM attachments WHERE status = 'bound'");
  const bound = getOne<{ c: number }>(boundStmt)?.c ?? 0;

  const missingStmt = db.prepare(
    "SELECT COUNT(*) as c FROM patient_attachments WHERE missing_reason IS NOT NULL AND missing_reason != ''"
  );
  const missing = getOne<{ c: number }>(missingStmt)?.c ?? 0;

  const nearStmt = db.prepare(
    "SELECT COUNT(*) as c FROM attachments WHERE expiry_date IS NOT NULL AND expiry_date != '' AND date(expiry_date) <= date('now', '+30 day') AND status = 'available'"
  );
  const near = getOne<{ c: number }>(nearStmt)?.c ?? 0;

  return { totalStock: total, boundCount: bound, missingCount: missing, nearExpiryCount: near };
}

export async function getAttachments(
  status?: 'available' | 'bound' | 'recalled' | 'expired'
): Promise<Attachment[]> {
  const db = await getDB();
  let sql = `
    SELECT a.*,
           am.name AS 'model.name', am.type AS 'model.type', am.description AS 'model.description',
           l.clinic_room AS 'location.clinic_room', l.shelf AS 'location.shelf', l.slot AS 'location.slot'
    FROM attachments a
    LEFT JOIN attachment_models am ON a.model_id = am.id
    LEFT JOIN locations l ON a.location_id = l.id
  `;
  const params: any[] = [];
  if (status) {
    sql += " WHERE a.status = ?";
    params.push(status);
  }
  sql += " ORDER BY a.created_at DESC";
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const raw = getRows<any>(stmt);
  return raw.map((r) => ({
    id: r.id,
    code: r.code,
    model_id: r.model_id,
    batch_no: r.batch_no,
    location_id: r.location_id,
    status: r.status,
    expiry_date: r.expiry_date,
    created_at: r.created_at,
    model: r['model.name']
      ? ({
          id: r.model_id,
          name: r['model.name'],
          type: r['model.type'],
          description: r['model.description'] ?? null,
        } as AttachmentModel)
      : undefined,
    location: r['location.clinic_room']
      ? ({
          id: r.location_id,
          clinic_room: r['location.clinic_room'],
          shelf: r['location.shelf'],
          slot: r['location.slot'],
        } as Location)
      : null,
  }));
}

export async function getAttachmentByCode(code: string): Promise<Attachment | null> {
  const db = await getDB();
  const sql = `
    SELECT a.*,
           am.id AS 'model.id', am.name AS 'model.name', am.type AS 'model.type', am.description AS 'model.description',
           l.id AS 'location.id', l.clinic_room AS 'location.clinic_room', l.shelf AS 'location.shelf', l.slot AS 'location.slot'
    FROM attachments a
    LEFT JOIN attachment_models am ON a.model_id = am.id
    LEFT JOIN locations l ON a.location_id = l.id
    WHERE a.code = ?
  `;
  const stmt = db.prepare(sql);
  stmt.bind([code]);
  const r = getOne<any>(stmt);
  if (!r) return null;
  return {
    id: r.id,
    code: r.code,
    model_id: r.model_id,
    batch_no: r.batch_no,
    location_id: r.location_id,
    status: r.status,
    expiry_date: r.expiry_date,
    created_at: r.created_at,
    model: r['model.id']
      ? ({
          id: r['model.id'],
          name: r['model.name'],
          type: r['model.type'],
          description: r['model.description'] ?? null,
        } as AttachmentModel)
      : undefined,
    location: r['location.id']
      ? ({
          id: r['location.id'],
          clinic_room: r['location.clinic_room'],
          shelf: r['location.shelf'],
          slot: r['location.slot'],
        } as Location)
      : null,
  };
}

export async function getBoundPatientByAttachmentId(attachmentId: string): Promise<Patient | null> {
  const db = await getDB();
  const sql = `
    SELECT p.* FROM patients p
    INNER JOIN patient_attachments pa ON p.id = pa.patient_id
    WHERE pa.attachment_id = ?
    LIMIT 1
  `;
  const stmt = db.prepare(sql);
  stmt.bind([attachmentId]);
  return getOne<Patient>(stmt);
}

export async function createPatient(data: Omit<Patient, 'id' | 'created_at'>): Promise<Patient> {
  const db = await getDB();
  const id = 'p_' + uuidv4().slice(0, 8);
  const stmt = db.prepare('INSERT INTO patients (id, name, phone, treatment_plan) VALUES (?, ?, ?, ?)');
  stmt.run([id, data.name, data.phone ?? null, data.treatment_plan ?? null]);
  await saveDB();
  const getStmt = db.prepare('SELECT * FROM patients WHERE id = ?');
  getStmt.bind([id]);
  return getOne<Patient>(getStmt)!;
}

export async function getPatients(): Promise<Patient[]> {
  const db = await getDB();
  const stmt = db.prepare('SELECT * FROM patients ORDER BY created_at DESC');
  return getRows<Patient>(stmt);
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const db = await getDB();
  const stmt = db.prepare('SELECT * FROM patients WHERE id = ?');
  stmt.bind([id]);
  return getOne<Patient>(stmt);
}

export async function getPatientDetail(id: string) {
  const db = await getDB();
  const patient = await getPatientById(id);
  if (!patient) return null;

  const bindSql = `
    SELECT pa.*,
           a.code AS 'att.code', a.batch_no AS 'att.batch_no', a.status AS 'att.status', a.expiry_date AS 'att.expiry_date',
           am.id AS 'model.id', am.name AS 'model.name', am.type AS 'model.type'
    FROM patient_attachments pa
    LEFT JOIN attachments a ON pa.attachment_id = a.id
    LEFT JOIN attachment_models am ON a.model_id = am.id
    WHERE pa.patient_id = ?
    ORDER BY pa.follow_up_date DESC
  `;
  const bindStmt = db.prepare(bindSql);
  bindStmt.bind([id]);
  const bindingsRaw = getRows<any>(bindStmt);
  const bindings: PatientAttachment[] = bindingsRaw.map((r) => ({
    id: r.id,
    patient_id: r.patient_id,
    attachment_id: r.attachment_id,
    aligner_batch: r.aligner_batch,
    follow_up_date: r.follow_up_date,
    clinic_room: r.clinic_room,
    missing_reason: r.missing_reason,
    is_prepared: r.is_prepared,
    bound_at: r.bound_at,
    attachment: r['att.code']
      ? {
          id: r.attachment_id,
          code: r['att.code'],
          model_id: r['model.id'],
          batch_no: r['att.batch_no'],
          location_id: null,
          status: r['att.status'],
          expiry_date: r['att.expiry_date'],
          created_at: '',
          model: {
            id: r['model.id'],
            name: r['model.name'],
            type: r['model.type'],
          } as AttachmentModel,
        }
      : undefined,
  }));

  const fuStmt = db.prepare(
    'SELECT * FROM follow_up_records WHERE patient_id = ? ORDER BY visit_date DESC'
  );
  fuStmt.bind([id]);
  const followUps: FollowUpRecord[] = getRows<FollowUpRecord>(fuStmt);

  return { patient, bindings, followUps };
}

export async function bindAttachmentPatient(params: {
  attachmentId: string;
  patientId: string;
  alignerBatch: string;
  followUpDate: string;
  clinicRoom: string;
  missingReason?: string | null;
}): Promise<{ success: boolean; message: string; binding?: PatientAttachment }> {
  const db = await getDB();
  const checkStmt = db.prepare(
    'SELECT * FROM patient_attachments WHERE attachment_id = ?'
  );
  checkStmt.bind([params.attachmentId]);
  const existing = getOne<PatientAttachment>(checkStmt);
  if (existing) {
    return { success: false, message: '该附件已被绑定，重复扫码不会再次扣减库存' };
  }
  const attStmt = db.prepare('SELECT * FROM attachments WHERE id = ?');
  attStmt.bind([params.attachmentId]);
  const attachment = getOne<Attachment>(attStmt);
  if (!attachment) return { success: false, message: '附件不存在' };
  if (attachment.status === 'recalled') return { success: false, message: '该批次已被召回' };

  const bindId = 'pa_' + uuidv4().slice(0, 8);
  const insertStmt = db.prepare(
    `INSERT INTO patient_attachments (id, patient_id, attachment_id, aligner_batch, follow_up_date, clinic_room, missing_reason, is_prepared)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
  );
  insertStmt.run([
    bindId,
    params.patientId,
    params.attachmentId,
    params.alignerBatch,
    params.followUpDate,
    params.clinicRoom,
    params.missingReason ?? null,
  ]);
  db.prepare("UPDATE attachments SET status = 'bound' WHERE id = ?").run([params.attachmentId]);
  await saveDB();

  const getB = db.prepare('SELECT * FROM patient_attachments WHERE id = ?');
  getB.bind([bindId]);
  const binding = getOne<PatientAttachment>(getB)!;
  return { success: true, message: '绑定成功', binding };
}

export async function getPatientsTomorrow(clinicRoom?: string) {
  const db = await getDB();
  let sql = `
    SELECT pa.*, p.name AS 'p.name', p.phone AS 'p.phone', p.treatment_plan AS 'p.treatment_plan',
           a.code AS 'att.code', a.batch_no AS 'att.batch_no', a.status AS 'att.status',
           am.id AS 'model.id', am.name AS 'model.name', am.type AS 'model.type'
    FROM patient_attachments pa
    LEFT JOIN patients p ON pa.patient_id = p.id
    LEFT JOIN attachments a ON pa.attachment_id = a.id
    LEFT JOIN attachment_models am ON a.model_id = am.id
    WHERE date(pa.follow_up_date) = date('now', '+1 day')
  `;
  const params: any[] = [];
  if (clinicRoom) {
    sql += ' AND pa.clinic_room = ?';
    params.push(clinicRoom);
  }
  sql += ' ORDER BY pa.clinic_room, pa.follow_up_date';
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = getRows<any>(stmt);

  const byPatient = new Map<string, any>();
  for (const r of rows) {
    if (!byPatient.has(r.patient_id)) {
      byPatient.set(r.patient_id, {
        patient: {
          id: r.patient_id,
          name: r['p.name'],
          phone: r['p.phone'],
          treatment_plan: r['p.treatment_plan'],
        },
        doctor: '',
        clinicRoom: r.clinic_room,
        requiredAttachments: [],
        isPrepared: r.is_prepared === 1,
        bindingId: r.id,
      });
    }
    byPatient.get(r.patient_id).requiredAttachments.push({
      id: r.attachment_id,
      code: r['att.code'],
      batch_no: r['att.batch_no'],
      status: r['att.status'],
      model: { id: r['model.id'], name: r['model.name'], type: r['model.type'] },
      missing_reason: r.missing_reason,
    });
  }
  return Array.from(byPatient.values());
}

export async function setPrepared(bindingId: string, isPrepared: boolean) {
  const db = await getDB();
  const stmt = db.prepare('UPDATE patient_attachments SET is_prepared = ? WHERE id = ?');
  stmt.run([isPrepared ? 1 : 0, bindingId]);
  await saveDB();
  return { success: true };
}

export async function getMissingAttachments() {
  const db = await getDB();
  const sql = `
    SELECT pa.*, p.name AS 'p.name', p.phone AS 'p.phone',
           a.code AS 'att.code', a.batch_no AS 'att.batch_no',
           am.name AS 'model.name', am.type AS 'model.type'
    FROM patient_attachments pa
    LEFT JOIN patients p ON pa.patient_id = p.id
    LEFT JOIN attachments a ON pa.attachment_id = a.id
    LEFT JOIN attachment_models am ON a.model_id = am.id
    WHERE pa.missing_reason IS NOT NULL AND pa.missing_reason != ''
    ORDER BY pa.follow_up_date DESC
  `;
  return getRows<any>(db.prepare(sql));
}

export async function getNearExpiryAttachments(days = 30) {
  const db = await getDB();
  const sql = `
    SELECT a.*, am.name AS 'model.name', am.type AS 'model.type',
           l.clinic_room AS 'loc.clinic', l.shelf AS 'loc.shelf', l.slot AS 'loc.slot',
           CAST(julianday(a.expiry_date) - julianday('now') AS INTEGER) AS days_left
    FROM attachments a
    LEFT JOIN attachment_models am ON a.model_id = am.id
    LEFT JOIN locations l ON a.location_id = l.id
    WHERE a.expiry_date IS NOT NULL AND a.expiry_date != ''
      AND date(a.expiry_date) <= date('now', '+' || ? || ' day')
      AND a.status = 'available'
    ORDER BY a.expiry_date ASC
  `;
  const stmt = db.prepare(sql);
  stmt.bind([days]);
  return getRows<any>(stmt);
}

export async function getAdjustments(from?: string, to?: string) {
  const db = await getDB();
  let sql = `
    SELECT ia.*, a.code AS 'att.code', u.username AS 'op.name'
    FROM inventory_adjustments ia
    LEFT JOIN attachments a ON ia.attachment_id = a.id
    LEFT JOIN users u ON ia.operator_id = u.id
  `;
  const params: any[] = [];
  if (from || to) {
    sql += ' WHERE 1=1';
    if (from) {
      sql += ' AND date(ia.created_at) >= date(?)';
      params.push(from);
    }
    if (to) {
      sql += ' AND date(ia.created_at) <= date(?)';
      params.push(to);
    }
  }
  sql += ' ORDER BY ia.created_at DESC';
  const stmt = db.prepare(sql);
  stmt.bind(params);
  return getRows<any>(stmt);
}

export async function inboundAttachment(params: {
  modelId: string;
  batchNo: string;
  quantity: number;
  locationId: string;
  expiryDate?: string | null;
}) {
  const db = await getDB();
  const created: string[] = [];
  for (let i = 0; i < params.quantity; i++) {
    const id = 'a_' + uuidv4().slice(0, 8);
    const code = 'ATT' + Date.now().toString().slice(-6) + String(1000 + i).slice(1);
    const stmt = db.prepare(
      'INSERT INTO attachments (id, code, model_id, batch_no, location_id, status, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run([
      id,
      code,
      params.modelId,
      params.batchNo,
      params.locationId,
      'available',
      params.expiryDate ?? null,
    ]);
    created.push(id);
  }
  await saveDB();
  return { success: true, count: created.length, ids: created };
}

export async function adjustInventory(attachmentId: string, delta: number, reason: string) {
  const db = await getDB();
  const id = 'adj_' + uuidv4().slice(0, 8);
  const stmt = db.prepare(
    'INSERT INTO inventory_adjustments (id, attachment_id, delta, reason, operator_id) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run([id, attachmentId, delta, reason, DEFAULT_OPERATOR]);
  await saveDB();
  return { success: true, id };
}

export async function getBatches() {
  const db = await getDB();
  const sql = `
    SELECT a.batch_no,
           COUNT(*) AS total,
           SUM(CASE WHEN a.status = 'available' THEN 1 ELSE 0 END) AS available_count,
           SUM(CASE WHEN a.status = 'bound' THEN 1 ELSE 0 END) AS bound_count,
           SUM(CASE WHEN a.status = 'recalled' THEN 1 ELSE 0 END) AS recalled_count,
           MIN(a.expiry_date) AS earliest_expiry
    FROM attachments a
    GROUP BY a.batch_no
    ORDER BY a.batch_no DESC
  `;
  return getRows<any>(db.prepare(sql));
}

export async function recallBatch(batchNo: string) {
  const db = await getDB();
  const affectedSql = `
    SELECT a.*, p.*, pa.follow_up_date
    FROM attachments a
    LEFT JOIN patient_attachments pa ON a.id = pa.attachment_id
    LEFT JOIN patients p ON pa.patient_id = p.id
    WHERE a.batch_no = ?
  `;
  const stmt = db.prepare(affectedSql);
  stmt.bind([batchNo]);
  const affected = getRows<any>(stmt);

  db.prepare("UPDATE attachments SET status = 'recalled' WHERE batch_no = ?").run([batchNo]);
  await saveDB();

  const patients = Array.from(new Set(affected.filter((r) => r.patient_id).map((r) => r.patient_id))).map(
    (pid) => {
      const r = affected.find((x) => x.patient_id === pid);
      return { id: r.patient_id, name: r.name, phone: r.phone, follow_up_date: r.follow_up_date };
    }
  );

  return {
    batchNo,
    affectedAttachments: affected.map((r) => ({
      id: r.id,
      code: r.code,
      batch_no: r.batch_no,
      status: 'recalled',
    })),
    affectedPatients: patients,
  };
}

export async function getModels(): Promise<AttachmentModel[]> {
  const db = await getDB();
  const stmt = db.prepare('SELECT * FROM attachment_models ORDER BY name');
  return getRows<AttachmentModel>(stmt);
}

export async function getLocations(): Promise<Location[]> {
  const db = await getDB();
  const stmt = db.prepare('SELECT * FROM locations ORDER BY clinic_room, shelf, slot');
  return getRows<Location>(stmt);
}
