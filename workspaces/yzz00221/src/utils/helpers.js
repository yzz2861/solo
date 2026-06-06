const { v4: uuidv4 } = require('uuid');

function generateAuditId() {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');
  return `AU-${dateStr}-${uuidv4().slice(0, 8).toUpperCase()}`;
}

function generateAssessmentId() {
  return `ASSESS-${uuidv4().slice(0, 12).toUpperCase()}`;
}

function calculateBradenScore(details) {
  if (!details || !details.braden) return null;

  const subscales = [
    'sensoryPerception',
    'moisture',
    'activity',
    'mobility',
    'nutrition',
    'frictionShear'
  ];

  let total = 0;
  let missing = [];

  for (const scale of subscales) {
    const val = details.braden[scale];
    if (val === undefined || val === null) {
      missing.push(scale);
    } else {
      total += Number(val);
    }
  }

  return {
    total,
    missing,
    complete: missing.length === 0
  };
}

function getRiskLevelByScore(score) {
  if (score === null || score === undefined) return null;
  if (score <= 9) return '极高度风险';
  if (score <= 12) return '高度风险';
  if (score <= 15) return '中度风险';
  if (score <= 18) return '轻度风险';
  return '无风险';
}

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function formatTimestamp(date) {
  const d = date || new Date();
  return d.toISOString();
}

module.exports = {
  generateAuditId,
  generateAssessmentId,
  calculateBradenScore,
  getRiskLevelByScore,
  isEmpty,
  deepClone,
  formatTimestamp
};
