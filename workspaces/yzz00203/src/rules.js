const { isEmpty, toNumber } = require('./utils');

const RULE_STATUS = {
  NORMAL: 'normal',
  ABNORMAL: 'abnormal',
  PENDING: 'pending'
};

function loadRules(rulesPath) {
  const fs = require('fs');
  const raw = fs.readFileSync(rulesPath, 'utf-8');
  const rules = JSON.parse(raw);
  validateRulesConfig(rules);
  return rules;
}

function validateRulesConfig(rules) {
  const errors = [];
  if (!rules.scoreRules || !Array.isArray(rules.scoreRules)) {
    errors.push('缺少 scoreRules 配置');
  }
  if (rules.totalMaxScore !== undefined && typeof rules.totalMaxScore !== 'number') {
    errors.push('totalMaxScore 必须是数字');
  }
  if (rules.passScore !== undefined && typeof rules.passScore !== 'number') {
    errors.push('passScore 必须是数字');
  }
  if (errors.length > 0) {
    throw new Error('规则配置错误: ' + errors.join('; '));
  }
}

function validateRequiredFields(record, rules) {
  const missing = [];
  const requiredFields = rules.requiredFields || [];
  for (const field of requiredFields) {
    if (isEmpty(record[field])) {
      missing.push(field);
    }
  }
  return missing;
}

function calculateScore(record, rules) {
  const details = [];
  let totalScore = 0;
  let rawTotalScore = 0;
  const errors = [];

  for (const rule of rules.scoreRules) {
    const rawValue = record[rule.field];
    const result = evaluateSingleRule(rule, rawValue);
    details.push({
      field: rule.field,
      name: rule.name || rule.field,
      rawValue: rawValue ?? '',
      score: result.score,
      maxScore: rule.maxScore || 0,
      valid: result.valid,
      reason: result.reason
    });

    rawTotalScore += result.score;

    if (!result.valid) {
      errors.push(`${rule.name || rule.field}: ${result.reason}`);
    } else {
      totalScore += result.score;
    }
  }

  if (rules.totalMaxScore !== undefined && rawTotalScore > rules.totalMaxScore) {
    errors.push(`总分 ${rawTotalScore} 超过配置上限 ${rules.totalMaxScore}（规则冲突）`);
  }

  return {
    totalScore,
    rawTotalScore,
    details,
    errors,
    passed: errors.length === 0 && (rules.passScore === undefined || totalScore >= rules.passScore)
  };
}

function evaluateSingleRule(rule, rawValue) {
  if (isEmpty(rawValue)) {
    return { valid: false, score: 0, reason: '字段值为空' };
  }

  switch (rule.type) {
    case 'number':
      return evaluateNumberRule(rule, rawValue);
    case 'enum':
      return evaluateEnumRule(rule, rawValue);
    case 'boolean':
      return evaluateBooleanRule(rule, rawValue);
    default:
      return { valid: true, score: toNumber(rawValue) || 0, reason: '' };
  }
}

function evaluateNumberRule(rule, rawValue) {
  const num = toNumber(rawValue);
  if (num === null) {
    return { valid: false, score: 0, reason: `不是有效的数字: ${rawValue}` };
  }

  const maxScore = rule.maxScore || 0;
  const minScore = rule.minScore || 0;

  if (num > maxScore) {
    return { valid: false, score: num, reason: `得分 ${num} 超过上限 ${maxScore}` };
  }
  if (num < minScore) {
    return { valid: false, score: num, reason: `得分 ${num} 低于下限 ${minScore}` };
  }

  return { valid: true, score: num, reason: '' };
}

function evaluateEnumRule(rule, rawValue) {
  const value = String(rawValue).trim();
  const options = rule.options || [];

  if (!options.includes(value)) {
    return {
      valid: false,
      score: 0,
      reason: `值 "${value}" 不在可选范围 [${options.join(', ')}] 内`
    };
  }

  let score = 0;
  if (rule.scores && rule.scores[value] !== undefined) {
    score = rule.scores[value];
  }

  return { valid: true, score, reason: '' };
}

function evaluateBooleanRule(rule, rawValue) {
  const value = String(rawValue).trim().toLowerCase();
  const trueValues = ['是', '有', 'true', 'yes', '1', '合格'];
  const falseValues = ['否', '无', 'false', 'no', '0', '不合格'];

  const isTrue = trueValues.includes(value);
  const isFalse = falseValues.includes(value);

  if (!isTrue && !isFalse) {
    return { valid: false, score: 0, reason: `无法识别的布尔值: ${rawValue}` };
  }

  const trueScore = rule.trueScore || rule.maxScore || 0;
  const falseScore = rule.falseScore || 0;

  return {
    valid: true,
    score: isTrue ? trueScore : falseScore,
    reason: ''
  };
}

function determineStatus(scoreResult, missingFields, isDuplicate) {
  if (isDuplicate) {
    return { status: RULE_STATUS.ABNORMAL, reason: '重复记录，已在历史批次中处理过' };
  }

  if (missingFields.length > 0) {
    return {
      status: RULE_STATUS.ABNORMAL,
      reason: `缺少必填字段: ${missingFields.join(', ')}`
    };
  }

  if (scoreResult.errors.length > 0) {
    const hasConflict = scoreResult.errors.some(e => e.includes('规则冲突') || e.includes('超过上限'));
    if (hasConflict) {
      return {
        status: RULE_STATUS.PENDING,
        reason: `规则冲突/异常待复核: ${scoreResult.errors.join('; ')}`
      };
    }
    return {
      status: RULE_STATUS.ABNORMAL,
      reason: `规则校验不通过: ${scoreResult.errors.join('; ')}`
    };
  }

  return { status: RULE_STATUS.NORMAL, reason: scoreResult.passed ? '评分正常' : '评分未达标' };
}

module.exports = {
  RULE_STATUS,
  loadRules,
  validateRequiredFields,
  calculateScore,
  determineStatus
};
