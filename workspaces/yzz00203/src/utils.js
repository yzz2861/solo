const crypto = require('crypto');
const path = require('path');

function generateBatchId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `BATCH-${dateStr}-${random}`;
}

function generateRecordId(record, source) {
  const keys = Object.keys(record).sort();
  const values = keys.map(k => String(record[k] || '')).join('|');
  const hash = crypto.createHash('md5').update(`${source}|${values}`).digest('hex').slice(0, 12);
  return `REC-${hash.toUpperCase()}`;
}

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function toNumber(value) {
  if (isEmpty(value)) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function ensureDir(dirPath) {
  const fs = require('fs');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

function getSourceName(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function formatDate(date) {
  const d = date || new Date();
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

module.exports = {
  generateBatchId,
  generateRecordId,
  isEmpty,
  toNumber,
  ensureDir,
  getSourceName,
  formatDate
};
