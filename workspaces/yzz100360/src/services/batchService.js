const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const VALID_STATUSES = ['collected', 'cleaning', 'cleaned', 'sterilizing', 'sterilized', 'sterilization_failed', 'stored', 'issued', 'used'];

const STATUS_TRANSITIONS = {
  collected: ['cleaning'],
  cleaning: ['cleaned', 'collected'],
  cleaned: ['sterilizing'],
  sterilizing: ['sterilized', 'sterilization_failed'],
  sterilized: ['stored'],
  sterilization_failed: [],
  stored: ['issued'],
  issued: ['used', 'stored'],
  used: [],
};

const canTransition = (fromStatus, toStatus) => {
  const allowed = STATUS_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
};

const generateQRCode = () => {
  return 'QR-' + uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
};

const generateBagNo = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BAG-${dateStr}-${random}`;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const createBatch = async (instrumentIds, operator, location, notes = '', qrCode = null) => {
  const finalQrCode = qrCode || generateQRCode();
  const bagNo = generateBagNo();
  const now = new Date().toISOString();

  const existing = await db.get('SELECT id FROM sterilization_batches WHERE qr_code = ?', [finalQrCode]);
  if (existing) {
    throw new Error('该二维码已存在，请使用其他二维码');
  }

  const result = await db.run(
    `INSERT INTO sterilization_batches 
     (qr_code, bag_no, status, collected_at, operator_collect, location, notes)
     VALUES (?, ?, 'collected', ?, ?, ?, ?)`,
    [finalQrCode, bagNo, now, operator, location, notes]
  );

  const batchId = result.lastID;

  const insertStmt = db.prepare('INSERT INTO batch_items (batch_id, instrument_id) VALUES (?, ?)');
  for (const instrumentId of instrumentIds) {
    await insertStmt.run(batchId, instrumentId);
  }
  await insertStmt.finalize();

  await db.run(
    `INSERT INTO scan_records (qr_code, action, status, location, operator, notes)
     VALUES (?, 'collect', 'collected', ?, ?, ?)`,
    [finalQrCode, location, operator, notes]
  );

  return getBatchById(batchId);
};

const getBatchById = async (id) => {
  const batch = await db.get('SELECT * FROM sterilization_batches WHERE id = ?', [id]);
  if (!batch) return null;

  const items = await db.all(
    `SELECT bi.id, bi.instrument_id, i.code, i.name, i.type, i.description
     FROM batch_items bi
     JOIN instruments i ON bi.instrument_id = i.id
     WHERE bi.batch_id = ?`,
    [id]
  );

  const scans = await db.all(
    'SELECT * FROM scan_records WHERE qr_code = ? ORDER BY timestamp ASC',
    [batch.qr_code]
  );

  return { ...batch, items, scan_history: scans };
};

const getBatchByQRCode = async (qrCode) => {
  const batch = await db.get('SELECT * FROM sterilization_batches WHERE qr_code = ?', [qrCode]);
  if (!batch) return null;
  return getBatchById(batch.id);
};

const updateBatchStatus = async (qrCode, newStatus, operator, extra = {}) => {
  const batch = await db.get('SELECT * FROM sterilization_batches WHERE qr_code = ?', [qrCode]);
  if (!batch) {
    throw new Error('批次不存在，请先回收扫码');
  }

  if (!canTransition(batch.status, newStatus)) {
    throw new Error(`无法从 ${batch.status} 状态流转到 ${newStatus} 状态`);
  }

  if (newStatus === 'sterilization_failed') {
    throw new Error('请使用 sterilizationFail 接口记录灭菌失败');
  }

  const now = new Date().toISOString();
  const updates = [];
  const params = [];

  const statusFieldMap = {
    cleaning: null,
    cleaned: 'cleaned_at',
    sterilizing: null,
    sterilized: 'sterilized_at',
    stored: 'stored_at',
    issued: 'issued_at',
    used: 'used_at',
  };

  const operatorFieldMap = {
    cleaning: null,
    cleaned: 'operator_clean',
    sterilizing: null,
    sterilized: 'operator_sterilize',
    stored: 'operator_store',
    issued: 'operator_issue',
    used: null,
  };

  const dateField = statusFieldMap[newStatus];
  if (dateField) {
    updates.push(`${dateField} = ?`);
    params.push(now);
  }

  const opField = operatorFieldMap[newStatus];
  if (opField) {
    updates.push(`${opField} = ?`);
    params.push(operator);
  }

  if (newStatus === 'sterilized' && extra.expire_days !== undefined) {
    const expireAt = addDays(now, extra.expire_days).toISOString();
    updates.push('expire_at = ?');
    params.push(expireAt);
  }

  if (extra.sterilizer_id) {
    updates.push('sterilizer_id = ?');
    params.push(extra.sterilizer_id);
  }
  if (extra.pot_cycle) {
    updates.push('pot_cycle = ?');
    params.push(extra.pot_cycle);
  }
  if (extra.location) {
    updates.push('location = ?');
    params.push(extra.location);
  }

  updates.push('status = ?');
  params.push(newStatus);

  params.push(qrCode);

  const sql = `UPDATE sterilization_batches SET ${updates.join(', ')} WHERE qr_code = ?`;
  await db.run(sql, params);

  await db.run(
    `INSERT INTO scan_records (qr_code, action, status, location, operator, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [qrCode, extra.action || newStatus, newStatus, extra.location || batch.location, operator, extra.notes || '']
  );

  return getBatchById(batch.id);
};

const sterilizationFail = async (qrCode, operator, notes = '') => {
  const batch = await db.get('SELECT * FROM sterilization_batches WHERE qr_code = ?', [qrCode]);
  if (!batch) {
    throw new Error('批次不存在');
  }

  if (batch.status !== 'sterilizing') {
    throw new Error('只有灭菌中状态的批次才能记录灭菌失败');
  }

  const now = new Date().toISOString();

  await db.run(
    `UPDATE sterilization_batches 
     SET status = 'sterilization_failed', 
         sterilized_at = ?, 
         sterilization_result = 'failed',
         operator_sterilize = ?
     WHERE qr_code = ?`,
    [now, operator, qrCode]
  );

  await db.run(
    `INSERT INTO scan_records (qr_code, action, status, location, operator, notes)
     VALUES (?, 'sterilization_fail', 'sterilization_failed', ?, ?, ?)`,
    [qrCode, batch.location, operator, notes]
  );

  return getBatchById(batch.id);
};

const reprocessFailedBatch = async (qrCode, operator, notes = '') => {
  const batch = await db.get('SELECT * FROM sterilization_batches WHERE qr_code = ?', [qrCode]);
  if (!batch) {
    throw new Error('批次不存在');
  }

  if (batch.status !== 'sterilization_failed') {
    throw new Error('只有灭菌失败的批次才能重新处理');
  }

  const now = new Date().toISOString();

  await db.run(
    `UPDATE sterilization_batches 
     SET status = 'cleaned', 
         sterilization_result = NULL,
         sterilized_at = NULL
     WHERE qr_code = ?`,
    [qrCode]
  );

  await db.run(
    `INSERT INTO scan_records (qr_code, action, status, location, operator, notes)
     VALUES (?, 'reprocess', 'cleaned', ?, ?, ?)`,
    [qrCode, batch.location, operator, notes || '灭菌失败后重新处理']
  );

  return getBatchById(batch.id);
};

const checkDuplicateScan = async (qrCode, action) => {
  const recentScan = await db.get(
    `SELECT * FROM scan_records 
     WHERE qr_code = ? AND action = ? 
     ORDER BY timestamp DESC LIMIT 1`,
    [qrCode, action]
  );

  if (!recentScan) {
    return { isDuplicate: false };
  }

  const scanTime = new Date(recentScan.timestamp).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (now - scanTime < fiveMinutes) {
    return {
      isDuplicate: true,
      lastScan: recentScan,
      message: `该二维码5分钟内已执行过「${action}」操作，是否重复扫码？`,
    };
  }

  return { isDuplicate: false };
};

const listBatches = async (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.sterilizer_id) {
    conditions.push('sterilizer_id = ?');
    params.push(filters.sterilizer_id);
  }
  if (filters.pot_cycle) {
    conditions.push('pot_cycle = ?');
    params.push(filters.pot_cycle);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const batches = await db.all(
    `SELECT * FROM sterilization_batches ${where} ORDER BY created_at DESC LIMIT 100`,
    params
  );

  return batches;
};

module.exports = {
  VALID_STATUSES,
  STATUS_TRANSITIONS,
  canTransition,
  createBatch,
  getBatchById,
  getBatchByQRCode,
  updateBatchStatus,
  sterilizationFail,
  reprocessFailedBatch,
  checkDuplicateScan,
  listBatches,
  generateQRCode,
  addDays,
};
