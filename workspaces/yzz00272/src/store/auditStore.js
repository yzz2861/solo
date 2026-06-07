const { v4: uuidv4 } = require('uuid');

const auditStore = new Map();
const requestStore = new Map();

function generateAuditNo() {
  return 'AUD-' + Date.now().toString(36).toUpperCase() + '-' + uuidv4().slice(0, 8).toUpperCase();
}

function generateIdempotencyKey(batchNo, action, sourceChannel) {
  return `${batchNo}::${action}::${sourceChannel}`;
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
