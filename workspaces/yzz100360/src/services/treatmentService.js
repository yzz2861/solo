const db = require('../db');
const batchService = require('./batchService');

const createTreatment = async (treatmentData) => {
  const { patient_id, patient_name, doctor, treatment_type, treatment_date, clinic_room, notes } = treatmentData;

  const result = await db.run(
    `INSERT INTO treatment_records 
     (patient_id, patient_name, doctor, treatment_type, treatment_date, clinic_room, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
    [patient_id, patient_name, doctor, treatment_type, treatment_date, clinic_room, notes || '']
  );

  return getTreatmentById(result.lastID);
};

const getTreatmentById = async (id) => {
  const treatment = await db.get('SELECT * FROM treatment_records WHERE id = ?', [id]);
  if (!treatment) return null;

  const instruments = await db.all(
    `SELECT ti.*, sb.qr_code, sb.bag_no, sb.status as batch_status, sb.expire_at
     FROM treatment_instruments ti
     JOIN sterilization_batches sb ON ti.batch_id = sb.id
     WHERE ti.treatment_id = ?`,
    [id]
  );

  return { ...treatment, instruments };
};

const listTreatments = async (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.treatment_date) {
    conditions.push('treatment_date = ?');
    params.push(filters.treatment_date);
  }
  if (filters.patient_id) {
    conditions.push('patient_id = ?');
    params.push(filters.patient_id);
  }
  if (filters.patient_name) {
    conditions.push('patient_name LIKE ?');
    params.push(`%${filters.patient_name}%`);
  }
  if (filters.doctor) {
    conditions.push('doctor = ?');
    params.push(filters.doctor);
  }
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return db.all(
    `SELECT * FROM treatment_records ${where} ORDER BY treatment_date DESC, id DESC LIMIT 100`,
    params
  );
};

const pickupBatchForTreatment = async (treatmentId, qrCode, operator) => {
  const treatment = await db.get('SELECT * FROM treatment_records WHERE id = ?', [treatmentId]);
  if (!treatment) {
    throw new Error('治疗记录不存在');
  }

  const batch = await db.get('SELECT * FROM sterilization_batches WHERE qr_code = ?', [qrCode]);
  if (!batch) {
    throw new Error('灭菌批次不存在');
  }

  if (batch.status !== 'stored') {
    throw new Error('只有已入柜的批次才能发放领取');
  }

  const now = new Date().toISOString();

  await batchService.updateBatchStatus(qrCode, 'issued', operator, {
    action: 'issue',
    notes: `发放给治疗 #${treatmentId} ${treatment.patient_name}`,
  });

  await db.run(
    `INSERT INTO treatment_instruments (treatment_id, batch_id, picked_up_at)
     VALUES (?, ?, ?)`,
    [treatmentId, batch.id, now]
  );

  return getTreatmentById(treatmentId);
};

const useBatchInTreatment = async (treatmentId, qrCode, operator) => {
  const treatment = await db.get('SELECT * FROM treatment_records WHERE id = ?', [treatmentId]);
  if (!treatment) {
    throw new Error('治疗记录不存在');
  }

  const batch = await db.get('SELECT * FROM sterilization_batches WHERE qr_code = ?', [qrCode]);
  if (!batch) {
    throw new Error('灭菌批次不存在');
  }

  const ti = await db.get(
    'SELECT * FROM treatment_instruments WHERE treatment_id = ? AND batch_id = ?',
    [treatmentId, batch.id]
  );

  if (!ti) {
    throw new Error('该批次未关联到此治疗，请先领取');
  }

  if (batch.status === 'used') {
    throw new Error('该批次器械已使用过，不能重复使用');
  }

  if (batch.status !== 'issued') {
    throw new Error('只有已发放的批次才能使用');
  }

  const now = new Date().toISOString();

  await batchService.updateBatchStatus(qrCode, 'used', operator, {
    action: 'use',
    notes: `用于治疗 #${treatmentId} 患者 ${treatment.patient_name}`,
  });

  await db.run(
    'UPDATE treatment_instruments SET used_at = ? WHERE id = ?',
    [now, ti.id]
  );

  await db.run(
    "UPDATE treatment_records SET status = 'in_progress' WHERE id = ?",
    [treatmentId]
  );

  return getTreatmentById(treatmentId);
};

const completeTreatment = async (treatmentId) => {
  const result = await db.run(
    "UPDATE treatment_records SET status = 'completed' WHERE id = ?",
    [treatmentId]
  );

  if (result.changes === 0) {
    throw new Error('治疗记录不存在');
  }

  return getTreatmentById(treatmentId);
};

const checkBatchExpiry = async (batchId) => {
  const batch = await db.get('SELECT * FROM sterilization_batches WHERE id = ?', [batchId]);
  if (!batch || !batch.expire_at) {
    return { isExpired: false, isExpiringSoon: false, daysRemaining: null };
  }

  const now = new Date();
  const expireDate = new Date(batch.expire_at);
  const daysRemaining = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));

  return {
    isExpired: daysRemaining <= 0,
    isExpiringSoon: daysRemaining > 0 && daysRemaining <= 3,
    daysRemaining,
    expireAt: batch.expire_at,
  };
};

const getExpiringBatchesForDate = async (dateStr, daysWarning = 3) => {
  const date = new Date(dateStr);
  const warningDate = new Date(date);
  warningDate.setDate(warningDate.getDate() + daysWarning);

  const batches = await db.all(
    `SELECT sb.*, 
      julianday(expire_at) - julianday(?) as days_remaining
     FROM sterilization_batches sb
     WHERE sb.status = 'stored' 
       AND sb.expire_at IS NOT NULL
       AND sb.expire_at <= ?
     ORDER BY sb.expire_at ASC`,
    [dateStr, warningDate.toISOString()]
  );

  return batches.map(b => ({
    ...b,
    days_remaining: Math.ceil(b.days_remaining),
    is_expired: b.days_remaining <= 0,
    is_expiring_soon: b.days_remaining > 0 && b.days_remaining <= daysWarning,
  }));
};

const returnBatchToStorage = async (treatmentId, qrCode, operator, notes = '') => {
  const treatment = await db.get('SELECT * FROM treatment_records WHERE id = ?', [treatmentId]);
  if (!treatment) {
    throw new Error('治疗记录不存在');
  }

  const batch = await db.get('SELECT * FROM sterilization_batches WHERE qr_code = ?', [qrCode]);
  if (!batch) {
    throw new Error('灭菌批次不存在');
  }

  const ti = await db.get(
    'SELECT * FROM treatment_instruments WHERE treatment_id = ? AND batch_id = ?',
    [treatmentId, batch.id]
  );

  if (!ti) {
    throw new Error('该批次未关联到此治疗');
  }

  if (ti.used_at) {
    throw new Error('已用于患者的器械不能回到库存，需重新灭菌');
  }

  if (batch.status !== 'issued') {
    throw new Error('只有已发放的批次才能归还');
  }

  const now = new Date().toISOString();

  await batchService.updateBatchStatus(qrCode, 'stored', operator, {
    action: 'return',
    notes: notes || `未使用，从治疗 #${treatmentId} 归还`,
  });

  await db.run(
    'UPDATE treatment_instruments SET returned_at = ? WHERE id = ?',
    [now, ti.id]
  );

  return getBatchByQRCode(qrCode);
};

const getBatchByQRCode = async (qrCode) => {
  return batchService.getBatchByQRCode(qrCode);
};

module.exports = {
  createTreatment,
  getTreatmentById,
  listTreatments,
  pickupBatchForTreatment,
  useBatchInTreatment,
  completeTreatment,
  checkBatchExpiry,
  getExpiringBatchesForDate,
  returnBatchToStorage,
  getBatchByQRCode,
};
