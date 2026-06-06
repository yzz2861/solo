const { RISK_TAGS, BUSINESS_CONCLUSIONS, NEXT_ACTIONS, STATUS_FLOW } = require('./constants');

const RISK_THRESHOLDS = {
  HIGH_RISK_SCORE: 80,
  MEDIUM_RISK_SCORE: 50,
  LOGIN_COUNT_DAILY_LIMIT: 10,
  GEO_DISTANCE_KM_THRESHOLD: 500,
  TIME_DIFF_HOURS_THRESHOLD: 2
};

const SUSPICIOUS_IPS = new Set([
  '192.168.200.1',
  '10.0.99.99',
  '172.16.50.100'
]);

const RULES = [
  {
    id: 'RULE-001',
    name: '地理位置异常',
    description: '登录地点与常用归属地距离超过阈值',
    weight: 30,
    tag: RISK_TAGS.GEO_LOCATION_ABNORMAL,
    check: (detail) => {
      if (!detail.location || !detail.commonLocation) return false;
      return (detail.distanceKm || 0) > RISK_THRESHOLDS.GEO_DISTANCE_KM_THRESHOLD;
    }
  },
  {
    id: 'RULE-002',
    name: '登录时间异常',
    description: '在非常规工作时段登录',
    weight: 15,
    tag: RISK_TAGS.LOGIN_TIME_ABNORMAL,
    check: (detail) => {
      if (!detail.loginTime) return false;
      const hour = new Date(detail.loginTime).getHours();
      return hour < 2 || hour > 22;
    }
  },
  {
    id: 'RULE-003',
    name: '设备指纹不匹配',
    description: '登录设备指纹与历史设备不一致',
    weight: 25,
    tag: RISK_TAGS.DEVICE_FINGERPRINT_MISMATCH,
    check: (detail) => detail.deviceMismatch === true
  },
  {
    id: 'RULE-004',
    name: '多地同时登录',
    description: '短时间内多个地点登录同一账号',
    weight: 35,
    tag: RISK_TAGS.MULTI_LOCATION_LOGIN,
    check: (detail) => detail.multiLocationLogin === true
  },
  {
    id: 'RULE-005',
    name: '登录次数超阈值',
    description: '当日登录次数超过安全阈值',
    weight: 20,
    tag: RISK_TAGS.THRESHOLD_EXCEEDED,
    check: (detail) => {
      return (detail.dailyLoginCount || 0) > RISK_THRESHOLDS.LOGIN_COUNT_DAILY_LIMIT;
    }
  },
  {
    id: 'RULE-006',
    name: '可疑IP地址',
    description: '登录IP属于已知可疑IP库',
    weight: 40,
    tag: RISK_TAGS.SUSPICIOUS_IP,
    check: (detail) => {
      if (!detail.ipAddress) return false;
      return SUSPICIOUS_IPS.has(detail.ipAddress);
    }
  },
  {
    id: 'RULE-007',
    name: '账号共享嫌疑',
    description: '多设备频繁切换登录，疑似账号共享',
    weight: 30,
    tag: RISK_TAGS.ACCOUNT_SHARED,
    check: (detail) => detail.accountSharedSuspected === true
  }
];

function evaluateRisk(detail) {
  const hitRules = [];
  let totalScore = 0;

  for (const rule of RULES) {
    try {
      if (rule.check(detail)) {
        hitRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          description: rule.description,
          weight: rule.weight,
          tag: rule.tag
        });
        totalScore += rule.weight;
      }
    } catch (e) {
      continue;
    }
  }

  const riskTags = [...new Set(hitRules.map(r => r.tag))];
  let riskLevel;
  let conclusion;
  let nextAction;

  if (totalScore >= RISK_THRESHOLDS.HIGH_RISK_SCORE) {
    riskLevel = 'high';
    conclusion = BUSINESS_CONCLUSIONS.RISK_HIGH;
    nextAction = NEXT_ACTIONS.BLOCK_ACCOUNT;
  } else if (totalScore >= RISK_THRESHOLDS.MEDIUM_RISK_SCORE) {
    riskLevel = 'medium';
    conclusion = BUSINESS_CONCLUSIONS.RISK_MEDIUM;
    nextAction = NEXT_ACTIONS.ESCALATE_TO_SECURITY;
  } else if (hitRules.length > 0) {
    riskLevel = 'low';
    conclusion = BUSINESS_CONCLUSIONS.PENDING_REVIEW;
    nextAction = NEXT_ACTIONS.AWAIT_REVIEW;
  } else {
    riskLevel = 'none';
    conclusion = BUSINESS_CONCLUSIONS.COMPLIANT;
    nextAction = NEXT_ACTIONS.PASS_AND_ARCHIVE;
  }

  return {
    riskScore: totalScore,
    riskLevel,
    riskTags,
    hitRules,
    conclusion,
    nextAction,
    status: STATUS_FLOW.RULE_CHECKED
  };
}

function checkMaterialCompleteness(detail) {
  const requiredFields = ['userId', 'loginTime', 'ipAddress'];
  const missing = [];

  for (const field of requiredFields) {
    if (!detail[field]) {
      missing.push(field);
    }
  }

  return {
    isComplete: missing.length === 0,
    missingFields: missing
  };
}

module.exports = {
  RULES,
  RISK_THRESHOLDS,
  SUSPICIOUS_IPS,
  evaluateRisk,
  checkMaterialCompleteness
};
