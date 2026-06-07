const { v4: uuidv4 } = require('uuid');

function generateTraceId() {
  return 'TRACE-' + uuidv4().toUpperCase().replace(/-/g, '').substring(0, 16);
}

function generateRequestId() {
  return 'REQ-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function calculateWindowStart(requestTime, timeWindow) {
  const date = new Date(requestTime);
  const { unit, value } = timeWindow;

  switch (unit) {
    case 'minute':
      const minutes = Math.floor(date.getMinutes() / value) * value;
      date.setMinutes(minutes, 0, 0);
      break;
    case 'hour':
      const hours = Math.floor(date.getHours() / value) * value;
      date.setHours(hours, 0, 0, 0);
      break;
    case 'day':
      const days = Math.floor(date.getDate() / value) * value || 1;
      date.setDate(days);
      date.setHours(0, 0, 0, 0);
      break;
    default:
      date.setSeconds(0, 0);
  }

  return date.toISOString();
}

function calculateWindowEnd(windowStart, timeWindow) {
  const start = new Date(windowStart);
  const { unit, value } = timeWindow;

  switch (unit) {
    case 'minute':
      start.setMinutes(start.getMinutes() + value);
      break;
    case 'hour':
      start.setHours(start.getHours() + value);
      break;
    case 'day':
      start.setDate(start.getDate() + value);
      break;
  }

  return start.toISOString();
}

const ResultType = {
  PROCESSABLE: 'processable',
  NEEDS_SUPPLEMENT: 'needs_supplement',
  LOCKED: 'locked',
  FAILED: 'failed'
};

const FailureReason = {
  RULE_HIT_THRESHOLD: 'rule_hit_threshold',
  DUPLICATE_SUBMISSION: 'duplicate_submission',
  MANUAL_REVIEW_REQUIRED: 'manual_review_required',
  MISSING_MATERIALS: 'missing_materials',
  INVALID_OBJECT_STATUS: 'invalid_object_status',
  RULE_NOT_FOUND: 'rule_not_found',
  BUSINESS_LOCKED: 'business_locked',
  INVALID_PARAMS: 'invalid_params',
  HISTORY_PLAYBACK_NOT_ALLOWED: 'history_playback_not_allowed',
  REVIEW_REJECTED: 'review_rejected'
};

module.exports = {
  generateTraceId,
  generateRequestId,
  calculateWindowStart,
  calculateWindowEnd,
  ResultType,
  FailureReason
};
