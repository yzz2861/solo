const ruleEngine = require('./ruleEngine');
const dataStore = require('../models/datastore');
const {
  generateTraceId,
  generateRequestId,
  FailureReason,
  ResultType
} = require('../utils/helpers');

class GrayRateLimitService {
  processRequest(params) {
    const {
      businessNo,
      objectStatus,
      timeWindow,
      ruleVersion,
      operator,
      idempotencyKey,
      isHistoryPlayback = false,
      providedMaterials,
      requestTime
    } = params;

    const traceId = generateTraceId();
    const requestId = generateRequestId();
    const effectiveRequestTime = requestTime || new Date().toISOString();

    const validation = this._validateParams(params);
    if (!validation.valid) {
      const auditLog = this._createAuditLog({
        traceId,
        requestId,
        businessNo,
        operator,
        action: 'GRAY_RATE_LIMIT_CHECK',
        status: 'FAILED',
        resultType: ResultType.FAILED,
        failureReason: FailureReason.INVALID_PARAMS,
        detail: validation.message,
        idempotencyKey,
        isHistoryPlayback,
        requestTime: effectiveRequestTime
      });

      return {
        code: 400,
        data: {
          requestId,
          traceId,
          resultType: ResultType.FAILED,
          businessNo,
          explanation: {
            reason: FailureReason.INVALID_PARAMS,
            message: validation.message,
            detail: validation.fields
          }
        }
      };
    }

    if (idempotencyKey) {
      const isDuplicate = dataStore.isDuplicateSubmission(businessNo, idempotencyKey);
      if (isDuplicate) {
        const previousLog = dataStore.getAuditLogs(businessNo).find(
          log => log.idempotencyKey === idempotencyKey
        );

        const auditLog = this._createAuditLog({
          traceId,
          requestId,
          businessNo,
          operator,
          action: 'GRAY_RATE_LIMIT_CHECK',
          status: 'REJECTED',
          resultType: ResultType.FAILED,
          failureReason: FailureReason.DUPLICATE_SUBMISSION,
          detail: `重复提交，原始请求: ${previousLog ? previousLog.requestId : 'unknown'}`,
          idempotencyKey,
          originalRequestId: previousLog ? previousLog.requestId : null,
          isHistoryPlayback,
          requestTime: effectiveRequestTime
        });

        return {
          code: 409,
          data: {
            requestId,
            traceId,
            resultType: ResultType.FAILED,
            businessNo,
            explanation: {
              reason: FailureReason.DUPLICATE_SUBMISSION,
              message: '重复提交',
              detail: '该幂等键已存在，请勿重复提交',
              idempotencyKey,
              originalRequestId: previousLog ? previousLog.requestId : null,
              originalRequestTime: previousLog ? previousLog.timestamp : null
            }
          }
        };
      }
    }

    const result = ruleEngine.evaluate({
      businessNo,
      objectStatus,
      timeWindow,
      ruleVersion,
      operator,
      requestTime: effectiveRequestTime,
      traceId,
      idempotencyKey,
      isHistoryPlayback,
      providedMaterials
    });

    const status = result.resultType === ResultType.PROCESSABLE ? 'PASSED' :
                   result.resultType === ResultType.LOCKED ? 'LOCKED' :
                   result.resultType === ResultType.NEEDS_SUPPLEMENT ? 'PENDING' : 'REJECTED';

    const auditLog = this._createAuditLog({
      traceId,
      requestId,
      businessNo,
      operator,
      action: 'GRAY_RATE_LIMIT_CHECK',
      status,
      resultType: result.resultType,
      failureReason: result.explanation ? result.explanation.reason : null,
      ruleVersion,
      objectStatus,
      detail: result.explanation ? result.explanation.message : null,
      idempotencyKey,
      isHistoryPlayback,
      requestTime: effectiveRequestTime,
      remainingQuota: result.remainingQuota
    });

    const responseCode = result.resultType === ResultType.PROCESSABLE ? 200 :
                         result.resultType === ResultType.NEEDS_SUPPLEMENT ? 202 :
                         result.resultType === ResultType.LOCKED ? 423 : 429;

    return {
      code: responseCode,
      data: {
        requestId,
        traceId,
        ...result
      }
    };
  }

  lockBusiness(params) {
    const { businessNo, reason, operator } = params;
    const traceId = generateTraceId();
    const requestId = generateRequestId();

    const business = dataStore.upsertBusinessRecord(businessNo, {
      isLocked: true,
      lockReason: reason,
      lockTime: new Date().toISOString(),
      lockedBy: operator
    });

    this._createAuditLog({
      traceId,
      requestId,
      businessNo,
      operator,
      action: 'LOCK_BUSINESS',
      status: 'SUCCESS',
      resultType: ResultType.LOCKED,
      detail: reason
    });

    return {
      code: 200,
      data: {
        requestId,
        traceId,
        businessNo,
        isLocked: true,
        lockReason: reason,
        lockTime: business.lockTime,
        lockedBy: operator
      }
    };
  }

  unlockBusiness(params) {
    const { businessNo, reason, operator } = params;
    const traceId = generateTraceId();
    const requestId = generateRequestId();

    const business = dataStore.upsertBusinessRecord(businessNo, {
      isLocked: false,
      lockReason: null,
      lockTime: null,
      lockedBy: null
    });

    this._createAuditLog({
      traceId,
      requestId,
      businessNo,
      operator,
      action: 'UNLOCK_BUSINESS',
      status: 'SUCCESS',
      resultType: ResultType.PROCESSABLE,
      detail: reason
    });

    return {
      code: 200,
      data: {
        requestId,
        traceId,
        businessNo,
        isLocked: false,
        unlockReason: reason,
        unlockTime: new Date().toISOString(),
        unlockedBy: operator
      }
    };
  }

  reviewDecision(params) {
    const { businessNo, decision, reviewComment, operator, ruleVersion } = params;
    const traceId = generateTraceId();
    const requestId = generateRequestId();

    const business = dataStore.getBusinessRecord(businessNo);
    if (!business || !business.pendingReview) {
      return {
        code: 400,
        data: {
          requestId,
          traceId,
          businessNo,
          resultType: ResultType.FAILED,
          explanation: {
            reason: 'no_pending_review',
            message: '该业务没有待审核记录',
            detail: '无需进行审核操作'
          }
        }
      };
    }

    const updated = dataStore.upsertBusinessRecord(businessNo, {
      pendingReview: false,
      reviewAssignee: operator,
      lastReviewResult: decision,
      lastReviewTime: new Date().toISOString(),
      lastReviewComment: reviewComment
    });

    this._createAuditLog({
      traceId,
      requestId,
      businessNo,
      operator,
      action: 'REVIEW_DECISION',
      status: decision === 'APPROVED' ? 'PASSED' : 'REJECTED',
      resultType: decision === 'APPROVED' ? ResultType.PROCESSABLE : ResultType.FAILED,
      detail: reviewComment,
      reviewDecision: decision,
      ruleVersion
    });

    return {
      code: 200,
      data: {
        requestId,
        traceId,
        businessNo,
        reviewResult: decision,
        reviewComment,
        reviewTime: updated.lastReviewTime,
        reviewedBy: operator
      }
    };
  }

  getTrace(traceId) {
    const logs = dataStore.auditLogs.filter(log => log.traceId === traceId);
    const requestId = generateRequestId();

    if (logs.length === 0) {
      return {
        code: 404,
        data: {
          requestId,
          traceId,
          found: false,
          message: '未找到该追踪编号的记录'
        }
      };
    }

    return {
      code: 200,
      data: {
        requestId,
        traceId,
        found: true,
        records: logs
      }
    };
  }

  getAuditLogs(businessNo, limit = 50) {
    const requestId = generateRequestId();
    let logs = dataStore.getAuditLogs(businessNo);
    logs = logs.slice(-limit);

    return {
      code: 200,
      data: {
        requestId,
        businessNo: businessNo || null,
        total: logs.length,
        logs: logs.reverse()
      }
    };
  }

  _validateParams(params) {
    const { businessNo, objectStatus, ruleVersion, operator } = params;
    const missingFields = [];

    if (!businessNo) missingFields.push('businessNo');
    if (!objectStatus) missingFields.push('objectStatus');
    if (!ruleVersion) missingFields.push('ruleVersion');
    if (!operator) missingFields.push('operator');

    if (missingFields.length > 0) {
      return {
        valid: false,
        message: `缺少必填参数: ${missingFields.join(', ')}`,
        fields: missingFields
      };
    }

    return { valid: true };
  }

  _createAuditLog(logData) {
    return dataStore.addAuditLog(logData);
  }
}

module.exports = new GrayRateLimitService();
