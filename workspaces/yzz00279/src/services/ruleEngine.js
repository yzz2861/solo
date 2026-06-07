const {
  BUSINESS_CONCLUSIONS,
  NEXT_ACTIONS,
  PROCESS_ACTIONS,
  SOURCE_CHANNELS,
  RISK_LEVELS,
  VALIDATION_RULES
} = require('../utils/constants');

const ruleDefinitions = [
  {
    id: 'RULE_001',
    name: '高风险自动升级',
    description: '高风险项目自动升级至人工复核',
    condition: (context) => {
      return context.riskResult && context.riskResult.overallRiskLevel === RISK_LEVELS.HIGH;
    },
    action: {
      conclusion: BUSINESS_CONCLUSIONS.RULE_HIT,
      nextAction: NEXT_ACTIONS.MANUAL_REVIEW,
      ruleHit: 'RULE_001'
    },
    priority: 10
  },
  {
    id: 'RULE_002',
    name: '政府来源必复核',
    description: '政府渠道来源的整改项必须人工复核',
    condition: (context) => {
      return context.payload.sourceChannel === SOURCE_CHANNELS.GOVERNMENT;
    },
    action: {
      conclusion: BUSINESS_CONCLUSIONS.MANUAL_REVIEW_REQUIRED,
      nextAction: NEXT_ACTIONS.MANUAL_REVIEW,
      ruleHit: 'RULE_002'
    },
    priority: 9
  },
  {
    id: 'RULE_003',
    name: '结构类缺陷必升级',
    description: '涉及结构安全的缺陷必须人工复核并升级处理',
    condition: (context) => {
      if (!context.riskResult || !context.riskResult.itemRisks) return false;
      return context.riskResult.itemRisks.some(ir =>
        ir.riskTags && ir.riskTags.includes('STRUCTURAL_SAFETY')
      );
    },
    action: {
      conclusion: BUSINESS_CONCLUSIONS.RULE_HIT,
      nextAction: NEXT_ACTIONS.ESCALATE_TO_MANAGER,
      ruleHit: 'RULE_003'
    },
    priority: 8
  },
  {
    id: 'RULE_004',
    name: '超时整改预警',
    description: '整改已超时限，触发超时预警',
    condition: (context) => {
      if (!context.payload.items) return false;
      const now = new Date();
      return context.payload.items.some(item => {
        if (!item.deadline) return false;
        const deadline = new Date(item.deadline);
        return deadline < now;
      });
    },
    action: {
      conclusion: BUSINESS_CONCLUSIONS.TIME_BOUNDARY_VIOLATION,
      nextAction: NEXT_ACTIONS.ESCALATE_TO_MANAGER,
      ruleHit: 'RULE_004'
    },
    priority: 7
  },
  {
    id: 'RULE_005',
    name: '第三方来源低风险自动通过',
    description: '第三方来源且低风险的项目可自动处理',
    condition: (context) => {
      return context.payload.sourceChannel === SOURCE_CHANNELS.THIRD_PARTY &&
             context.riskResult &&
             context.riskResult.overallRiskLevel === RISK_LEVELS.LOW;
    },
    action: {
      conclusion: BUSINESS_CONCLUSIONS.SUCCESS,
      nextAction: NEXT_ACTIONS.AUTO_PROCESS,
      ruleHit: 'RULE_005'
    },
    priority: 5
  },
  {
    id: 'RULE_006',
    name: '物业自查低风险自动闭环',
    description: '物业自查且低风险项目可直接闭环',
    condition: (context) => {
      return context.payload.sourceChannel === SOURCE_CHANNELS.PROPERTY_INSPECTION &&
             context.riskResult &&
             context.riskResult.overallRiskLevel === RISK_LEVELS.LOW &&
             context.payload.processAction === PROCESS_ACTIONS.CLOSE;
    },
    action: {
      conclusion: BUSINESS_CONCLUSIONS.SUCCESS,
      nextAction: NEXT_ACTIONS.CLOSE_LOOP,
      ruleHit: 'RULE_006'
    },
    priority: 4
  },
  {
    id: 'RULE_007',
    name: '高成本项目复核',
    description: '预估整改成本高的项目需人工复核',
    condition: (context) => {
      if (!context.payload.items) return false;
      const highCostCount = context.payload.items.filter(item =>
        item.estimatedCost && item.estimatedCost >= 10000
      ).length;
      return highCostCount > 0;
    },
    action: {
      conclusion: BUSINESS_CONCLUSIONS.MANUAL_REVIEW_REQUIRED,
      nextAction: NEXT_ACTIONS.MANUAL_REVIEW,
      ruleHit: 'RULE_007'
    },
    priority: 6
  },
  {
    id: 'RULE_008',
    name: '业主举报优先处理',
    description: '业主举报渠道来源需优先人工处理',
    condition: (context) => {
      return context.payload.sourceChannel === SOURCE_CHANNELS.OWNER_REPORT;
    },
    action: {
      conclusion: BUSINESS_CONCLUSIONS.MANUAL_REVIEW_REQUIRED,
      nextAction: NEXT_ACTIONS.MANUAL_REVIEW,
      ruleHit: 'RULE_008'
    },
    priority: 8
  }
];

function evaluateRules(context) {
  const sortedRules = [...ruleDefinitions].sort((a, b) => b.priority - a.priority);
  const hitRules = [];

  for (const rule of sortedRules) {
    try {
      if (rule.condition(context)) {
        hitRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleDescription: rule.description,
          action: rule.action,
          priority: rule.priority
        });
      }
    } catch (error) {
      console.error(`规则执行错误 ${rule.id}:`, error.message);
    }
  }

  return hitRules;
}

function determineFinalAction(hitRules) {
  if (hitRules.length === 0) {
    return {
      conclusion: BUSINESS_CONCLUSIONS.SUCCESS,
      nextAction: NEXT_ACTIONS.AUTO_PROCESS,
      hitRules: []
    };
  }

  const highestPriorityRule = hitRules.reduce((highest, current) =>
    current.priority > highest.priority ? current : highest
  );

  return {
    conclusion: highestPriorityRule.action.conclusion,
    nextAction: highestPriorityRule.action.nextAction,
    hitRules: hitRules.map(r => ({
      ruleId: r.ruleId,
      ruleName: r.ruleName
    })),
    primaryRuleHit: highestPriorityRule.ruleId
  };
}

function routeByProcessAction(processAction, currentStatus) {
  const routing = {
    [PROCESS_ACTIONS.SUBMIT]: {
      allowedFrom: ['NEW', 'REJECTED'],
      targetStatus: 'SUBMITTED'
    },
    [PROCESS_ACTIONS.REVIEW]: {
      allowedFrom: ['SUBMITTED', 'REOPENED'],
      targetStatus: 'REVIEWED'
    },
    [PROCESS_ACTIONS.REJECT]: {
      allowedFrom: ['SUBMITTED', 'REVIEWED', 'REOPENED'],
      targetStatus: 'REJECTED'
    },
    [PROCESS_ACTIONS.CLOSE]: {
      allowedFrom: ['REVIEWED', 'SUBMITTED'],
      targetStatus: 'CLOSED'
    },
    [PROCESS_ACTIONS.REOPEN]: {
      allowedFrom: ['CLOSED', 'REJECTED'],
      targetStatus: 'REOPENED'
    },
    [PROCESS_ACTIONS.ESCALATE]: {
      allowedFrom: ['SUBMITTED', 'REVIEWED'],
      targetStatus: 'ESCALATED'
    }
  };

  const route = routing[processAction];
  if (!route) {
    return {
      isValid: false,
      reason: `未知的处理动作: ${processAction}`,
      errorCode: 'PROCESS_ACTION_UNKNOWN'
    };
  }

  if (!route.allowedFrom.includes(currentStatus) && currentStatus) {
    return {
      isValid: false,
      reason: `当前状态(${currentStatus})不允许执行${processAction}操作`,
      errorCode: 'STATUS_TRANSITION_INVALID',
      allowedFrom: route.allowedFrom,
      currentStatus
    };
  }

  return {
    isValid: true,
    targetStatus: route.targetStatus,
    allowedFrom: route.allowedFrom
  };
}

module.exports = {
  ruleDefinitions,
  evaluateRules,
  determineFinalAction,
  routeByProcessAction
};
