const BUSINESS_STATUS = {
  PENDING: 'pending',
  NORMAL: 'normal',
  ABNORMAL: 'abnormal',
  REVIEWING: 'reviewing',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

const RISK_TAGS = {
  NORMAL: 'normal',
  MISSING_FIELDS: 'missing_fields',
  INVALID_PARAM: 'invalid_param',
  RULE_CONFLICT: 'rule_conflict',
  DUPLICATE_PROCESSING: 'duplicate_processing',
  MANUAL_REVIEW: 'manual_review',
  RULE_HIT: 'rule_hit',
  CALCULATION_ERROR: 'calculation_error'
}

const NEXT_ACTIONS = {
  ACCEPT: 'accept',
  REJECT: 'reject',
  MANUAL_REVIEW: 'manual_review',
  SUPPLEMENT_INFO: 'supplement_info',
  RESOLVE_CONFLICT: 'resolve_conflict',
  REPROCESS: 'reprocess',
  RECORD_ONLY: 'record_only'
}

const AUDIT_TYPES = {
  SUBMIT: 'submit',
  RULE_CHECK: 'rule_check',
  MANUAL_REVIEW: 'manual_review',
  DUPLICATE_CHECK: 'duplicate_check',
  RESULT_CONFIRM: 'result_confirm'
}

const CONCLUSION_TYPES = {
  PASS: 'pass',
  FAIL: 'fail',
  PENDING: 'pending',
  REVIEW: 'review'
}

const RULE_VERSIONS = ['v1.0', 'v1.1', 'v2.0']

const SUBSIDY_STANDARDS = {
  'v1.0': {
    criminal: 1500,
    civil: 2000,
    administrative: 1800,
    maxPerYear: 10000
  },
  'v1.1': {
    criminal: 1800,
    civil: 2200,
    administrative: 2000,
    maxPerYear: 12000
  },
  'v2.0': {
    criminal: 2000,
    civil: 2500,
    administrative: 2200,
    maxPerYear: 15000,
    remoteAllowance: 300
  }
}

const OBJECT_CATEGORIES = ['criminal', 'civil', 'administrative']

const ERROR_CODES = {
  PARAM_MISSING: 'PARAM_MISSING',
  PARAM_INVALID: 'PARAM_INVALID',
  RULE_VERSION_NOT_FOUND: 'RULE_VERSION_NOT_FOUND',
  DUPLICATE_BUSINESS: 'DUPLICATE_BUSINESS',
  RULE_CONFLICT: 'RULE_CONFLICT',
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  AUDIT_NOT_FOUND: 'AUDIT_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
}

module.exports = {
  BUSINESS_STATUS,
  RISK_TAGS,
  NEXT_ACTIONS,
  AUDIT_TYPES,
  CONCLUSION_TYPES,
  RULE_VERSIONS,
  SUBSIDY_STANDARDS,
  OBJECT_CATEGORIES,
  ERROR_CODES
}
