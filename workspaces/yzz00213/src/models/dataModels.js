const { v4: uuidv4 } = require('uuid');

const PROCESS_STATUS = {
  PENDING: 'PENDING',
  RULE_HIT: 'RULE_HIT',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
  DUPLICATE_SUBMISSION: 'DUPLICATE_SUBMISSION',
  FIELD_MISSING: 'FIELD_MISSING',
  RULE_CONFLICT: 'RULE_CONFLICT',
  PROCESSED: 'PROCESSED',
  REJECTED: 'REJECTED'
};

const RISK_LEVELS = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

const NEXT_ACTIONS = {
  AUTO_APPROVE: 'AUTO_APPROVE',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
  SUPPLEMENT_INFO: 'SUPPLEMENT_INFO',
  REJECT: 'REJECT',
  RESOLVE_CONFLICT: 'RESOLVE_CONFLICT',
  MERGE_RECORD: 'MERGE_RECORD'
};

const RULE_TYPES = {
  FUEL_CONSUMPTION_EXCEED: 'FUEL_CONSUMPTION_EXCEED',
  MILEAGE_ABNORMAL: 'MILEAGE_ABNORMAL',
  FUEL_LEAK_SUSPECTED: 'FUEL_LEAK_SUSPECTED',
  IDLE_FUEL_WASTE: 'IDLE_FUEL_WASTE',
  ROUTE_DEVIATION: 'ROUTE_DEVIATION'
};

function generateAuditNo() {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `FUEL-${dateStr}-${random}`;
}

function generateTraceId() {
  return uuidv4();
}

module.exports = {
  PROCESS_STATUS,
  RISK_LEVELS,
  NEXT_ACTIONS,
  RULE_TYPES,
  generateAuditNo,
  generateTraceId
};
