const { evaluateRisk, checkMaterialCompleteness } = require('./riskEngine');
const {
  saveAuditRecord,
  findLatestByItemId,
  isDuplicateSubmission,
  generateAuditId
} = require('./storage');
const {
  SOURCE_CHANNELS,
  PROCESS_ACTIONS,
  BUSINESS_CONCLUSIONS,
  RISK_TAGS,
  NEXT_ACTIONS,
  STATUS_FLOW
} = require('./constants');

function validateInput(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['请求体必须为JSON对象'] };
  }

  if (!payload.batchNo || typeof payload.batchNo !== 'string') {
    errors.push('批次号(batchNo)为必填字符串');
  }

  if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push('明细项(items)为必填且至少包含一条');
  }

  if (!payload.sourceChannel || typeof payload.sourceChannel !== 'string') {
    errors.push('来源渠道(sourceChannel)为必填字符串');
  } else if (!Object.values(SOURCE_CHANNELS).includes(payload.sourceChannel)) {
    errors.push(`来源渠道必须为以下值之一: ${Object.values(SOURCE_CHANNELS).join(', ')}`);
  }

  if (!payload.action || typeof payload.action !== 'string') {
    errors.push('处理动作(action)为必填字符串');
  } else if (!Object.values(PROCESS_ACTIONS).includes(payload.action)) {
    errors.push(`处理动作必须为以下值之一: ${Object.values(PROCESS_ACTIONS).join(', ')}`);
  }

  if (payload.items && Array.isArray(payload.items)) {
    payload.items.forEach((item, index) => {
      if (!item.itemId) {
        errors.push(`第${index + 1}条明细缺少itemId`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function processItem(payload, item) {
  const { batchNo, sourceChannel, action, reviewOpinion, reviewer } = payload;
  const itemId = item.itemId;

  const needMaterialCheck = [
    PROCESS_ACTIONS.SUBMIT,
    PROCESS_ACTIONS.RECHECK
  ].includes(action);

  if (needMaterialCheck) {
    const materialCheck = checkMaterialCompleteness(item);
    if (!materialCheck.isComplete) {
      const auditRecord = saveAuditRecord({
        batchNo,
        itemId,
        sourceChannel,
        action,
        detail: item,
        conclusion: BUSINESS_CONCLUSIONS.MATERIAL_MISSING,
        riskTags: [RISK_TAGS.MATERIAL_INCOMPLETE],
        nextAction: NEXT_ACTIONS.SUPPLEMENT_MATERIAL,
        status: STATUS_FLOW.INIT,
        materialCheck: {
          isComplete: false,
          missingFields: materialCheck.missingFields
        },
        failReason: `材料缺失: ${materialCheck.missingFields.join(', ')}`,
        reviewOpinion,
        reviewer
      });

      return buildResponse(auditRecord);
    }
  }

  if (action === PROCESS_ACTIONS.SUBMIT) {
    if (isDuplicateSubmission(batchNo, itemId)) {
      const existing = findLatestByItemId(itemId);
      const auditRecord = saveAuditRecord({
        batchNo,
        itemId,
        sourceChannel,
        action,
        detail: item,
        conclusion: BUSINESS_CONCLUSIONS.DUPLICATE_SUBMISSION,
        riskTags: existing ? existing.riskTags : [],
        nextAction: NEXT_ACTIONS.NO_ACTION,
        status: existing ? existing.status : STATUS_FLOW.INIT,
        isDuplicate: true,
        originalAuditId: existing ? existing.auditId : null,
        failReason: '同一批次下该明细项已提交，请勿重复提交',
        reviewOpinion
      });

      return buildResponse(auditRecord);
    }

    const riskResult = evaluateRisk(item);

    const auditRecord = saveAuditRecord({
      batchNo,
      itemId,
      sourceChannel,
      action,
      detail: item,
      conclusion: riskResult.conclusion,
      riskTags: riskResult.riskTags,
      nextAction: riskResult.nextAction,
      status: riskResult.status,
      riskScore: riskResult.riskScore,
      riskLevel: riskResult.riskLevel,
      hitRules: riskResult.hitRules,
      materialCheck: { isComplete: true, missingFields: [] },
      reviewOpinion
    });

    return buildResponse(auditRecord);
  }

  if (action === PROCESS_ACTIONS.REVIEW_APPROVE || action === PROCESS_ACTIONS.REVIEW_REJECT) {
    const latest = findLatestByItemId(itemId);
    if (!latest) {
      const auditRecord = saveAuditRecord({
        batchNo,
        itemId,
        sourceChannel,
        action,
        detail: item,
        conclusion: BUSINESS_CONCLUSIONS.INVALID,
        riskTags: [RISK_TAGS.NEED_MANUAL_VERIFY],
        nextAction: NEXT_ACTIONS.NO_ACTION,
        status: STATUS_FLOW.INIT,
        failReason: '未找到待复核的原始记录，无法执行复核操作',
        reviewOpinion,
        reviewer
      });
      return buildResponse(auditRecord);
    }

    const isApproved = action === PROCESS_ACTIONS.REVIEW_APPROVE;
    const newConclusion = isApproved ? BUSINESS_CONCLUSIONS.CLOSED : BUSINESS_CONCLUSIONS.RISK_HIGH;
    const newNextAction = isApproved ? NEXT_ACTIONS.PASS_AND_ARCHIVE : NEXT_ACTIONS.BLOCK_ACCOUNT;
    const newStatus = isApproved ? STATUS_FLOW.CLOSED : STATUS_FLOW.REVIEW_REJECTED;

    const auditRecord = saveAuditRecord({
      batchNo,
      itemId,
      sourceChannel,
      action,
      detail: item,
      conclusion: newConclusion,
      riskTags: latest.riskTags || [],
      nextAction: newNextAction,
      status: newStatus,
      riskScore: latest.riskScore || 0,
      riskLevel: latest.riskLevel || 'none',
      hitRules: latest.hitRules || [],
      reviewResult: isApproved ? 'approved' : 'rejected',
      reviewOpinion: reviewOpinion || (isApproved ? '复核通过' : '复核驳回'),
      reviewer: reviewer || 'system',
      originalAuditId: latest.auditId
    });

    return buildResponse(auditRecord);
  }

  if (action === PROCESS_ACTIONS.RECHECK) {
    const latest = findLatestByItemId(itemId);
    const riskResult = evaluateRisk(item);

    const auditRecord = saveAuditRecord({
      batchNo,
      itemId,
      sourceChannel,
      action,
      detail: item,
      conclusion: riskResult.conclusion,
      riskTags: riskResult.riskTags,
      nextAction: riskResult.nextAction,
      status: riskResult.status,
      riskScore: riskResult.riskScore,
      riskLevel: riskResult.riskLevel,
      hitRules: riskResult.hitRules,
      materialCheck: { isComplete: true, missingFields: [] },
      isRecheck: true,
      previousAuditId: latest ? latest.auditId : null,
      reviewOpinion
    });

    return buildResponse(auditRecord);
  }

  if (action === PROCESS_ACTIONS.CLOSE) {
    const latest = findLatestByItemId(itemId);
    const auditRecord = saveAuditRecord({
      batchNo,
      itemId,
      sourceChannel,
      action,
      detail: item,
      conclusion: BUSINESS_CONCLUSIONS.CLOSED,
      riskTags: latest ? latest.riskTags : [],
      nextAction: NEXT_ACTIONS.NO_ACTION,
      status: STATUS_FLOW.CLOSED,
      isClosed: true,
      previousAuditId: latest ? latest.auditId : null,
      reviewOpinion: reviewOpinion || '手动关闭',
      reviewer
    });

    return buildResponse(auditRecord);
  }

  const auditRecord = saveAuditRecord({
    batchNo,
    itemId,
    sourceChannel,
    action,
    detail: item,
    conclusion: BUSINESS_CONCLUSIONS.INVALID,
    riskTags: [],
    nextAction: NEXT_ACTIONS.NO_ACTION,
    status: STATUS_FLOW.INIT,
    failReason: `不支持的处理动作: ${action}`,
    reviewOpinion
  });

  return buildResponse(auditRecord);
}

function buildResponse(auditRecord) {
  return {
    auditId: auditRecord.auditId,
    batchNo: auditRecord.batchNo,
    itemId: auditRecord.itemId,
    businessConclusion: auditRecord.conclusion,
    riskTags: auditRecord.riskTags || [],
    nextAction: auditRecord.nextAction,
    status: auditRecord.status,
    riskScore: auditRecord.riskScore !== undefined ? auditRecord.riskScore : null,
    riskLevel: auditRecord.riskLevel || null,
    hitRules: auditRecord.hitRules || [],
    failReason: auditRecord.failReason || null,
    isDuplicate: auditRecord.isDuplicate || false,
    reviewResult: auditRecord.reviewResult || null,
    createdAt: auditRecord.createdAt
  };
}

function processBatch(payload) {
  const validation = validateInput(payload);

  if (!validation.valid) {
    return {
      success: false,
      code: 'INVALID_INPUT',
      message: '输入参数校验失败',
      errors: validation.errors,
      results: []
    };
  }

  const results = payload.items.map(item => processItem(payload, item));

  const hasErrors = results.some(r =>
    r.businessConclusion === BUSINESS_CONCLUSIONS.MATERIAL_MISSING ||
    r.businessConclusion === BUSINESS_CONCLUSIONS.INVALID
  );

  return {
    success: !hasErrors,
    code: hasErrors ? 'PARTIAL_FAILURE' : 'SUCCESS',
    message: hasErrors ? '部分明细处理失败' : '处理完成',
    totalCount: results.length,
    successCount: results.filter(r =>
      r.businessConclusion !== BUSINESS_CONCLUSIONS.MATERIAL_MISSING &&
      r.businessConclusion !== BUSINESS_CONCLUSIONS.INVALID
    ).length,
    failCount: results.filter(r =>
      r.businessConclusion === BUSINESS_CONCLUSIONS.MATERIAL_MISSING ||
      r.businessConclusion === BUSINESS_CONCLUSIONS.INVALID
    ).length,
    results
  };
}

module.exports = {
  validateInput,
  processItem,
  processBatch,
  buildResponse
};
