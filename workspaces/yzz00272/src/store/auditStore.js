const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const auditStore = new Map();
const requestStore = new Map();

function generateAuditNo() {
  return 'AUD-' + Date.now().toString(36).toUpperCase() + '-' + uuidv4().slice(0, 8).toUpperCase();
}

function stableStringify(obj) {
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `"${k}":${stableStringify(obj[k])}`).join(',') + '}';
}

function generateIdempotencyKey(reqBody) {
  if (!reqBody || typeof reqBody !== 'object') {
    return 'EMPTY_BODY';
  }
  const normalized = stableStringify(reqBody);
  const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
  const prefix = `${reqBody.batchNo || 'NO_BATCH'}::${reqBody.action || 'NO_ACTION'}::${reqBody.sourceChannel || 'NO_CHANNEL'}`;
  return `${prefix}::${hash}`;
}

function saveAuditRecord(auditNo, record) {
  auditStore.set(auditNo, {
    auditNo,
    createdAt: new Date().toISOString(),
    ...record
  });
  return auditStore.get(auditNo);
}

function getAuditRecord(auditNo) {
  return auditStore.get(auditNo) || null;
}

function saveRequestResult(idempotencyKey, result) {
  requestStore.set(idempotencyKey, {
    idempotencyKey,
    cachedAt: new Date().toISOString(),
    result
  });
}

function getRequestResult(idempotencyKey) {
  const cached = requestStore.get(idempotencyKey);
  return cached ? cached.result : null;
}

function clearAll() {
  auditStore.clear();
  requestStore.clear();
}

function getAuditCount() {
  return auditStore.size;
}

function getAllAudits() {
  return Array.from(auditStore.values());
}

module.exports = {
  generateAuditNo,
  generateIdempotencyKey,
  saveAuditRecord,
  getAuditRecord,
  saveRequestResult,
  getRequestResult,
  clearAll,
  getAuditCount,
  getAllAudits
};
