const dataStore = require('../models/datastore');
const {
  calculateWindowStart,
  calculateWindowEnd,
  ResultType,
  FailureReason
} = require('../utils/helpers');

class RuleEngine {
  evaluate(params) {
    const {
      businessNo,
      objectStatus,
      timeWindow,
      ruleVersion,
      operator,
      requestTime,
      idempotencyKey,
      isHistoryPlayback,
      providedMaterials
    } = params;

    const traceId = params.traceId;
    const results = [];

    const businessRecord = dataStore.upsertBusinessRecord(businessNo, {});

    if (businessRecord.isLocked) {
      return {
        resultType: ResultType.LOCKED,
        traceId,
        businessNo,
        explanation: {
          reason: FailureReason.BUSINESS_LOCKED,
          message: `业务编号 ${businessNo} 已被锁定`,
          detail: businessRecord.lockReason,
          lockTime: businessRecord.lockTime,
          lockedBy: businessRecord.lockedBy
        },
        businessStatus: businessRecord.status
      };
    }

    const rule = dataStore.getRule('RULE-GRAY-001', ruleVersion) ||
                 dataStore.getRule('RULE-GRAY-002', ruleVersion) ||
                 dataStore.getRule('RULE-GRAY-003', ruleVersion);

    if (!rule) {
      return {
        resultType: ResultType.FAILED,
        traceId,
        businessNo,
        explanation: {
          reason: FailureReason.RULE_NOT_FOUND,
          message: '规则版本不存在',
          detail: `未找到版本为 ${ruleVersion} 的有效规则`
        },
        businessStatus: businessRecord.status
      };
    }

    if (isHistoryPlayback && !this._isPlaybackAllowed(ruleVersion)) {
      return {
        resultType: ResultType.FAILED,
        traceId,
        businessNo,
        explanation: {
          reason: FailureReason.HISTORY_PLAYBACK_NOT_ALLOWED,
          message: '该规则版本不支持历史回放',
          detail: `规则版本 ${ruleVersion} 未配置回放权限`
        },
        businessStatus: businessRecord.status
      };
    }

    if (!rule.objectStatusRequired.includes(objectStatus)) {
      return {
        resultType: ResultType.FAILED,
        traceId,
        businessNo,
        explanation: {
          reason: FailureReason.INVALID_OBJECT_STATUS,
          message: '对象状态不符合规则要求',
          detail: `当前状态: ${objectStatus}，规则允许状态: ${rule.objectStatusRequired.join(', ')}`,
          ruleId: rule.ruleId,
          ruleName: rule.name,
          allowedStatuses: rule.objectStatusRequired
        },
        businessStatus: businessRecord.status
      };
    }

    const effectiveWindow = timeWindow || rule.timeWindow;
    const windowStart = calculateWindowStart(requestTime, effectiveWindow);
    const windowEnd = calculateWindowEnd(windowStart, effectiveWindow);

    const rateRecord = dataStore.getRateLimitRecord(
      businessNo,
      rule.ruleId,
      rule.version,
      windowStart
    );

    const thresholdCheck = this._checkThreshold(rateRecord, rule, effectiveWindow);

    if (!thresholdCheck.passed) {
      return {
        resultType: ResultType.FAILED,
        traceId,
        businessNo,
        explanation: {
          reason: FailureReason.RULE_HIT_THRESHOLD,
          message: '触发限流阈值',
          detail: `当前窗口已调用 ${rateRecord.count} 次，阈值为 ${rule.threshold} 次`,
          ruleId: rule.ruleId,
          ruleName: rule.name,
          ruleVersion: rule.version,
          threshold: rule.threshold,
          currentCount: rateRecord.count,
          windowStart,
          windowEnd
        },
        businessStatus: businessRecord.status
      };
    }

    if (rule.requiresManualReview) {
      if (businessRecord.lastReviewResult === 'APPROVED') {
        dataStore.incrementRateLimit(
          businessNo,
          rule.ruleId,
          rule.version,
          windowStart,
          requestTime
        );

        return {
          resultType: ResultType.PROCESSABLE,
          traceId,
          businessNo,
          explanation: {
            message: '审核通过，可正常办理',
            ruleId: rule.ruleId,
            ruleName: rule.name,
            ruleVersion: rule.version,
            threshold: rule.threshold,
            currentCount: rateRecord.count,
            windowStart,
            windowEnd,
            reviewStatus: 'approved',
            lastReviewTime: businessRecord.lastReviewTime,
            lastReviewComment: businessRecord.lastReviewComment
          },
          businessStatus: businessRecord.status,
          remainingQuota: rule.threshold - rateRecord.count,
          reviewInfo: {
            status: 'approved',
            reviewedBy: businessRecord.reviewAssignee,
            reviewTime: businessRecord.lastReviewTime
          }
        };
      }

      if (businessRecord.lastReviewResult === 'REJECTED') {
        return {
          resultType: ResultType.FAILED,
          traceId,
          businessNo,
          explanation: {
            reason: FailureReason.REVIEW_REJECTED,
            message: '人工审核未通过',
            detail: businessRecord.lastReviewComment || '审核拒绝，具体原因请咨询审核人员',
            ruleId: rule.ruleId,
            ruleName: rule.name,
            ruleVersion: rule.version,
            reviewStatus: 'rejected',
            lastReviewTime: businessRecord.lastReviewTime,
            lastReviewComment: businessRecord.lastReviewComment
          },
          businessStatus: businessRecord.status,
          reviewInfo: {
            status: 'rejected',
            reviewedBy: businessRecord.reviewAssignee,
            reviewTime: businessRecord.lastReviewTime
          }
        };
      }

      const materialCheck = this._checkMaterials(
        providedMaterials || businessRecord.materials,
        rule.reviewRequiredFields
      );

      if (!materialCheck.complete) {
        return {
          resultType: ResultType.NEEDS_SUPPLEMENT,
          traceId,
          businessNo,
          explanation: {
            reason: FailureReason.MISSING_MATERIALS,
            message: '缺少审核所需材料',
            detail: '请补充以下材料后再提交',
            missingFields: materialCheck.missingFields,
            ruleId: rule.ruleId,
            ruleName: rule.name,
            ruleVersion: rule.version
          },
          businessStatus: businessRecord.status,
          requiredActions: [
            { type: 'SUPPLY_MATERIALS', fields: materialCheck.missingFields }
          ]
        };
      }

      if (!businessRecord.pendingReview) {
        dataStore.upsertBusinessRecord(businessNo, {
          pendingReview: true,
          reviewAssignee: null
        });
      }

      return {
        resultType: ResultType.NEEDS_SUPPLEMENT,
        traceId,
        businessNo,
        explanation: {
          reason: FailureReason.MANUAL_REVIEW_REQUIRED,
          message: '需人工复核',
          detail: '该限流规则要求人工复核，请等待审核结果',
          ruleId: rule.ruleId,
          ruleName: rule.name,
          ruleVersion: rule.version,
          reviewStatus: businessRecord.pendingReview ? 'reviewing' : 'pending_submission'
        },
        businessStatus: businessRecord.status,
        reviewInfo: {
          status: businessRecord.pendingReview ? 'reviewing' : 'pending_submission',
          assignee: businessRecord.reviewAssignee
        },
        requiredActions: [
          { type: 'WAIT_FOR_REVIEW', estimatedTime: '24h' }
        ]
      };
    }

    dataStore.incrementRateLimit(
      businessNo,
      rule.ruleId,
      rule.version,
      windowStart,
      requestTime
    );

    return {
      resultType: ResultType.PROCESSABLE,
      traceId,
      businessNo,
      explanation: {
        message: '校验通过，可正常办理',
        ruleId: rule.ruleId,
        ruleName: rule.name,
        ruleVersion: rule.version,
        threshold: rule.threshold,
        currentCount: rateRecord.count,
        windowStart,
        windowEnd
      },
      businessStatus: businessRecord.status,
      remainingQuota: rule.threshold - rateRecord.count
    };
  }

  _checkThreshold(rateRecord, rule, effectiveWindow) {
    const threshold = rule.threshold;
    return {
      passed: rateRecord.count < threshold,
      currentCount: rateRecord.count,
      threshold,
      remaining: Math.max(0, threshold - rateRecord.count)
    };
  }

  _validateObjectStatus(objectStatus, ruleVersion) {
    if (!objectStatus) return false;

    const rules = dataStore.getActiveRules().filter(r => r.version === ruleVersion);
    if (rules.length === 0) return false;

    return rules.some(rule =>
      rule.objectStatusRequired.includes(objectStatus)
    );
  }

  _checkMaterials(providedMaterials, requiredFields) {
    const missing = [];
    requiredFields.forEach(field => {
      if (!providedMaterials || !providedMaterials[field]) {
        missing.push(field);
      }
    });
    return {
      complete: missing.length === 0,
      missingFields: missing
    };
  }

  _isPlaybackAllowed(ruleVersion) {
    const playbackRule = dataStore.getRule('RULE-GRAY-003', ruleVersion);
    return !!playbackRule && playbackRule.isActive;
  }

  getRuleInfo(ruleVersion) {
    const rules = dataStore.getActiveRules().filter(r => r.version === ruleVersion);
    return rules.map(r => ({
      ruleId: r.ruleId,
      name: r.name,
      description: r.description,
      version: r.version,
      threshold: r.threshold,
      timeWindow: r.timeWindow,
      requiresManualReview: r.requiresManualReview
    }));
  }
}

module.exports = new RuleEngine();
