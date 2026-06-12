const RiskLevel = {
  SELF_HARM: 'self_harm',
  OFFLINE_THREAT: 'offline_threat',
  PERSONAL_ATTACK: 'personal_attack',
  CUSTOMER_SERVICE: 'customer_service',
  NORMAL_COMPLAINT: 'normal_complaint',
  REVIEW_REQUIRED: 'review_required'
};

const RiskLevelLabels = {
  [RiskLevel.SELF_HARM]: '自伤风险',
  [RiskLevel.OFFLINE_THREAT]: '线下威胁',
  [RiskLevel.PERSONAL_ATTACK]: '人身攻击',
  [RiskLevel.CUSTOMER_SERVICE]: '客服跟进',
  [RiskLevel.NORMAL_COMPLAINT]: '普通吐槽',
  [RiskLevel.REVIEW_REQUIRED]: '待复核'
};

const RiskLevelPriority = {
  [RiskLevel.SELF_HARM]: 1,
  [RiskLevel.OFFLINE_THREAT]: 2,
  [RiskLevel.PERSONAL_ATTACK]: 3,
  [RiskLevel.CUSTOMER_SERVICE]: 4,
  [RiskLevel.REVIEW_REQUIRED]: 5,
  [RiskLevel.NORMAL_COMPLAINT]: 6
};

const RiskLevelColors = {
  [RiskLevel.SELF_HARM]: '#dc2626',
  [RiskLevel.OFFLINE_THREAT]: '#ea580c',
  [RiskLevel.PERSONAL_ATTACK]: '#d97706',
  [RiskLevel.CUSTOMER_SERVICE]: '#2563eb',
  [RiskLevel.NORMAL_COMPLAINT]: '#6b7280',
  [RiskLevel.REVIEW_REQUIRED]: '#9333ea'
};

const ProcessingStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  ESCALATED: 'escalated',
  DISMISSED: 'dismissed'
};

const ProcessingStatusLabels = {
  [ProcessingStatus.PENDING]: '待处理',
  [ProcessingStatus.PROCESSING]: '处理中',
  [ProcessingStatus.PROCESSED]: '已处理',
  [ProcessingStatus.ESCALATED]: '已升级',
  [ProcessingStatus.DISMISSED]: '已忽略'
};

module.exports = {
  RiskLevel,
  RiskLevelLabels,
  RiskLevelPriority,
  RiskLevelColors,
  ProcessingStatus,
  ProcessingStatusLabels
};
