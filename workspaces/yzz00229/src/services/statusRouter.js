const { STATUS, RISK_LEVEL, SUPPLEMENT_FIELDS } = require('../config/constants');
const { calculateRiskLevel, hasInsufficientEvidence } = require('../rules/riskEngine');

function routeStatus(item, action, reviewOpinion, existingRecord) {
  if (existingRecord && existingRecord.status === STATUS.LOCKED) {
    return buildResult(item, STATUS.LOCKED, '该记录已锁定，不可重复处理', existingRecord);
  }

  if (action === '撤销申请') {
    return buildResult(item, STATUS.LOCKED, '已撤销申请，记录锁定');
  }

  if (action === '复核驳回') {
    return handleReviewReject(item, reviewOpinion);
  }

  if (action === '复核通过') {
    return handleReviewApprove(item, reviewOpinion);
  }

  if (action === '补充材料') {
    return handleSupplement(item, existingRecord);
  }

  return handleInitialSubmission(item);
}

function handleInitialSubmission(item) {
  const validation = validateBasicInfo(item);
  if (!validation.valid) {
    return {
      itemId: item.itemId,
      status: STATUS.FAILED,
      riskLevel: null,
      explanation: validation.reason,
      missingFields: validation.missingFields || [],
      riskScore: 0,
      riskFactors: [],
      ruleVersion: null
    };
  }

  const riskResult = calculateRiskLevel(item);

  if (riskResult.riskLevel === RISK_LEVEL.UNDETERMINED) {
    const missingFields = identifyMissingFields(item);
    return {
      itemId: item.itemId,
      status: STATUS.SUPPLEMENT,
      riskLevel: RISK_LEVEL.UNDETERMINED,
      explanation: `证据材料不足，需补充相关材料后重新判定`,
      missingFields: missingFields,
      riskScore: riskResult.riskScore,
      riskFactors: riskResult.riskFactors,
      ruleVersion: riskResult.ruleVersion
    };
  }

  let explanation;
  switch (riskResult.riskLevel) {
    case RISK_LEVEL.HIGH:
      explanation = '高风险占用，建议立即处置，启动执法流程';
      break;
    case RISK_LEVEL.MEDIUM:
      explanation = '中风险占用，按常规流程办理，限期整改';
      break;
    case RISK_LEVEL.LOW:
      explanation = '低风险占用，予以警告登记，定期复查';
      break;
    default:
      explanation = '风险等级待确认';
  }

  return {
    itemId: item.itemId,
    status: STATUS.PROCESSABLE,
    riskLevel: riskResult.riskLevel,
    explanation: explanation,
    missingFields: [],
    riskScore: riskResult.riskScore,
    riskFactors: riskResult.riskFactors,
    ruleVersion: riskResult.ruleVersion
  };
}

function handleSupplement(item, existingRecord) {
  const riskResult = calculateRiskLevel(item);

  if (riskResult.riskLevel === RISK_LEVEL.UNDETERMINED) {
    const missingFields = identifyMissingFields(item);
    return {
      itemId: item.itemId,
      status: STATUS.SUPPLEMENT,
      riskLevel: RISK_LEVEL.UNDETERMINED,
      explanation: '补充材料后证据仍不足，需继续补充',
      missingFields: missingFields,
      riskScore: riskResult.riskScore,
      riskFactors: riskResult.riskFactors,
      ruleVersion: riskResult.ruleVersion
    };
  }

  let explanation;
  switch (riskResult.riskLevel) {
    case RISK_LEVEL.HIGH:
      explanation = '补充材料后判定为高风险占用，立即启动执法流程';
      break;
    case RISK_LEVEL.MEDIUM:
      explanation = '补充材料后判定为中风险占用，按常规流程办理';
      break;
    case RISK_LEVEL.LOW:
      explanation = '补充材料后判定为低风险占用，予以警告登记';
      break;
    default:
      explanation = '补充材料完成，风险等级已确认';
  }

  return {
    itemId: item.itemId,
    status: STATUS.PROCESSABLE,
    riskLevel: riskResult.riskLevel,
    explanation: explanation,
    missingFields: [],
    riskScore: riskResult.riskScore,
    riskFactors: riskResult.riskFactors,
    ruleVersion: riskResult.ruleVersion
  };
}

function handleReviewApprove(item, reviewOpinion) {
  const riskResult = calculateRiskLevel(item);

  return {
    itemId: item.itemId,
    status: STATUS.LOCKED,
    riskLevel: riskResult.riskLevel,
    explanation: `复核通过，已结案归档。复核意见：${reviewOpinion || '无'}`,
    missingFields: [],
    riskScore: riskResult.riskScore,
    riskFactors: riskResult.riskFactors,
    ruleVersion: riskResult.ruleVersion,
    reviewOpinion: reviewOpinion
  };
}

function handleReviewReject(item, reviewOpinion) {
  const missingFields = identifyMissingFields(item);

  return {
    itemId: item.itemId,
    status: STATUS.SUPPLEMENT,
    riskLevel: null,
    explanation: `复核驳回，需重新补充材料。驳回理由：${reviewOpinion || '未提供'}`,
    missingFields: missingFields.length > 0 ? missingFields : ['按复核意见补充材料'],
    riskScore: 0,
    riskFactors: [],
    ruleVersion: null,
    reviewOpinion: reviewOpinion
  };
}

function validateBasicInfo(item) {
  if (!item.itemId) {
    return { valid: false, reason: '明细ID缺失', missingFields: ['itemId'] };
  }

  return { valid: true };
}

function identifyMissingFields(item) {
  const missing = [];

  if (!item.evidenceImages || item.evidenceImages.length === 0) {
    missing.push('evidenceImages');
  }
  if (!item.evidenceVideo || item.evidenceVideo.length === 0) {
    missing.push('evidenceVideo');
  }
  if (!item.witnessInfo || item.witnessInfo.length === 0) {
    missing.push('witnessInfo');
  }
  if (!item.description || item.description.length < 10) {
    missing.push('description');
  }
  if (!item.locationDetail) {
    missing.push('locationDetail');
  }
  if (!item.occurTime) {
    missing.push('occurTime');
  }
  if (!item.occupationDuration) {
    missing.push('occupationDuration');
  }
  if (!item.locationType) {
    missing.push('locationType');
  }
  if (!item.hazardLevel) {
    missing.push('hazardLevel');
  }

  return missing;
}

function buildResult(item, status, explanation, existingRecord) {
  return {
    itemId: item.itemId,
    status: status,
    riskLevel: existingRecord ? existingRecord.riskLevel : null,
    explanation: explanation,
    missingFields: [],
    riskScore: existingRecord ? existingRecord.riskScore : 0,
    riskFactors: existingRecord ? existingRecord.riskFactors : [],
    ruleVersion: existingRecord ? existingRecord.ruleVersion : null,
    isLocked: true
  };
}

module.exports = {
  routeStatus,
  validateBasicInfo,
  identifyMissingFields
};
