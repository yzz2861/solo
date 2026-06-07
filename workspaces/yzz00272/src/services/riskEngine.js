const { loadConfig } = require('../config/config');
const { RISK_LEVELS, BUSINESS_CONCLUSIONS, NEXT_ACTIONS } = require('../config/constants');

const RISK_PRIORITY = {
  [RISK_LEVELS.HIGH]: 4,
  [RISK_LEVELS.MEDIUM]: 3,
  [RISK_LEVELS.LOW]: 2,
  [RISK_LEVELS.INFO]: 1
};

function evaluateDetailRisk(detail) {
  const config = loadConfig();
  const matchedRules = [];

  if (!config.riskRules || config.riskRules.length === 0) {
    return {
      detailId: detail.detailId,
      riskLevel: RISK_LEVELS.INFO,
      riskTags: [],
      matchedRules: [],
      nextAction: NEXT_ACTIONS.CONTINUE
    };
  }

  for (const rule of config.riskRules) {
    try {
      if (rule.condition && typeof rule.condition === 'function' && rule.condition(detail)) {
        matchedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          riskLevel: rule.riskLevel,
          description: rule.description
        });
      }
    } catch (e) {
      // 规则执行出错不影响整体
    }
  }

  let highestRisk = RISK_LEVELS.INFO;
  for (const rule of matchedRules) {
    if (RISK_PRIORITY[rule.riskLevel] > RISK_PRIORITY[highestRisk]) {
      highestRisk = rule.riskLevel;
    }
  }

  const riskTags = matchedRules.map(r => `${r.riskLevel}:${r.ruleId}`);

  let nextAction = NEXT_ACTIONS.CONTINUE;
  if (matchedRules.length > 0) {
    const highestRule = matchedRules.reduce((prev, curr) =>
      RISK_PRIORITY[curr.riskLevel] > RISK_PRIORITY[prev.riskLevel] ? curr : prev
    );
    nextAction = config.riskRules.find(r => r.id === highestRule.ruleId)?.nextAction || NEXT_ACTIONS.HALT;
  }

  return {
    detailId: detail.detailId,
    bridgeCode: detail.bridgeCode,
    riskLevel: highestRisk,
    riskTags,
    matchedRules,
    nextAction
  };
}

function evaluateBatchRisk(detailResults) {
  const summary = {
    totalCount: detailResults.length,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    infoCount: 0,
    allRiskTags: []
  };

  for (const result of detailResults) {
    switch (result.riskLevel) {
      case RISK_LEVELS.HIGH:
        summary.highRiskCount++;
        break;
      case RISK_LEVELS.MEDIUM:
        summary.mediumRiskCount++;
        break;
      case RISK_LEVELS.LOW:
        summary.lowRiskCount++;
        break;
      default:
        summary.infoCount++;
    }
    summary.allRiskTags.push(...result.riskTags);
  }

  summary.allRiskTags = [...new Set(summary.allRiskTags)];

  return summary;
}

function determineBusinessConclusion(validationResult, riskSummary, action) {
  if (!validationResult.valid) {
    return {
      conclusion: BUSINESS_CONCLUSIONS.FAIL,
      reason: '数据校验未通过',
      severity: 'ERROR'
    };
  }

  const config = loadConfig();
  const escalation = config.escalationRules || {};

  if (riskSummary.highRiskCount > 0) {
    if (escalation.highRiskCountThreshold && riskSummary.highRiskCount >= escalation.highRiskCountThreshold) {
      return {
        conclusion: BUSINESS_CONCLUSIONS.ESCALATE,
        reason: `高风险项${riskSummary.highRiskCount}个，超过阈值${escalation.highRiskCountThreshold}，需升级处理`,
        severity: 'CRITICAL'
      };
    }
    return {
      conclusion: BUSINESS_CONCLUSIONS.FAIL,
      reason: `存在${riskSummary.highRiskCount}个高风险项`,
      severity: 'HIGH'
    };
  }

  if (riskSummary.mediumRiskCount > 0) {
    if (action === 'APPROVE' && riskSummary.mediumRiskCount <= (escalation.mediumRiskCountThreshold || 3)) {
      return {
        conclusion: BUSINESS_CONCLUSIONS.PASS,
        reason: `存在${riskSummary.mediumRiskCount}个中风险项，已通过审批`,
        severity: 'MEDIUM'
      };
    }
    return {
      conclusion: BUSINESS_CONCLUSIONS.PENDING,
      reason: `存在${riskSummary.mediumRiskCount}个中风险项，需复核`,
      severity: 'MEDIUM'
    };
  }

  if (riskSummary.lowRiskCount > 0) {
    return {
      conclusion: BUSINESS_CONCLUSIONS.PASS,
      reason: `存在${riskSummary.lowRiskCount}个低风险项，不影响作业`,
      severity: 'LOW'
    };
  }

  return {
    conclusion: BUSINESS_CONCLUSIONS.PASS,
    reason: '所有校验通过，无风险项',
    severity: 'INFO'
  };
}

function determineNextAction(bizConclusion, riskSummary, action) {
  const config = loadConfig();

  if (action === 'CLOSE') {
    return NEXT_ACTIONS.CLOSE_CASE;
  }

  if (action === 'REOPEN') {
    return NEXT_ACTIONS.MANUAL_CHECK;
  }

  switch (bizConclusion.conclusion) {
    case BUSINESS_CONCLUSIONS.ESCALATE:
      return NEXT_ACTIONS.ESCALATE;
    case BUSINESS_CONCLUSIONS.FAIL:
      if (riskSummary.highRiskCount > 0) {
        return NEXT_ACTIONS.HALT;
      }
      return NEXT_ACTIONS.MANUAL_CHECK;
    case BUSINESS_CONCLUSIONS.PENDING:
      return NEXT_ACTIONS.MANUAL_CHECK;
    case BUSINESS_CONCLUSIONS.PASS:
      return NEXT_ACTIONS.CONTINUE;
    default:
      return NEXT_ACTIONS.MANUAL_CHECK;
  }
}

module.exports = {
  evaluateDetailRisk,
  evaluateBatchRisk,
  determineBusinessConclusion,
  determineNextAction,
  RISK_PRIORITY
};
