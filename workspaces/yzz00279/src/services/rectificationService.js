const { validateRequest } = require('../validators/validator');
const { evaluateRules, determineFinalAction, routeByProcessAction } = require('./ruleEngine');
const { calculateBatchRisk, addDuplicateRisk } = require('./riskService');
const {
  generateAuditId,
  checkDuplicateSubmission,
  recordSubmission
} = require('./auditService');
const {
  BUSINESS_CONCLUSIONS,
  NEXT_ACTIONS,
  PROCESS_ACTIONS,
  SOURCE_CHANNELS,
  VALIDATION_RULES
} = require('../utils/constants');

class RectificationService {
  constructor(config = {}) {
    this.config = config;
  }

  processRectification(payload) {
    const auditId = generateAuditId('RECT');
    const startTime = new Date();

    const validationResult = validateRequest(payload, this.config);
    if (!validationResult.isValid) {
      const errorCategory = this._categorizeErrors(validationResult.errors);
      const result = this._buildErrorResponse(
        auditId,
        errorCategory.conclusion,
        errorCategory.nextAction,
        validationResult.errors
      );
      return result;
    }

    const duplicateCheck = checkDuplicateSubmission(
      payload.batchNumber,
      payload.items
    );
    if (duplicateCheck.isDuplicate) {
      return this._buildDuplicateResponse(auditId, duplicateCheck.duplicateInfo);
    }

    const batchNumberErrors = this._validateBatchNumberSemantic(payload.batchNumber);
    if (batchNumberErrors.length > 0) {
      return this._buildErrorResponse(
        auditId,
        BUSINESS_CONCLUSIONS.BATCH_NUMBER_ERROR,
        NEXT_ACTIONS.VERIFY_BATCH,
        batchNumberErrors
      );
    }

    const configErrors = this._checkConfiguration();
    if (configErrors.length > 0) {
      return this._buildErrorResponse(
        auditId,
        BUSINESS_CONCLUSIONS.CONFIG_MISSING,
        NEXT_ACTIONS.CHECK_CONFIGURATION,
        configErrors
      );
    }

    const timeBoundaryResult = this._checkTimeBoundary(payload);
    if (!timeBoundaryResult.isValid) {
      return this._buildErrorResponse(
        auditId,
        BUSINESS_CONCLUSIONS.TIME_BOUNDARY_VIOLATION,
        NEXT_ACTIONS.CORRECT_AND_RESUBMIT,
        timeBoundaryResult.errors
      );
    }

    const riskResult = calculateBatchRisk(payload.items);

    const routeResult = routeByProcessAction(payload.processAction, payload.currentStatus);
    if (!routeResult.isValid) {
      return this._buildErrorResponse(
        auditId,
        BUSINESS_CONCLUSIONS.VALIDATION_FAILED,
        NEXT_ACTIONS.CORRECT_AND_RESUBMIT,
        [{
          field: 'processAction',
          message: routeResult.reason,
          errorCode: routeResult.errorCode,
          details: {
            allowedFrom: routeResult.allowedFrom,
            currentStatus: routeResult.currentStatus
          }
        }]
      );
    }

    const context = {
      payload,
      riskResult,
      config: this.config,
      currentStatus: payload.currentStatus || 'NEW'
    };

    const hitRules = evaluateRules(context);
    const finalAction = determineFinalAction(hitRules);

    const isManualReview = finalAction.conclusion === BUSINESS_CONCLUSIONS.MANUAL_REVIEW_REQUIRED ||
                          finalAction.nextAction === NEXT_ACTIONS.MANUAL_REVIEW;

    const isRuleHit = finalAction.conclusion === BUSINESS_CONCLUSIONS.RULE_HIT;

    let conclusion = finalAction.conclusion;
    let nextAction = finalAction.nextAction;
    let riskTags = [...riskResult.allRiskTags];

    if (isManualReview) {
      conclusion = BUSINESS_CONCLUSIONS.MANUAL_REVIEW_REQUIRED;
    }

    if (payload.processAction === PROCESS_ACTIONS.CLOSE &&
        finalAction.nextAction === NEXT_ACTIONS.CLOSE_LOOP) {
      conclusion = BUSINESS_CONCLUSIONS.SUCCESS;
    }

    if (payload.processAction === PROCESS_ACTIONS.REVIEW && isManualReview) {
      conclusion = BUSINESS_CONCLUSIONS.SUCCESS;
      nextAction = NEXT_ACTIONS.AUTO_PROCESS;
    }

    const processTime = new Date() - startTime;

    recordSubmission(
      payload.batchNumber,
      payload.items,
      auditId,
      conclusion,
      {
        sourceChannel: payload.sourceChannel,
        processAction: payload.processAction,
        targetStatus: routeResult.targetStatus,
        hitRuleCount: hitRules.length
      }
    );

    return {
      success: true,
      auditId,
      businessConclusion: conclusion,
      riskLevel: riskResult.overallRiskLevel,
      riskScore: riskResult.overallRiskScore,
      riskTags,
      nextAction,
      targetStatus: routeResult.targetStatus,
      hitRules: finalAction.hitRules,
      primaryRuleHit: finalAction.primaryRuleHit || null,
      isManualReviewRequired: isManualReview,
      isRuleHit,
      itemCount: payload.items.length,
      highRiskItemCount: riskResult.highRiskItemCount || 0,
      processingTimeMs: processTime,
      timestamp: new Date().toISOString(),
      errors: []
    };
  }

  _validateBatchNumberSemantic(batchNumber) {
    const errors = [];
    const trimmed = batchNumber.trim();

    const year = parseInt(trimmed.substring(2, 6), 10);
    const currentYear = new Date().getFullYear();

    if (year < currentYear - 5 || year > currentYear + 1) {
      errors.push({
        field: 'batchNumber',
        message: `批次号年份(${year})不在有效范围内`,
        errorCode: 'BATCH_NUMBER_YEAR_INVALID',
        details: {
          year,
          validRange: `${currentYear - 5} - ${currentYear + 1}`
        }
      });
    }

    if (this.config && this.config.validBatchPrefixes) {
      const prefix = trimmed.substring(0, 2);
      if (!this.config.validBatchPrefixes.includes(prefix)) {
        errors.push({
          field: 'batchNumber',
          message: `批次号前缀(${prefix})不是有效的项目前缀`,
          errorCode: 'BATCH_NUMBER_PREFIX_INVALID',
          details: {
            prefix,
            validPrefixes: this.config.validBatchPrefixes
          }
        });
      }
    }

    return errors;
  }

  _checkConfiguration() {
    const errors = [];
    const requiredConfigs = [
      { key: 'acceptancePrepTime', name: '验收准备时间配置' }
    ];

    if (this.config.strictMode) {
      requiredConfigs.push(
        { key: 'validBatchPrefixes', name: '有效批次号前缀配置' },
        { key: 'rectificationDeadlineDays', name: '整改时限配置' },
        { key: 'reviewDepartments', name: '复核部门配置' }
      );
    }

    requiredConfigs.forEach(cfg => {
      if (!this.config || this.config[cfg.key] === undefined || this.config[cfg.key] === null) {
        if (this.config.missingConfigs) {
          const alreadyMarked = this.config.missingConfigs.some(m => m.key === cfg.key);
          if (alreadyMarked) return;
        }
        errors.push({
          field: `config.${cfg.key}`,
          message: `配置项缺失: ${cfg.name}`,
          errorCode: 'CONFIG_MISSING',
          details: { configKey: cfg.key, configName: cfg.name }
        });
      }
    });

    return errors;
  }

  _categorizeErrors(errors) {
    const errorCodes = errors.map(e => e.errorCode);

    const hasBatchNumberErrors = errorCodes.some(code =>
      code.startsWith('BATCH_NUMBER_') && code !== 'BATCH_NUMBER_EMPTY'
    );

    const hasConfigErrors = errorCodes.some(code => code === 'CONFIG_MISSING');

    const hasTimeErrors = errorCodes.some(code =>
      code === 'ACCEPTANCE_PREP_TIME_INSUFFICIENT' || code === 'TIME_BOUNDARY_VIOLATION'
    );

    if (hasBatchNumberErrors && !hasConfigErrors && !hasTimeErrors) {
      const onlyBatchErrors = errorCodes.every(code =>
        code.startsWith('BATCH_NUMBER_') || code === 'ITEMS_TOO_FEW' || code === 'ITEMS_EMPTY'
      );
      if (onlyBatchErrors) {
        return {
          conclusion: BUSINESS_CONCLUSIONS.BATCH_NUMBER_ERROR,
          nextAction: NEXT_ACTIONS.VERIFY_BATCH
        };
      }
    }

    if (hasConfigErrors) {
      return {
        conclusion: BUSINESS_CONCLUSIONS.CONFIG_MISSING,
        nextAction: NEXT_ACTIONS.CHECK_CONFIGURATION
      };
    }

    if (hasTimeErrors) {
      return {
        conclusion: BUSINESS_CONCLUSIONS.TIME_BOUNDARY_VIOLATION,
        nextAction: NEXT_ACTIONS.CORRECT_AND_RESUBMIT
      };
    }

    return {
      conclusion: BUSINESS_CONCLUSIONS.VALIDATION_FAILED,
      nextAction: NEXT_ACTIONS.CORRECT_AND_RESUBMIT
    };
  }

  _checkTimeBoundary(payload) {
    const errors = [];
    const now = new Date();

    if (payload.items) {
      const overdueItems = payload.items.filter(item => {
        if (!item.deadline) return false;
        const deadline = new Date(item.deadline);
        return deadline < now;
      });

      if (overdueItems.length > 0) {
        errors.push({
          field: 'items.deadline',
          message: `存在${overdueItems.length}条已超期的整改项`,
          errorCode: 'ITEMS_OVERDUE',
          details: {
            overdueCount: overdueItems.length,
            overdueItemIds: overdueItems.map(i => i.itemId)
          }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  _buildErrorResponse(auditId, conclusion, nextAction, errors) {
    return {
      success: false,
      auditId,
      businessConclusion: conclusion,
      riskLevel: null,
      riskScore: 0,
      riskTags: [],
      nextAction,
      targetStatus: null,
      hitRules: [],
      primaryRuleHit: null,
      isManualReviewRequired: false,
      isRuleHit: false,
      itemCount: 0,
      highRiskItemCount: 0,
      processingTimeMs: 0,
      timestamp: new Date().toISOString(),
      errors: errors.map(e => ({
        field: e.field,
        message: e.message,
        errorCode: e.errorCode,
        details: e.details || {}
      })),
      errorCount: errors.length
    };
  }

  _buildDuplicateResponse(auditId, duplicateInfo) {
    return {
      success: false,
      auditId,
      businessConclusion: BUSINESS_CONCLUSIONS.DUPLICATE_SUBMISSION,
      riskLevel: null,
      riskScore: 0,
      riskTags: ['DUPLICATE'],
      nextAction: NEXT_ACTIONS.REJECT_AND_NOTIFY,
      targetStatus: null,
      hitRules: [],
      primaryRuleHit: null,
      isManualReviewRequired: false,
      isRuleHit: false,
      itemCount: 0,
      highRiskItemCount: 0,
      processingTimeMs: 0,
      timestamp: new Date().toISOString(),
      errors: [{
        field: 'batchNumber',
        message: '该批次存在重复提交记录',
        errorCode: 'DUPLICATE_SUBMISSION',
        details: duplicateInfo
      }],
      errorCount: 1,
      duplicateInfo
    };
  }
}

module.exports = RectificationService;
