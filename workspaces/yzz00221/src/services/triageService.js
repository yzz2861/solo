const store = require('../store/memoryStore');
const { TRIAGE_CATEGORIES, BUSINESS_CONCLUSIONS, NEXT_ACTIONS, PROCESS_ACTIONS } = require('../models/assessment');
const { deepClone } = require('../utils/helpers');

function triageAssessment(requestData, ruleResults, materialCheck) {
  const { batchNo, processAction, sourceChannel, reviewOpinion } = requestData;

  const existingBatch = store.getBatch(batchNo);
  const isDuplicate = existingBatch && processAction !== PROCESS_ACTIONS.REPLAY && processAction !== PROCESS_ACTIONS.REVIEW && processAction !== PROCESS_ACTIONS.RESUBMIT;

  if (processAction === PROCESS_ACTIONS.REPLAY) {
    return handleReplay(batchNo, requestData, existingBatch);
  }

  if (processAction === PROCESS_ACTIONS.REVIEW) {
    return handleReview(batchNo, requestData, existingBatch, reviewOpinion);
  }

  if (isDuplicate) {
    return handleDuplicate(batchNo, existingBatch);
  }

  if (materialCheck.hasMissing) {
    return handleMaterialMissing(batchNo, materialCheck, requestData);
  }

  const { summary, details } = ruleResults;

  const highOrCritical = details.some(d =>
    d.maxSeverity === 'high' || d.maxSeverity === 'critical'
  );

  const needsReview = details.some(d => {
    if (d.hitRules.length === 0) return false;
    const hasUncertainty = !d.bradenComplete;
    const isBoundary = d.bradenScore && (d.bradenScore === 13 || d.bradenScore === 16);
    return hasUncertainty || isBoundary;
  });

  if (needsReview && !highOrCritical) {
    return handleManualReview(batchNo, ruleResults, requestData);
  }

  if (highOrCritical || summary.ruleHitCount > 0) {
    return handleRuleHit(batchNo, ruleResults, requestData);
  }

  return handleNormal(batchNo, ruleResults, requestData);
}

function handleRuleHit(batchNo, ruleResults, requestData) {
  const { summary, details } = ruleResults;

  const nextActions = [];
  nextActions.push(NEXT_ACTIONS.NOTIFY_WARD);

  if (summary.overallRiskLevel === '极高度风险' || summary.overallRiskLevel === '高度风险') {
    nextActions.push(NEXT_ACTIONS.ESCALATE_TO_DOCTOR);
    nextActions.push(NEXT_ACTIONS.IMPLEMENT_PREVENTION);
  } else {
    nextActions.push(NEXT_ACTIONS.IMPLEMENT_PREVENTION);
  }

  const conclusion = summary.overallRiskLevel === '无风险'
    ? BUSINESS_CONCLUSIONS.COMPLIANT
    : BUSINESS_CONCLUSIONS.OVER_THRESHOLD;

  const triageCategory = summary.overallRiskLevel === '无风险'
    ? TRIAGE_CATEGORIES.NORMAL
    : TRIAGE_CATEGORIES.RULE_HIT;

  const batchData = {
    triageCategory,
    conclusion,
    riskLevel: summary.overallRiskLevel,
    riskLabels: summary.allRiskLabels,
    nextActions,
    ruleHitDetails: details,
    summary,
    sourceChannel: requestData.sourceChannel,
    processAction: requestData.processAction
  };

  store.saveBatch(batchNo, batchData);

  return {
    triageCategory,
    conclusion,
    riskLevel: summary.overallRiskLevel,
    riskLabels: summary.allRiskLabels,
    nextActions,
    summary,
    details,
    reason: summary.overallRiskLevel === '无风险'
      ? '评估结果正常，无压疮风险'
      : `规则命中：共${summary.ruleHitCount}项明细触发风险规则，整体风险等级${summary.overallRiskLevel}`,
    hitRuleCount: summary.ruleHitCount
  };
}

function handleManualReview(batchNo, ruleResults, requestData) {
  const { summary, details } = ruleResults;

  const nextActions = [NEXT_ACTIONS.SCHEDULE_REVIEW];

  const batchData = {
    triageCategory: TRIAGE_CATEGORIES.MANUAL_REVIEW,
    conclusion: BUSINESS_CONCLUSIONS.NEEDS_REVIEW,
    riskLevel: summary.overallRiskLevel,
    riskLabels: summary.allRiskLabels,
    nextActions,
    ruleHitDetails: details,
    summary,
    sourceChannel: requestData.sourceChannel,
    processAction: requestData.processAction,
    reviewStatus: 'PENDING'
  };

  store.saveBatch(batchNo, batchData);

  const uncertainItems = details.filter(d =>
    !d.bradenComplete || (d.bradenScore && (d.bradenScore === 13 || d.bradenScore === 16))
  );

  return {
    triageCategory: TRIAGE_CATEGORIES.MANUAL_REVIEW,
    conclusion: BUSINESS_CONCLUSIONS.NEEDS_REVIEW,
    riskLevel: summary.overallRiskLevel,
    riskLabels: summary.allRiskLabels,
    nextActions,
    summary,
    details,
    reason: `需人工复核：共${uncertainItems.length}项明细存在数据不完整或处于临界阈值，需人工确认`,
    uncertainCount: uncertainItems.length
  };
}

function handleDuplicate(batchNo, existingBatch) {
  return {
    triageCategory: TRIAGE_CATEGORIES.DUPLICATE,
    conclusion: BUSINESS_CONCLUSIONS.DUPLICATE,
    riskLevel: existingBatch.riskLevel,
    riskLabels: existingBatch.riskLabels || [],
    nextActions: [NEXT_ACTIONS.RE_ASSESS],
    summary: existingBatch.summary,
    details: existingBatch.ruleHitDetails,
    reason: `批次号 ${batchNo} 已存在，为重复提交。首次提交时间：${existingBatch.createdAt}，原结论：${existingBatch.conclusion}`,
    originalBatch: {
      batchNo,
      createdAt: existingBatch.createdAt,
      conclusion: existingBatch.conclusion,
      riskLevel: existingBatch.riskLevel
    }
  };
}

function handleMaterialMissing(batchNo, materialCheck, requestData) {
  const missingItems = materialCheck.missingItems;

  const batchData = {
    triageCategory: TRIAGE_CATEGORIES.NORMAL,
    conclusion: BUSINESS_CONCLUSIONS.MATERIAL_MISSING,
    riskLevel: null,
    riskLabels: [],
    nextActions: [NEXT_ACTIONS.COLLECT_MATERIALS],
    missingItems,
    sourceChannel: requestData.sourceChannel,
    processAction: requestData.processAction,
    summary: {
      totalCount: requestData.details.length,
      missingCount: missingItems.length
    }
  };

  store.saveBatch(batchNo, batchData);

  return {
    triageCategory: TRIAGE_CATEGORIES.NORMAL,
    conclusion: BUSINESS_CONCLUSIONS.MATERIAL_MISSING,
    riskLevel: null,
    riskLabels: [],
    nextActions: [NEXT_ACTIONS.COLLECT_MATERIALS],
    missingItems,
    summary: {
      totalCount: requestData.details.length,
      missingCount: missingItems.length
    },
    reason: `材料缺失：共${missingItems.length}项明细缺少必填材料`,
    detailCount: requestData.details.length,
    missingCount: missingItems.length
  };
}

function handleNormal(batchNo, ruleResults, requestData) {
  const { summary, details } = ruleResults;

  const batchData = {
    triageCategory: TRIAGE_CATEGORIES.NORMAL,
    conclusion: BUSINESS_CONCLUSIONS.COMPLIANT,
    riskLevel: '无风险',
    riskLabels: [],
    nextActions: [NEXT_ACTIONS.NO_ACTION],
    ruleHitDetails: details,
    summary,
    sourceChannel: requestData.sourceChannel,
    processAction: requestData.processAction
  };

  store.saveBatch(batchNo, batchData);

  return {
    triageCategory: TRIAGE_CATEGORIES.NORMAL,
    conclusion: BUSINESS_CONCLUSIONS.COMPLIANT,
    riskLevel: '无风险',
    riskLabels: [],
    nextActions: [NEXT_ACTIONS.NO_ACTION],
    summary,
    details,
    reason: '评估结果合规，无压疮风险',
    hitRuleCount: 0
  };
}

function handleReplay(batchNo, requestData, existingBatch) {
  if (!existingBatch) {
    return {
      triageCategory: TRIAGE_CATEGORIES.REPLAY,
      conclusion: '批次不存在',
      riskLevel: null,
      riskLabels: [],
      nextActions: [NEXT_ACTIONS.RE_ASSESS],
      reason: `历史回放失败：批次号 ${batchNo} 不存在`,
      replayError: 'BATCH_NOT_FOUND'
    };
  }

  const replayData = deepClone(existingBatch);
  replayData.replaySource = batchNo;
  replayData.replayTime = new Date().toISOString();
  replayData.conclusion = BUSINESS_CONCLUSIONS.REPLAYED;

  return {
    triageCategory: TRIAGE_CATEGORIES.REPLAY,
    conclusion: BUSINESS_CONCLUSIONS.REPLAYED,
    riskLevel: existingBatch.riskLevel,
    riskLabels: existingBatch.riskLabels || [],
    nextActions: [NEXT_ACTIONS.ARCHIVE],
    summary: existingBatch.summary,
    details: existingBatch.ruleHitDetails || existingBatch.details,
    reason: `历史回放成功：批次号 ${batchNo}，原结论：${existingBatch.conclusion}`,
    originalBatch: {
      batchNo,
      createdAt: existingBatch.createdAt,
      conclusion: existingBatch.conclusion,
      triageCategory: existingBatch.triageCategory,
      riskLevel: existingBatch.riskLevel
    },
    replayTime: replayData.replayTime
  };
}

function handleReview(batchNo, requestData, existingBatch, reviewOpinion) {
  if (!existingBatch) {
    return {
      triageCategory: TRIAGE_CATEGORIES.MANUAL_REVIEW,
      conclusion: '批次不存在',
      riskLevel: null,
      riskLabels: [],
      nextActions: [NEXT_ACTIONS.RE_ASSESS],
      reason: `复核失败：批次号 ${batchNo} 不存在`,
      reviewError: 'BATCH_NOT_FOUND'
    };
  }

  const isPassed = reviewOpinion && (
    reviewOpinion.result === 'pass' ||
    reviewOpinion.result === '通过' ||
    reviewOpinion.status === 'approved'
  );

  const conclusion = isPassed ? BUSINESS_CONCLUSIONS.REVIEW_PASSED : BUSINESS_CONCLUSIONS.REVIEW_REJECTED;

  const nextActions = isPassed
    ? [NEXT_ACTIONS.IMPLEMENT_PREVENTION, NEXT_ACTIONS.ARCHIVE]
    : [NEXT_ACTIONS.RE_ASSESS];

  store.updateBatch(batchNo, {
    conclusion,
    reviewStatus: isPassed ? 'PASSED' : 'REJECTED',
    reviewOpinion,
    reviewTime: new Date().toISOString(),
    nextActions
  });

  return {
    triageCategory: TRIAGE_CATEGORIES.MANUAL_REVIEW,
    conclusion,
    riskLevel: existingBatch.riskLevel,
    riskLabels: existingBatch.riskLabels || [],
    nextActions,
    summary: existingBatch.summary,
    details: existingBatch.ruleHitDetails,
    reason: `人工复核${isPassed ? '通过' : '驳回'}：复核意见 - ${reviewOpinion?.comment || '无'}`,
    reviewOpinion,
    reviewResult: isPassed ? 'PASSED' : 'REJECTED'
  };
}

module.exports = {
  triageAssessment,
  handleRuleHit,
  handleManualReview,
  handleDuplicate,
  handleMaterialMissing,
  handleNormal,
  handleReplay,
  handleReview
};
