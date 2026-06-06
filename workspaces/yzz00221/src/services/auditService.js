const store = require('../store/memoryStore');
const { generateAuditId } = require('../utils/helpers');

function createAuditTrail(batchNo, triageResult, requestData) {
  const auditId = generateAuditId();

  const auditLog = {
    auditId,
    batchNo,
    action: requestData.processAction,
    sourceChannel: requestData.sourceChannel,
    triageCategory: triageResult.triageCategory,
    conclusion: triageResult.conclusion,
    riskLevel: triageResult.riskLevel,
    riskLabels: triageResult.riskLabels || [],
    nextActions: triageResult.nextActions || [],
    reason: triageResult.reason || '',
    summary: triageResult.summary || null,
    detailCount: triageResult.summary?.totalCount || requestData.details?.length || 0,
    operator: requestData.operator || 'system',
    requestData: buildRequestSnapshot(requestData),
    timestamp: new Date().toISOString()
  };

  store.addAuditLog(batchNo, auditLog);

  return {
    auditId,
    logs: store.getAuditLogs(batchNo)
  };
}

function buildRequestSnapshot(requestData) {
  const details = requestData.details || [];
  return {
    detailCount: details.length,
    sourceChannel: requestData.sourceChannel,
    processAction: requestData.processAction,
    hasReviewOpinion: !!requestData.reviewOpinion,
    patientIds: details.map(d => d.patientId)
  };
}

function buildResponse(batchNo, triageResult) {
  const auditLogs = store.getAuditLogs(batchNo);
  const latestAudit = auditLogs.length > 0 ? auditLogs[auditLogs.length - 1] : null;

  return {
    success: true,
    data: {
      batchNo,
      businessConclusion: triageResult.conclusion,
      riskLevel: triageResult.riskLevel,
      riskLabels: triageResult.riskLabels || [],
      nextActions: triageResult.nextActions || [],
      auditNo: latestAudit?.auditId || null,
      summary: triageResult.summary || null,
      details: triageResult.details || null,
      triageCategory: triageResult.triageCategory,
      reason: triageResult.reason || '',
      missingItems: triageResult.missingItems || null,
      originalBatch: triageResult.originalBatch || null,
      reviewResult: triageResult.reviewResult || null
    }
  };
}

function getBatchAuditLogs(batchNo) {
  const logs = store.getAuditLogs(batchNo);
  return {
    batchNo,
    logCount: logs.length,
    logs
  };
}

function getSystemStats() {
  return store.getStats();
}

function recordAssessmentDetail(batchNo, detail, riskResult) {
  const assessmentId = `ASSESS-${Date.now()}-${detail.patientId}`;
  store.saveAssessment(assessmentId, {
    batchNo,
    patientId: detail.patientId,
    patientName: detail.patientName,
    age: detail.age,
    braden: detail.braden,
    medicalHistory: detail.medicalHistory,
    riskLevel: riskResult.riskLevel,
    riskLabels: riskResult.riskLabels,
    hitRules: riskResult.hitRules
  });
}

module.exports = {
  createAuditTrail,
  buildResponse,
  getBatchAuditLogs,
  getSystemStats,
  recordAssessmentDetail
};
