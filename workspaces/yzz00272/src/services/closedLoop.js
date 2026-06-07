const { BUSINESS_CONCLUSIONS } = require('../config/constants');

function buildClosedLoopInfo(bizConclusion, nextAction, action, reviewComment, operator) {
  const closedLoop = {
    currentAction: action,
    reviewComment: reviewComment || '',
    operator: operator || 'SYSTEM',
    nextAction: nextAction,
    isClosed: false,
    needsReview: false,
    escalationRequired: false
  };

  switch (bizConclusion.conclusion) {
    case BUSINESS_CONCLUSIONS.PASS:
      closedLoop.needsReview = false;
      if (action === 'CLOSE' || action === 'APPROVE') {
        closedLoop.isClosed = true;
      }
      break;
    case BUSINESS_CONCLUSIONS.PENDING:
      closedLoop.needsReview = true;
      break;
    case BUSINESS_CONCLUSIONS.FAIL:
      closedLoop.needsReview = true;
      break;
    case BUSINESS_CONCLUSIONS.ESCALATE:
      closedLoop.needsReview = true;
      closedLoop.escalationRequired = true;
      break;
  }

  return closedLoop;
}

function buildDetailClosedLoop(detailRisk) {
  return {
    detailId: detailRisk.detailId,
    riskLevel: detailRisk.riskLevel,
    riskTags: detailRisk.riskTags,
    nextAction: detailRisk.nextAction,
    requiresAttention: detailRisk.riskLevel !== 'INFO'
  };
}

module.exports = {
  buildClosedLoopInfo,
  buildDetailClosedLoop
};
