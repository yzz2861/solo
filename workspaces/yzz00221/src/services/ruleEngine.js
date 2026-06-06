const { calculateBradenScore, getRiskLevelByScore } = require('../utils/helpers');

const RULES = [
  {
    id: 'RULE_BRADEN_VERY_HIGH',
    name: 'Braden极高度风险',
    description: 'Braden评分≤9分，极高度压疮风险',
    severity: 'critical',
    check: (detail) => {
      const result = calculateBradenScore(detail);
      return result.complete && result.total <= 9;
    },
    labels: ['Braden低分值', '极高度风险']
  },
  {
    id: 'RULE_BRADEN_HIGH',
    name: 'Braden高度风险',
    description: 'Braden评分10-12分，高度压疮风险',
    severity: 'high',
    check: (detail) => {
      const result = calculateBradenScore(detail);
      return result.complete && result.total >= 10 && result.total <= 12;
    },
    labels: ['Braden低分值', '高度风险']
  },
  {
    id: 'RULE_BRADEN_MODERATE',
    name: 'Braden中度风险',
    description: 'Braden评分13-15分，中度压疮风险',
    severity: 'medium',
    check: (detail) => {
      const result = calculateBradenScore(detail);
      return result.complete && result.total >= 13 && result.total <= 15;
    },
    labels: ['中度风险']
  },
  {
    id: 'RULE_ELDERLY',
    name: '高龄患者',
    description: '年龄≥70岁的老年患者压疮风险升高',
    severity: 'medium',
    check: (detail) => detail.age >= 70,
    labels: ['高龄患者']
  },
  {
    id: 'RULE_PREVIOUS_ULCER',
    name: '压疮史',
    description: '有压疮病史的患者复发风险高',
    severity: 'high',
    check: (detail) => {
      if (!detail.medicalHistory || !Array.isArray(detail.medicalHistory)) return false;
      return detail.medicalHistory.some(h =>
        h === '压疮史' || h === 'pressure_ulcer' || h === 'previous_ulcer'
      );
    },
    labels: ['压疮史']
  },
  {
    id: 'RULE_DIABETES',
    name: '糖尿病史',
    description: '糖尿病患者外周循环差，压疮风险高',
    severity: 'medium',
    check: (detail) => {
      if (!detail.medicalHistory || !Array.isArray(detail.medicalHistory)) return false;
      return detail.medicalHistory.some(h =>
        h === '糖尿病' || h === 'diabetes'
      );
    },
    labels: ['糖尿病史']
  },
  {
    id: 'RULE_BEDRIDDEN',
    name: '卧床不起',
    description: '活动能力评分1分，长期卧床',
    severity: 'high',
    check: (detail) => detail.braden && detail.braden.activity === 1,
    labels: ['卧床不起', '活动能力受限']
  },
  {
    id: 'RULE_NUTRITION_DEFICIT',
    name: '营养不足',
    description: '营养状况评分≤2分',
    severity: 'medium',
    check: (detail) => detail.braden && detail.braden.nutrition <= 2,
    labels: ['营养不足']
  },
  {
    id: 'RULE_MOISTURE',
    name: '皮肤潮湿',
    description: '潮湿暴露评分≤2分',
    severity: 'medium',
    check: (detail) => detail.braden && detail.braden.moisture <= 2,
    labels: ['皮肤潮湿']
  },
  {
    id: 'RULE_SENSORY_IMPAIRED',
    name: '感觉减退',
    description: '感觉感知评分≤2分',
    severity: 'medium',
    check: (detail) => detail.braden && detail.braden.sensoryPerception <= 2,
    labels: ['感觉减退']
  },
  {
    id: 'RULE_MOBILITY_IMPAIRED',
    name: '活动能力受限',
    description: '移动能力评分≤2分',
    severity: 'medium',
    check: (detail) => detail.braden && detail.braden.mobility <= 2,
    labels: ['活动能力受限']
  },
  {
    id: 'RULE_FRICTION_SHEAR',
    name: '摩擦力/剪切力高风险',
    description: '摩擦力和剪切力评分≤2分',
    severity: 'medium',
    check: (detail) => detail.braden && detail.braden.frictionShear <= 2,
    labels: ['摩擦力/剪切力']
  }
];

function evaluateRisk(detail) {
  const hitRules = [];
  const riskLabels = new Set();
  let maxSeverity = 'low';

  for (const rule of RULES) {
    if (rule.check(detail)) {
      hitRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        description: rule.description,
        severity: rule.severity
      });
      rule.labels.forEach(label => riskLabels.add(label));

      const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      if (severityOrder[rule.severity] > severityOrder[maxSeverity]) {
        maxSeverity = rule.severity;
      }
    }
  }

  const bradenResult = calculateBradenScore(detail);
  const riskLevel = bradenResult.complete
    ? getRiskLevelByScore(bradenResult.total)
    : null;

  return {
    patientId: detail.patientId,
    patientName: detail.patientName,
    bradenScore: bradenResult.complete ? bradenResult.total : null,
    bradenComplete: bradenResult.complete,
    bradenMissing: bradenResult.missing,
    riskLevel,
    maxSeverity,
    hitRules,
    riskLabels: Array.from(riskLabels)
  };
}

function evaluateBatch(details) {
  const results = details.map(detail => evaluateRisk(detail));

  const totalCount = results.length;
  const highRiskCount = results.filter(r =>
    r.maxSeverity === 'high' || r.maxSeverity === 'critical'
  ).length;
  const mediumRiskCount = results.filter(r => r.maxSeverity === 'medium').length;
  const lowRiskCount = results.filter(r => r.maxSeverity === 'low').length;
  const ruleHitCount = results.filter(r => r.hitRules.length > 0).length;

  const allLabels = new Set();
  results.forEach(r => r.riskLabels.forEach(l => allLabels.add(l)));

  const overallRiskLevel = highRiskCount > 0
    ? (results.some(r => r.maxSeverity === 'critical') ? '极高度风险' : '高度风险')
    : mediumRiskCount > 0
      ? '中度风险'
      : '无风险';

  return {
    summary: {
      totalCount,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      ruleHitCount,
      overallRiskLevel,
      allRiskLabels: Array.from(allLabels)
    },
    details: results
  };
}

module.exports = {
  RULES,
  evaluateRisk,
  evaluateBatch
};
