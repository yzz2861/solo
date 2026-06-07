const logger = require('../utils/logger');
const { loadConfig } = require('../config/config');
const { RULE_VERSION, RULE_VERSION_DATE } = require('../config/constants');
const { validateRequest } = require('./validator');
const { evaluateDetailRisk, evaluateBatchRisk, determineBusinessConclusion, determineNextAction } = require('./riskEngine');
const { buildClosedLoopInfo, buildDetailClosedLoop } = require('./closedLoop');
const {
  generateAuditNo,
  generateIdempotencyKey,
  saveAuditRecord,
  getAuditRecord,
  saveRequestResult,
  getRequestResult
} = require('../store/auditStore');

function processBridgeDockingRequest(reqBody) {
  const startTime = Date.now();
  const config = loadConfig();

  const validationResult = validateRequest(reqBody);
  const idempotencyKey = generateIdempotencyKey(
    reqBody?.batchNo || 'UNKNOWN',
    reqBody?.action || 'UNKNOWN',
    reqBody?.sourceChannel || 'UNKNOWN'
  );

  const cachedResult = getRequestResult(idempotencyKey);
  if (cachedResult && validationResult.valid) {
    logger.info('幂等命中，返回缓存结果', {
      batchNo: reqBody.batchNo,
      idempotencyKey,
      auditNo: cachedResult.auditNo
    });
    return {
      ...cachedResult,
      _fromCache: true
    };
  }

  const auditNo = generateAuditNo();

  if (!validationResult.valid) {
    const errorResult = buildErrorResponse(validationResult, auditNo, reqBody);
    saveAuditRecord(auditNo, {
      type: 'VALIDATION_ERROR',
      request: reqBody,
      response: errorResult,
      errors: validationResult.errors
    });
    logger.error('数据校验失败', {
      auditNo,
      batchNo: reqBody?.batchNo,
      errors: validationResult.errors
    });
    return errorResult;
  }

  const data = validationResult.data;
  const detailRisks = data.details.map(detail => evaluateDetailRisk(detail));
  const riskSummary = evaluateBatchRisk(detailRisks);
  const bizConclusion = determineBusinessConclusion(validationResult, riskSummary, data.action);
  const nextAction = determineNextAction(bizConclusion, riskSummary, data.action);
  const closedLoop = buildClosedLoopInfo(bizConclusion, nextAction, data.action, data.reviewComment, data.operator);
  const detailClosedLoops = detailRisks.map(dr => buildDetailClosedLoop(dr));

  const response = {
    code: 0,
    message: '处理成功',
    data: {
      auditNo,
      batchNo: data.batchNo,
      businessConclusion: bizConclusion.conclusion,
      conclusionReason: bizConclusion.reason,
      conclusionSeverity: bizConclusion.severity,
      riskTags: riskSummary.allRiskTags,
      nextAction,
      closedLoop,
      summary: {
        totalCount: riskSummary.totalCount,
        highRiskCount: riskSummary.highRiskCount,
        mediumRiskCount: riskSummary.mediumRiskCount,
        lowRiskCount: riskSummary.lowRiskCount,
        infoCount: riskSummary.infoCount
      },
      details: detailClosedLoops,
      ruleVersion: RULE_VERSION,
      ruleVersionDate: RULE_VERSION_DATE,
      operator: data.operator,
      sourceChannel: data.sourceChannel,
      processingTimeMs: Date.now() - startTime
    }
  };

  saveAuditRecord(auditNo, {
    type: 'PROCESS_SUCCESS',
    request: reqBody,
    response,
    validation: validationResult,
    riskSummary,
    bizConclusion
  });

  saveRequestResult(idempotencyKey, response);

  logger.info('廊桥靠接安全处理完成', {
    auditNo,
    batchNo: data.batchNo,
    businessConclusion: bizConclusion.conclusion,
    highRiskCount: riskSummary.highRiskCount,
    mediumRiskCount: riskSummary.mediumRiskCount,
    totalCount: riskSummary.totalCount
  });

  return response;
}

function buildErrorResponse(validationResult, auditNo, reqBody) {
  return {
    code: 400,
    message: '参数校验失败',
    data: {
      auditNo,
      batchNo: reqBody?.batchNo || null,
      businessConclusion: 'FAIL',
      conclusionReason: '数据校验未通过',
      conclusionSeverity: 'ERROR',
      riskTags: [],
      nextAction: '人工现场确认',
      closedLoop: {
        currentAction: reqBody?.action || null,
        reviewComment: reqBody?.reviewComment || '',
        operator: reqBody?.operator || 'SYSTEM',
        nextAction: '人工现场确认',
        isClosed: false,
        needsReview: true,
        escalationRequired: false
      },
      summary: {
        totalCount: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        infoCount: 0
      },
      details: [],
      validationErrors: validationResult.errors,
      validationWarnings: validationResult.warnings,
      ruleVersion: RULE_VERSION,
      ruleVersionDate: RULE_VERSION_DATE,
      operator: reqBody?.operator || 'SYSTEM',
      sourceChannel: reqBody?.sourceChannel || null
    }
  };
}

function queryAudit(auditNo) {
  const record = getAuditRecord(auditNo);
  if (!record) {
    return {
      code: 404,
      message: '审计记录不存在',
      data: null
    };
  }
  return {
    code: 0,
    message: '查询成功',
    data: {
      auditNo: record.auditNo,
      createdAt: record.createdAt,
      type: record.type,
      batchNo: record.request?.batchNo,
      businessConclusion: record.response?.data?.businessConclusion,
      riskTags: record.response?.data?.riskTags || []
    }
  };
}

module.exports = {
  processBridgeDockingRequest,
  queryAudit
};
