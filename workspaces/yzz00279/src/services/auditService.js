const { v4: uuidv4 } = require('uuid');

const processedRecords = new Map();
const auditLogs = [];

function generateAuditId(prefix = 'AUDIT') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function generateSerialNumber(batchNumber, sequence) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(sequence).padStart(4, '0');
  return `${batchNumber}-${date}-${seq}`;
}

function checkDuplicateSubmission(batchNumber, items) {
  const itemSignatures = items
    .filter(item => item && item.itemId)
    .map(item => item.itemId)
    .sort()
    .join('|');

  const signature = `${batchNumber}:${itemSignatures}`;
  const existing = processedRecords.get(signature);

  if (existing) {
    return {
      isDuplicate: true,
      duplicateInfo: {
        originalAuditId: existing.auditId,
        originalSubmitTime: existing.submitTime,
        originalStatus: existing.status,
        signature
      }
    };
  }

  return { isDuplicate: false, duplicateInfo: null };
}

function recordSubmission(batchNumber, items, auditId, status, metadata = {}) {
  const itemSignatures = items
    .filter(item => item && item.itemId)
    .map(item => item.itemId)
    .sort()
    .join('|');

  const signature = `${batchNumber}:${itemSignatures}`;

  processedRecords.set(signature, {
    auditId,
    submitTime: new Date().toISOString(),
    status,
    metadata
  });

  const logEntry = {
    auditId,
    batchNumber,
    itemCount: items.length,
    status,
    timestamp: new Date().toISOString(),
    metadata
  };
  auditLogs.push(logEntry);

  return logEntry;
}

function getAuditLog(auditId) {
  return auditLogs.find(log => log.auditId === auditId) || null;
}

function getBatchHistory(batchNumber) {
  return auditLogs.filter(log => log.batchNumber === batchNumber);
}

function getProcessedCount() {
  return processedRecords.size;
}

function getAuditLogCount() {
  return auditLogs.length;
}

function clearAllRecords() {
  processedRecords.clear();
  auditLogs.length = 0;
}

module.exports = {
  generateAuditId,
  generateSerialNumber,
  checkDuplicateSubmission,
  recordSubmission,
  getAuditLog,
  getBatchHistory,
  getProcessedCount,
  getAuditLogCount,
  clearAllRecords
};
