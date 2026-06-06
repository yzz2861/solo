const { SOURCE_CHANNELS, ACTIONS, FAIL_REASONS, STATUS } = require('../config/constants');

function validateEvidenceRequest(req, res, next) {
  const errors = [];
  const { batchNo, items, sourceChannel, action, reviewOpinion, operator } = req.body;

  if (!batchNo || typeof batchNo !== 'string' || batchNo.trim().length === 0) {
    errors.push({
      field: 'batchNo',
      reason: FAIL_REASONS.INVALID_BATCH_NO,
      suggestion: '请提供有效的批次号，格式为字符串'
    });
  } else if (batchNo.length > 64) {
    errors.push({
      field: 'batchNo',
      reason: '批次号长度超过限制',
      suggestion: '批次号长度不应超过64个字符'
    });
  }

  if (!items || !Array.isArray(items)) {
    errors.push({
      field: 'items',
      reason: FAIL_REASONS.EMPTY_ITEMS,
      suggestion: '请提供明细项数组'
    });
  } else if (items.length === 0) {
    errors.push({
      field: 'items',
      reason: FAIL_REASONS.EMPTY_ITEMS,
      suggestion: '明细项数组不能为空'
    });
  } else if (items.length > 100) {
    errors.push({
      field: 'items',
      reason: '明细项数量超过限制',
      suggestion: '单次提交明细项不应超过100条'
    });
  } else {
    items.forEach((item, index) => {
      const itemErrors = validateItem(item, index);
      errors.push(...itemErrors);
    });
  }

  if (!sourceChannel || !SOURCE_CHANNELS.includes(sourceChannel)) {
    errors.push({
      field: 'sourceChannel',
      reason: FAIL_REASONS.INVALID_SOURCE,
      suggestion: `来源渠道必须为以下之一：${SOURCE_CHANNELS.join('、')}`
    });
  }

  if (!action || !ACTIONS.includes(action)) {
    errors.push({
      field: 'action',
      reason: FAIL_REASONS.INVALID_ACTION,
      suggestion: `处理动作必须为以下之一：${ACTIONS.join('、')}`
    });
  }

  if ((action === '复核通过' || action === '复核驳回') && (!reviewOpinion || reviewOpinion.trim().length === 0)) {
    errors.push({
      field: 'reviewOpinion',
      reason: '复核操作必须提供复核意见',
      suggestion: '请填写复核意见后再提交'
    });
  }

  if (!operator || typeof operator !== 'string' || operator.trim().length === 0) {
    errors.push({
      field: 'operator',
      reason: '操作人不能为空',
      suggestion: '请提供操作人标识'
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: '请求参数校验失败',
      errorCount: errors.length,
      errors: errors,
      timestamp: new Date().toISOString()
    });
  }

  next();
}

function validateItem(item, index) {
  const errors = [];
  const prefix = `items[${index}]`;

  if (!item.itemId || typeof item.itemId !== 'string' || item.itemId.trim().length === 0) {
    errors.push({
      field: `${prefix}.itemId`,
      reason: FAIL_REASONS.INVALID_ITEM_ID,
      suggestion: '请提供有效的明细项ID'
    });
  }

  if (item.locationDetail && typeof item.locationDetail !== 'string') {
    errors.push({
      field: `${prefix}.locationDetail`,
      reason: '位置描述格式无效',
      suggestion: '位置描述应为字符串类型'
    });
  }

  if (item.occurTime) {
    const date = new Date(item.occurTime);
    if (isNaN(date.getTime())) {
      errors.push({
        field: `${prefix}.occurTime`,
        reason: FAIL_REASONS.INVALID_TIME,
        suggestion: '发生时间格式无效，请使用ISO 8601格式，如：2024-01-01T12:00:00Z'
      });
    }
  }

  if (item.evidenceImages && !Array.isArray(item.evidenceImages)) {
    errors.push({
      field: `${prefix}.evidenceImages`,
      reason: '照片证据格式无效',
      suggestion: '照片证据应为数组格式'
    });
  }

  if (item.evidenceVideo && !Array.isArray(item.evidenceVideo)) {
    errors.push({
      field: `${prefix}.evidenceVideo`,
      reason: '视频证据格式无效',
      suggestion: '视频证据应为数组格式'
    });
  }

  if (item.witnessInfo && !Array.isArray(item.witnessInfo)) {
    errors.push({
      field: `${prefix}.witnessInfo`,
      reason: '证人信息格式无效',
      suggestion: '证人信息应为数组格式'
    });
  }

  if (item.description && typeof item.description !== 'string') {
    errors.push({
      field: `${prefix}.description`,
      reason: '描述内容格式无效',
      suggestion: '描述内容应为字符串类型'
    });
  }

  if (item.occupationDuration && typeof item.occupationDuration !== 'string' && typeof item.occupationDuration !== 'number') {
    errors.push({
      field: `${prefix}.occupationDuration`,
      reason: '占用时长格式无效',
      suggestion: '占用时长应为字符串或数字类型'
    });
  }

  return errors;
}

module.exports = {
  validateEvidenceRequest
};
