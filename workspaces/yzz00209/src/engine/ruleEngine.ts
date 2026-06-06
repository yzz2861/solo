import { v4 as uuidv4 } from 'uuid';
import { Rule, RuleCondition, RiskLevel, RuleType } from '../layers/rule';
import { StatusSnapshot, ObjectStatus, QualificationStatus } from '../layers/status';
import { RuleHitDetail } from '../layers/record';

export interface RuleEvaluationContext {
  statusSnapshot: StatusSnapshot;
  timeWindow: { start: Date; end: Date };
  objectProperties: { [key: string]: any };
}

export function evaluateRule(
  rule: Rule,
  context: RuleEvaluationContext
): { isHit: boolean; message: string; riskLevel: RiskLevel; riskTags: string[]; requireReview: boolean } {
  if (!rule.isActive) {
    return {
      isHit: true,
      message: `${rule.name}：规则未启用，跳过`,
      riskLevel: RiskLevel.LOW,
      riskTags: [],
      requireReview: false
    };
  }

  let allConditionsPass = true;
  let failReason = '';

  for (const condition of rule.conditions) {
    const actualValue = getFieldValue(condition.field, context);
    const conditionPass = evaluateCondition(condition, actualValue, context);
    
    if (!conditionPass) {
      allConditionsPass = false;
      failReason = `${condition.field} 不满足要求`;
      break;
    }
  }

  if (allConditionsPass) {
    return {
      isHit: true,
      message: rule.passMessage || `${rule.name}：通过`,
      riskLevel: RiskLevel.LOW,
      riskTags: [],
      requireReview: false
    };
  } else {
    return {
      isHit: false,
      message: rule.failMessage || `${rule.name}：未通过 - ${failReason}`,
      riskLevel: rule.riskLevel,
      riskTags: rule.riskTags,
      requireReview: rule.requireReview || false
    };
  }
}

function getFieldValue(field: string, context: RuleEvaluationContext): any {
  const parts = field.split('.');
  let value: any = {
    ...context.objectProperties,
    statuses: context.statusSnapshot.statuses,
    materialChecklist: context.statusSnapshot.materialChecklist,
    riskScore: context.statusSnapshot.riskScore,
    riskLevel: context.statusSnapshot.riskLevel,
    properties: context.statusSnapshot.properties
  };

  for (const part of parts) {
    if (value === undefined || value === null) return undefined;
    value = value[part];
  }

  return value;
}

function evaluateCondition(
  condition: RuleCondition,
  actualValue: any,
  context: RuleEvaluationContext
): boolean {
  const expectedValue = resolveDynamicValue(condition.value, context);

  switch (condition.operator) {
    case 'eq':
      return actualValue === expectedValue;
    case 'ne':
      return actualValue !== expectedValue;
    case 'gt':
      return actualValue > expectedValue;
    case 'lt':
      return actualValue < expectedValue;
    case 'gte':
      return actualValue >= expectedValue;
    case 'lte':
      return actualValue <= expectedValue;
    case 'in':
      if (Array.isArray(actualValue)) {
        return actualValue.includes(expectedValue);
      }
      return actualValue === expectedValue;
    case 'not_in':
      if (Array.isArray(actualValue)) {
        return !actualValue.includes(expectedValue);
      }
      return actualValue !== expectedValue;
    case 'exists':
      return actualValue !== undefined && actualValue !== null;
    case 'not_exists':
      return actualValue === undefined || actualValue === null;
    default:
      return false;
  }
}

function resolveDynamicValue(value: any, context: RuleEvaluationContext): any {
  if (value === null && context.timeWindow) {
    const sixMonthsAgo = new Date(context.timeWindow.start);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return sixMonthsAgo.getTime();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'string' && !isNaN(Date.parse(value))) {
    return new Date(value).getTime();
  }
  return value;
}

export function evaluateTimeWindowRule(
  rule: Rule,
  context: RuleEvaluationContext
): { isHit: boolean; message: string; riskLevel: RiskLevel; riskTags: string[]; requireReview: boolean } {
  if (rule.type !== RuleType.TIME_WINDOW) {
    return evaluateRule(rule, context);
  }

  const ownerSince = context.objectProperties.ownerSince
    ? new Date(context.objectProperties.ownerSince)
    : null;

  if (!ownerSince) {
    return {
      isHit: false,
      message: '产权取得时间缺失，无法判定',
      riskLevel: RiskLevel.UNDETERMINED,
      riskTags: ['信息缺失'],
      requireReview: true
    };
  }

  const windowStart = new Date(context.timeWindow.start);
  const sixMonthsBeforeWindow = new Date(windowStart);
  sixMonthsBeforeWindow.setMonth(sixMonthsBeforeWindow.getMonth() - 6);

  const meetsRequirement = ownerSince.getTime() <= sixMonthsBeforeWindow.getTime();

  if (meetsRequirement) {
    return {
      isHit: true,
      message: `产权取得于 ${ownerSince.toISOString().split('T')[0]}，满足时间窗口要求`,
      riskLevel: RiskLevel.LOW,
      riskTags: [],
      requireReview: false
    };
  } else {
    return {
      isHit: false,
      message: `产权取得于 ${ownerSince.toISOString().split('T')[0]}，距投票基准日不足6个月`,
      riskLevel: rule.riskLevel,
      riskTags: rule.riskTags,
      requireReview: rule.requireReview || false
    };
  }
}

export function aggregateResults(
  ruleResults: RuleHitDetail[]
): {
  overallRiskLevel: RiskLevel;
  allRiskTags: string[];
  qualificationStatus: QualificationStatus;
  requiresReview: boolean;
  failureReasons: string[];
  passCount: number;
  totalCount: number;
} {
  const failedRules = ruleResults.filter(r => !r.isHit);
  const passCount = ruleResults.filter(r => r.isHit).length;
  const totalCount = ruleResults.length;

  const failureReasons = failedRules.map(r => r.message);
  const allRiskTags = [...new Set(failedRules.flatMap(r => r.riskTags))];

  let highestRisk = RiskLevel.LOW;
  let requiresReview = false;
  let hasUndetermined = false;

  for (const result of failedRules) {
    if (result.riskLevel === RiskLevel.HIGH) {
      highestRisk = RiskLevel.HIGH;
    } else if (result.riskLevel === RiskLevel.MEDIUM && highestRisk !== RiskLevel.HIGH) {
      highestRisk = RiskLevel.MEDIUM;
    } else if (result.riskLevel === RiskLevel.UNDETERMINED) {
      hasUndetermined = true;
    }
    if (result.requireReview) {
      requiresReview = true;
    }
  }

  let status: QualificationStatus;
  if (hasUndetermined && failedRules.length === ruleResults.length) {
    status = QualificationStatus.UNDETERMINED;
    requiresReview = true;
  } else if (failedRules.length === 0) {
    status = QualificationStatus.QUALIFIED;
  } else if (requiresReview) {
    status = QualificationStatus.PENDING_REVIEW;
  } else {
    status = QualificationStatus.NOT_QUALIFIED;
  }

  return {
    overallRiskLevel: highestRisk,
    allRiskTags,
    qualificationStatus: status,
    requiresReview,
    failureReasons,
    passCount,
    totalCount
  };
}

export function generateNextAction(
  status: QualificationStatus,
  riskLevel: RiskLevel
): string {
  switch (status) {
    case QualificationStatus.QUALIFIED:
      return '资格审核通过，可参与投票';
    case QualificationStatus.PENDING_REVIEW:
      if (riskLevel === RiskLevel.HIGH) {
        return '高风险，需提交复核，补充证明材料后由人工审核';
      }
      return '存在待复核项，请补充材料后提交人工审核';
    case QualificationStatus.NOT_QUALIFIED:
      return '审核未通过，不具备投票资格';
    case QualificationStatus.UNDETERMINED:
      return '信息不足，无法判定，请补充完整信息后重新提交';
    default:
      return '状态未知，请联系管理员';
  }
}

export function generateConclusion(
  status: QualificationStatus,
  passCount: number,
  totalCount: number
): string {
  switch (status) {
    case QualificationStatus.QUALIFIED:
      return `投票资格审核通过（${passCount}/${totalCount} 项规则通过）`;
    case QualificationStatus.PENDING_REVIEW:
      return `投票资格待复核（${passCount}/${totalCount} 项规则通过，存在需人工复核项）`;
    case QualificationStatus.NOT_QUALIFIED:
      return `投票资格审核不通过（${passCount}/${totalCount} 项规则通过）`;
    case QualificationStatus.UNDETERMINED:
      return `投票资格无法判定（信息不足，${passCount}/${totalCount} 项规则可评估）`;
    default:
      return '审核状态未知';
  }
}
