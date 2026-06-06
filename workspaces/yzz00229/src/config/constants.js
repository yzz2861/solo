const RULE_VERSION = 'v2.1.0';

const STATUS = {
  PROCESSABLE: '可办理',
  SUPPLEMENT: '需补充',
  LOCKED: '已锁定',
  FAILED: '失败'
};

const RISK_LEVEL = {
  LOW: '低风险',
  MEDIUM: '中风险',
  HIGH: '高风险',
  UNDETERMINED: '无法判定'
};

const SOURCE_CHANNELS = [
  '群众举报',
  '视频巡检',
  '现场执法',
  '第三方平台',
  '内部巡查'
];

const ACTIONS = [
  '初次提交',
  '补充材料',
  '复核通过',
  '复核驳回',
  '撤销申请'
];

const EVIDENCE_TYPES = [
  '照片',
  '视频',
  '证人证言',
  '现场笔录',
  '定位信息'
];

const FAIL_REASONS = {
  INVALID_BATCH_NO: '批次号格式无效',
  EMPTY_ITEMS: '明细项不能为空',
  INVALID_SOURCE: '来源渠道不合法',
  INVALID_ACTION: '处理动作不合法',
  INVALID_ITEM_ID: '明细ID缺失或无效',
  MISSING_EVIDENCE: '证据材料缺失',
  INVALID_LOCATION: '位置信息无效',
  INVALID_TIME: '时间格式无效',
  DUPLICATE_BATCH: '批次号重复提交'
};

const SUPPLEMENT_FIELDS = [
  'evidenceImages',
  'evidenceVideo',
  'locationDetail',
  'occurTime',
  'witnessInfo',
  'description'
];

module.exports = {
  RULE_VERSION,
  STATUS,
  RISK_LEVEL,
  SOURCE_CHANNELS,
  ACTIONS,
  EVIDENCE_TYPES,
  FAIL_REASONS,
  SUPPLEMENT_FIELDS
};
