const RISK_LEVELS = {
  NO_RISK: '无风险',
  MILD: '轻度风险',
  MODERATE: '中度风险',
  HIGH: '高度风险',
  VERY_HIGH: '极高度风险'
};

const RISK_LABELS = {
  NUTRITION_DEFICIT: '营养不足',
  MOBILITY_IMPAIRED: '活动能力受限',
  MOISTURE_EXPOSURE: '皮肤潮湿',
  FRICTION_SHEAR: '摩擦力/剪切力',
  SENSORY_IMPAIRED: '感觉减退',
  ACTIVITY_BEDRIDDEN: '卧床不起',
  BRADEN_LOW_SCORE: 'Braden低分值',
  ELDERLY_PATIENT: '高龄患者',
  DIABETES: '糖尿病史',
  PREVIOUS_ULCER: '压疮史'
};

const PROCESS_ACTIONS = {
  SUBMIT: 'submit',
  REVIEW: 'review',
  REPLAY: 'replay',
  RESUBMIT: 'resubmit'
};

const SOURCE_CHANNELS = {
  WARD: '病房护士站',
  EMERGENCY: '急诊',
  ICU: 'ICU',
  OUTPATIENT: '门诊',
  HOME_CARE: '居家护理'
};

const BUSINESS_CONCLUSIONS = {
  COMPLIANT: '合规通过',
  OVER_THRESHOLD: '超阈值预警',
  MATERIAL_MISSING: '材料缺失',
  DUPLICATE: '重复提交',
  NEEDS_REVIEW: '待人工复核',
  REPLAYED: '历史回放',
  REVIEW_PASSED: '复核通过',
  REVIEW_REJECTED: '复核驳回'
};

const NEXT_ACTIONS = {
  NO_ACTION: '无需处理',
  NOTIFY_WARD: '通知病区护士',
  COLLECT_MATERIALS: '补充材料后重新提交',
  ESCALATE_TO_DOCTOR: '上报主管医生',
  SCHEDULE_REVIEW: '安排人工复核',
  IMPLEMENT_PREVENTION: '落实预防措施',
  RE_ASSESS: '重新评估',
  ARCHIVE: '归档结案'
};

const TRIAGE_CATEGORIES = {
  RULE_HIT: 'RULE_HIT',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
  DUPLICATE: 'DUPLICATE',
  NORMAL: 'NORMAL',
  REPLAY: 'REPLAY'
};

const BRADEN_SUBSCALES = [
  'sensoryPerception',
  'moisture',
  'activity',
  'mobility',
  'nutrition',
  'frictionShear'
];

const BRADEN_THRESHOLDS = {
  veryHigh: 9,
  high: 12,
  moderate: 15,
  mild: 18
};

module.exports = {
  RISK_LEVELS,
  RISK_LABELS,
  PROCESS_ACTIONS,
  SOURCE_CHANNELS,
  BUSINESS_CONCLUSIONS,
  NEXT_ACTIONS,
  TRIAGE_CATEGORIES,
  BRADEN_SUBSCALES,
  BRADEN_THRESHOLDS
};
