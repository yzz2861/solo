const SOURCE_CHANNELS = {
  AUTO_MONITOR: 'auto_monitor',
  MANUAL_REPORT: 'manual_report',
  THIRD_PARTY: 'third_party',
  HISTORY_REPLAY: 'history_replay'
};

const PROCESS_ACTIONS = {
  SUBMIT: 'submit',
  REVIEW_APPROVE: 'review_approve',
  REVIEW_REJECT: 'review_reject',
  RECHECK: 'recheck',
  CLOSE: 'close'
};

const BUSINESS_CONCLUSIONS = {
  COMPLIANT: 'compliant',
  RISK_HIGH: 'risk_high',
  RISK_MEDIUM: 'risk_medium',
  PENDING_REVIEW: 'pending_review',
  MATERIAL_MISSING: 'material_missing',
  DUPLICATE_SUBMISSION: 'duplicate_submission',
  CLOSED: 'closed',
  INVALID: 'invalid'
};

const RISK_TAGS = {
  GEO_LOCATION_ABNORMAL: 'geo_location_abnormal',
  LOGIN_TIME_ABNORMAL: 'login_time_abnormal',
  DEVICE_FINGERPRINT_MISMATCH: 'device_fingerprint_mismatch',
  MULTI_LOCATION_LOGIN: 'multi_location_login',
  THRESHOLD_EXCEEDED: 'threshold_exceeded',
  SUSPICIOUS_IP: 'suspicious_ip',
  ACCOUNT_SHARED: 'account_shared',
  MATERIAL_INCOMPLETE: 'material_incomplete',
  NEED_MANUAL_VERIFY: 'need_manual_verify'
};

const NEXT_ACTIONS = {
  PASS_AND_ARCHIVE: 'pass_and_archive',
  BLOCK_ACCOUNT: 'block_account',
  NOTIFY_USER: 'notify_user',
  ESCALATE_TO_SECURITY: 'escalate_to_security',
  SUPPLEMENT_MATERIAL: 'supplement_material',
  AWAIT_REVIEW: 'await_review',
  REPLAY_ANALYSIS: 'replay_analysis',
  NO_ACTION: 'no_action'
};

const STATUS_FLOW = {
  INIT: 'init',
  RULE_CHECKED: 'rule_checked',
  PENDING_REVIEW: 'pending_review',
  REVIEW_PASSED: 'review_passed',
  REVIEW_REJECTED: 'review_rejected',
  CLOSED: 'closed'
};

module.exports = {
  SOURCE_CHANNELS,
  PROCESS_ACTIONS,
  BUSINESS_CONCLUSIONS,
  RISK_TAGS,
  NEXT_ACTIONS,
  STATUS_FLOW
};
