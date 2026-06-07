const {
  SOURCE_CHANNELS,
  PROCESS_ACTIONS,
  RECTIFICATION_CATEGORIES,
  VALIDATION_RULES,
  BUSINESS_CONCLUSIONS
} = require('../utils/constants');

class ValidationError extends Error {
  constructor(message, field, errorCode, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.errorCode = errorCode;
    this.details = details;
  }
}

function validateBatchNumber(batchNumber) {
  const errors = [];

  if (!batchNumber) {
    errors.push(new ValidationError(
      '批次号不能为空',
      'batchNumber',
      'BATCH_NUMBER_EMPTY'
    ));
    return errors;
  }

  if (typeof batchNumber !== 'string') {
    errors.push(new ValidationError(
      '批次号必须为字符串类型',
      'batchNumber',
      'BATCH_NUMBER_TYPE_ERROR'
    ));
    return errors;
  }

  const trimmed = batchNumber.trim();

  if (trimmed.length < VALIDATION_RULES.BATCH_NUMBER_MIN_LENGTH) {
    errors.push(new ValidationError(
      `批次号长度不能少于${VALIDATION_RULES.BATCH_NUMBER_MIN_LENGTH}位`,
      'batchNumber',
      'BATCH_NUMBER_TOO_SHORT',
      { minLength: VALIDATION_RULES.BATCH_NUMBER_MIN_LENGTH, actualLength: trimmed.length }
    ));
  }

  if (trimmed.length > VALIDATION_RULES.BATCH_NUMBER_MAX_LENGTH) {
    errors.push(new ValidationError(
      `批次号长度不能超过${VALIDATION_RULES.BATCH_NUMBER_MAX_LENGTH}位`,
      'batchNumber',
      'BATCH_NUMBER_TOO_LONG',
      { maxLength: VALIDATION_RULES.BATCH_NUMBER_MAX_LENGTH, actualLength: trimmed.length }
    ));
  }

  if (!VALIDATION_RULES.BATCH_NUMBER_PATTERN.test(trimmed)) {
    errors.push(new ValidationError(
      '批次号格式错误，需以2位大写字母开头，后跟4位数字，再跟3位以上大写字母或数字',
      'batchNumber',
      'BATCH_NUMBER_FORMAT_ERROR',
      { pattern: VALIDATION_RULES.BATCH_NUMBER_PATTERN.toString() }
    ));
  }

  return errors;
}

function validateSourceChannel(sourceChannel) {
  const errors = [];

  if (!sourceChannel) {
    errors.push(new ValidationError(
      '来源渠道不能为空',
      'sourceChannel',
      'SOURCE_CHANNEL_EMPTY'
    ));
    return errors;
  }

  const validChannels = Object.values(SOURCE_CHANNELS);
  if (!validChannels.includes(sourceChannel)) {
    errors.push(new ValidationError(
      `来源渠道无效，有效值为: ${validChannels.join(', ')}`,
      'sourceChannel',
      'SOURCE_CHANNEL_INVALID',
      { validChannels, actualValue: sourceChannel }
    ));
  }

  return errors;
}

function validateProcessAction(processAction) {
  const errors = [];

  if (!processAction) {
    errors.push(new ValidationError(
      '处理动作不能为空',
      'processAction',
      'PROCESS_ACTION_EMPTY'
    ));
    return errors;
  }

  const validActions = Object.values(PROCESS_ACTIONS);
  if (!validActions.includes(processAction)) {
    errors.push(new ValidationError(
      `处理动作无效，有效值为: ${validActions.join(', ')}`,
      'processAction',
      'PROCESS_ACTION_INVALID',
      { validActions, actualValue: processAction }
    ));
  }

  return errors;
}

function validateReviewOpinion(reviewOpinion, processAction) {
  const errors = [];

  if (processAction === PROCESS_ACTIONS.REVIEW && !reviewOpinion) {
    errors.push(new ValidationError(
      '复核动作必须提供复核意见',
      'reviewOpinion',
      'REVIEW_OPINION_REQUIRED'
    ));
    return errors;
  }

  if (reviewOpinion) {
    if (typeof reviewOpinion !== 'string') {
      errors.push(new ValidationError(
        '复核意见必须为字符串类型',
        'reviewOpinion',
        'REVIEW_OPINION_TYPE_ERROR'
      ));
    } else if (reviewOpinion.length > VALIDATION_RULES.REVIEW_OPINION_MAX_LENGTH) {
      errors.push(new ValidationError(
        `复核意见长度不能超过${VALIDATION_RULES.REVIEW_OPINION_MAX_LENGTH}字`,
        'reviewOpinion',
        'REVIEW_OPINION_TOO_LONG',
        { maxLength: VALIDATION_RULES.REVIEW_OPINION_MAX_LENGTH, actualLength: reviewOpinion.length }
      ));
    }
  }

  return errors;
}

function validateItem(item, index) {
  const errors = [];
  const prefix = `items[${index}]`;

  if (!item || typeof item !== 'object') {
    errors.push(new ValidationError(
      `明细项${index}格式错误`,
      prefix,
      'ITEM_FORMAT_ERROR'
    ));
    return errors;
  }

  if (!item.itemId) {
    errors.push(new ValidationError(
      `明细项${index}的项目ID不能为空`,
      `${prefix}.itemId`,
      'ITEM_ID_EMPTY'
    ));
  }

  if (!item.category) {
    errors.push(new ValidationError(
      `明细项${index}的整改类别不能为空`,
      `${prefix}.category`,
      'ITEM_CATEGORY_EMPTY'
    ));
  } else {
    const validCategories = Object.values(RECTIFICATION_CATEGORIES);
    if (!validCategories.includes(item.category)) {
      errors.push(new ValidationError(
        `明细项${index}的整改类别无效`,
        `${prefix}.category`,
        'ITEM_CATEGORY_INVALID',
        { validCategories, actualValue: item.category }
      ));
    }
  }

  if (!item.description) {
    errors.push(new ValidationError(
      `明细项${index}的问题描述不能为空`,
      `${prefix}.description`,
      'ITEM_DESCRIPTION_EMPTY'
    ));
  } else if (typeof item.description !== 'string') {
    errors.push(new ValidationError(
      `明细项${index}的问题描述必须为字符串`,
      `${prefix}.description`,
      'ITEM_DESCRIPTION_TYPE_ERROR'
    ));
  } else if (item.description.length < 5) {
    errors.push(new ValidationError(
      `明细项${index}的问题描述不能少于5个字`,
      `${prefix}.description`,
      'ITEM_DESCRIPTION_TOO_SHORT'
    ));
  }

  if (item.location === undefined || item.location === null) {
    errors.push(new ValidationError(
      `明细项${index}的位置信息不能为空`,
      `${prefix}.location`,
      'ITEM_LOCATION_EMPTY'
    ));
  }

  if (item.deadline) {
    const deadlineDate = new Date(item.deadline);
    if (isNaN(deadlineDate.getTime())) {
      errors.push(new ValidationError(
        `明细项${index}的截止日期格式错误`,
        `${prefix}.deadline`,
        'ITEM_DEADLINE_FORMAT_ERROR'
      ));
    }
  }

  if (item.severity && !['CRITICAL', 'MAJOR', 'MINOR', 'SUGGESTION'].includes(item.severity)) {
    errors.push(new ValidationError(
      `明细项${index}的严重程度无效`,
      `${prefix}.severity`,
      'ITEM_SEVERITY_INVALID',
      { validSeverities: ['CRITICAL', 'MAJOR', 'MINOR', 'SUGGESTION'], actualValue: item.severity }
    ));
  }

  return errors;
}

function validateItems(items) {
  const errors = [];

  if (!items) {
    errors.push(new ValidationError(
      '明细项不能为空',
      'items',
      'ITEMS_EMPTY'
    ));
    return errors;
  }

  if (!Array.isArray(items)) {
    errors.push(new ValidationError(
      '明细项必须为数组类型',
      'items',
      'ITEMS_TYPE_ERROR'
    ));
    return errors;
  }

  if (items.length < VALIDATION_RULES.MIN_ITEMS) {
    errors.push(new ValidationError(
      `明细项数量不能少于${VALIDATION_RULES.MIN_ITEMS}条`,
      'items',
      'ITEMS_TOO_FEW',
      { minItems: VALIDATION_RULES.MIN_ITEMS, actualCount: items.length }
    ));
  }

  if (items.length > VALIDATION_RULES.MAX_ITEMS) {
    errors.push(new ValidationError(
      `明细项数量不能超过${VALIDATION_RULES.MAX_ITEMS}条`,
      'items',
      'ITEMS_TOO_MANY',
      { maxItems: VALIDATION_RULES.MAX_ITEMS, actualCount: items.length }
    ));
  }

  const itemIds = new Set();
  items.forEach((item, index) => {
    const itemErrors = validateItem(item, index);
    errors.push(...itemErrors);

    if (item && item.itemId) {
      if (itemIds.has(item.itemId)) {
        errors.push(new ValidationError(
          `明细项中存在重复的项目ID: ${item.itemId}`,
          `items[${index}].itemId`,
          'ITEM_ID_DUPLICATE',
          { duplicateId: item.itemId }
        ));
      }
      itemIds.add(item.itemId);
    }
  });

  return errors;
}

function validateTimeBoundary(submitTime, acceptancePrepTime) {
  const errors = [];
  const now = new Date();
  const submit = submitTime ? new Date(submitTime) : now;
  const prepTime = acceptancePrepTime ? new Date(acceptancePrepTime) : null;

  if (prepTime) {
    const hoursDiff = (submit - prepTime) / (1000 * 60 * 60);
    if (hoursDiff < VALIDATION_RULES.ACCEPTANCE_PREP_HOURS) {
      errors.push(new ValidationError(
        `距离验收准备时间不足${VALIDATION_RULES.ACCEPTANCE_PREP_HOURS}小时，暂不受理整改`,
        'acceptancePrepTime',
        'ACCEPTANCE_PREP_TIME_INSUFFICIENT',
        {
          requiredHours: VALIDATION_RULES.ACCEPTANCE_PREP_HOURS,
          actualHours: hoursDiff.toFixed(2),
          acceptancePrepTime: prepTime.toISOString(),
          submitTime: submit.toISOString()
        }
      ));
    }
  }

  return errors;
}

function validateAcceptancePrepData(items, sourceChannel) {
  const errors = [];
  const requiredForAcceptance = ['STRUCTURE', 'WATERPROOF', 'ELECTRICAL', 'FIRE'];
  const categoriesInItems = new Set(items.filter(i => i && i.category).map(i => i.category));

  if (sourceChannel === SOURCE_CHANNELS.PROPERTY_INSPECTION) {
    const missingCategories = requiredForAcceptance.filter(c => !categoriesInItems.has(c));
    if (missingCategories.length > 0) {
      errors.push(new ValidationError(
        `物业验收场景缺少必查类别: ${missingCategories.join(', ')}`,
        'items',
        'ACCEPTANCE_DATA_INCOMPLETE',
        { missingCategories, requiredCategories: requiredForAcceptance }
      ));
    }
  }

  return errors;
}

function validateRequest(payload, config = {}) {
  const allErrors = [];

  allErrors.push(...validateBatchNumber(payload.batchNumber));
  allErrors.push(...validateSourceChannel(payload.sourceChannel));
  allErrors.push(...validateProcessAction(payload.processAction));
  allErrors.push(...validateReviewOpinion(payload.reviewOpinion, payload.processAction));
  allErrors.push(...validateItems(payload.items));

  if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
    allErrors.push(...validateAcceptancePrepData(payload.items, payload.sourceChannel));
  }

  allErrors.push(...validateTimeBoundary(payload.submitTime, config.acceptancePrepTime));

  if (config && config.missingConfigs && config.missingConfigs.length > 0) {
    config.missingConfigs.forEach(cfg => {
      allErrors.push(new ValidationError(
        `配置项缺失: ${cfg.name}`,
        `config.${cfg.key}`,
        'CONFIG_MISSING',
        { configKey: cfg.key, configName: cfg.name }
      ));
    });
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    errorCount: allErrors.length,
    conclusion: allErrors.length > 0 ? BUSINESS_CONCLUSIONS.VALIDATION_FAILED : null
  };
}

module.exports = {
  ValidationError,
  validateBatchNumber,
  validateSourceChannel,
  validateProcessAction,
  validateReviewOpinion,
  validateItem,
  validateItems,
  validateTimeBoundary,
  validateAcceptancePrepData,
  validateRequest
};
