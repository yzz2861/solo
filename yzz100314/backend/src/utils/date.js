const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const DATE_FORMATS = [
  'YYYY-MM-DD HH:mm:ss',
  'YYYY-MM-DD HH:mm',
  'YYYY/MM/DD HH:mm:ss',
  'YYYY/MM/DD HH:mm',
  'YYYY-MM-DDTHH:mm:ss',
  'YYYY-MM-DDTHH:mm:ss.SSSZ',
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  'MM/DD/YYYY HH:mm:ss',
  'MM/DD/YYYY',
];

function parseDateTime(str) {
  if (!str) return null;
  if (typeof str === 'number') return dayjs(str).isValid() ? str : null;
  
  const trimmed = String(str).trim();
  for (const fmt of DATE_FORMATS) {
    const d = dayjs(trimmed, fmt, true);
    if (d.isValid()) {
      return d.valueOf();
    }
  }
  const d = dayjs(trimmed);
  return d.isValid() ? d.valueOf() : null;
}

function formatDateTime(ts, fmt = 'YYYY-MM-DD HH:mm:ss') {
  if (!ts) return '';
  return dayjs(ts).format(fmt);
}

function generateBatchId(prefix = 'batch') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const SLA_CONFIG = {
  urgent: { first_response: 30 * 60 * 1000, resolution: 4 * 60 * 60 * 1000 },
  high: { first_response: 1 * 60 * 60 * 1000, resolution: 8 * 60 * 60 * 1000 },
  normal: { first_response: 2 * 60 * 60 * 1000, resolution: 24 * 60 * 60 * 1000 },
  low: { first_response: 4 * 60 * 60 * 1000, resolution: 48 * 60 * 60 * 1000 },
  default: { first_response: 2 * 60 * 60 * 1000, resolution: 24 * 60 * 60 * 1000 },
};

function getSlaConfig(priority) {
  const p = (priority || '').toLowerCase();
  return SLA_CONFIG[p] || SLA_CONFIG.default;
}

function checkSlaViolation(ticket, firstReplyTs) {
  const config = getSlaConfig(ticket.priority);
  const createdTs = ticket.created_at_ts;
  
  const violations = [];
  
  if (createdTs) {
    if (firstReplyTs) {
      const responseTime = firstReplyTs - createdTs;
      if (responseTime > config.first_response) {
        violations.push({
          type: 'first_response_timeout',
          label: '首次响应超时',
          expected_ms: config.first_response,
          actual_ms: responseTime,
        });
      }
    } else {
      const now = Date.now();
      const elapsed = now - createdTs;
      if (elapsed > config.first_response) {
        violations.push({
          type: 'first_response_timeout',
          label: '首次响应超时(未回复)',
          expected_ms: config.first_response,
          actual_ms: elapsed,
        });
      }
    }
  }
  
  return violations;
}

module.exports = {
  parseDateTime,
  formatDateTime,
  generateBatchId,
  getSlaConfig,
  checkSlaViolation,
  SLA_CONFIG,
};
