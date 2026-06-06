const { v4: uuidv4 } = require('uuid');

const auditRecords = new Map();
const batchIndex = new Map();
const itemIdIndex = new Map();

function generateAuditId(prefix = 'AUD') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().slice(0, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function saveAuditRecord(record) {
  const auditId = record.auditId || generateAuditId();
  const finalRecord = { ...record, auditId, createdAt: record.createdAt || new Date().toISOString() };
  auditRecords.set(auditId, finalRecord);

  if (finalRecord.batchNo) {
    if (!batchIndex.has(finalRecord.batchNo)) {
      batchIndex.set(finalRecord.batchNo, []);
    }
    batchIndex.get(finalRecord.batchNo).push(auditId);
  }

  if (finalRecord.itemId) {
    if (!itemIdIndex.has(finalRecord.itemId)) {
      itemIdIndex.set(finalRecord.itemId, []);
    }
    itemIdIndex.get(finalRecord.itemId).push(auditId);
  }

  return finalRecord;
}

function getAuditRecord(auditId) {
  return auditRecords.get(auditId) || null;
}

function findByBatchNo(batchNo) {
  const ids = batchIndex.get(batchNo) || [];
  return ids.map(id => auditRecords.get(id)).filter(Boolean);
}

function findByItemId(itemId) {
  const ids = itemIdIndex.get(itemId) || [];
  return ids.map(id => auditRecords.get(id)).filter(Boolean);
}

function findLatestByItemId(itemId) {
  const records = findByItemId(itemId);
  if (records.length === 0) return null;
  return records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

function isDuplicateSubmission(batchNo, itemId) {
  if (!batchNo || !itemId) return false;
  const records = findByBatchNo(batchNo);
  return records.some(r => r.itemId === itemId && r.status !== 'invalid');
}

function getAllRecords() {
  return Array.from(auditRecords.values());
}

function clearAll() {
  auditRecords.clear();
  batchIndex.clear();
  itemIdIndex.clear();
}

module.exports = {
  generateAuditId,
  saveAuditRecord,
  getAuditRecord,
  findByBatchNo,
  findByItemId,
  findLatestByItemId,
  isDuplicateSubmission,
  getAllRecords,
  clearAll
};
