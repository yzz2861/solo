const { processSubsidyRules, markProcessed } = require('../services/ruleEngine')
const {
  createAuditRecord,
  getAuditByNo,
  getAuditHistoryByBusiness,
  replayAudit,
  getAuditList
} = require('../services/auditService')
const {
  generateExceptionReport,
  getTaskStatus,
  explainError
} = require('../services/exceptionService')
const {
  AUDIT_TYPES,
  CONCLUSION_TYPES,
  ERROR_CODES
} = require('../constants')

function validateCalculateParams(params) {
  const errors = []
  const { businessNo, objectStatus, timeWindow, ruleVersion, operator } = params

  if (!businessNo) {
    errors.push({ field: 'businessNo', message: '业务编号不能为空' })
  }
  if (!objectStatus) {
    errors.push({ field: 'objectStatus', message: '对象状态不能为空' })
  }
  if (!timeWindow) {
    errors.push({ field: 'timeWindow', message: '时间窗口不能为空' })
  }
  if (!ruleVersion) {
    errors.push({ field: 'ruleVersion', message: '规则版本不能为空' })
  }
  if (!operator) {
    errors.push({ field: 'operator', message: '操作人不能为空' })
  }

  return errors
}

async function calculateSubsidy(req, res) {
  try {
    const params = req.body

    const paramErrors = validateCalculateParams(params)
    if (paramErrors.length > 0) {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.PARAM_MISSING,
        message: '参数校验失败',
        errors: paramErrors,
        errorDetail: explainError(ERROR_CODES.PARAM_MISSING)
      })
    }

    const ruleResult = processSubsidyRules(params)

    const auditRecord = createAuditRecord({
      businessNo: params.businessNo,
      operator: params.operator,
      auditType: AUDIT_TYPES.RULE_CHECK,
      inputData: params,
      outputData: {
        conclusion: ruleResult.conclusion,
        nextAction: ruleResult.nextAction,
        calculation: ruleResult.calculation
      },
      ruleHits: ruleResult.ruleHits,
      riskTags: ruleResult.riskTags,
      status: ruleResult.conclusion,
      remark: generateRemark(ruleResult)
    })

    if (ruleResult.conclusion !== CONCLUSION_TYPES.FAIL || !ruleResult.isDuplicate) {
      markProcessed(params.businessNo, {
        auditNo: auditRecord.auditNo,
        conclusion: ruleResult.conclusion,
        nextAction: ruleResult.nextAction,
        riskTags: ruleResult.riskTags
      })
    }

    const exceptionReport = generateExceptionReport(ruleResult)

    const response = {
      success: true,
      data: {
        businessNo: params.businessNo,
        auditNo: auditRecord.auditNo,
        conclusion: ruleResult.conclusion,
        conclusionDetail: exceptionReport.conclusionDetail,
        riskTags: ruleResult.riskTags,
        riskExplanations: exceptionReport.riskExplanations,
        nextAction: ruleResult.nextAction,
        nextActionDetail: exceptionReport.nextActionDetail,
        calculation: ruleResult.calculation,
        exceptionReport,
        auditInfo: {
          auditNo: auditRecord.auditNo,
          createdAt: auditRecord.createdAt,
          operator: auditRecord.operator
        }
      }
    }

    return res.json(response)
  } catch (error) {
    console.error('Calculate subsidy error:', error)
    return res.status(500).json({
      success: false,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '系统内部错误',
      errorDetail: explainError(ERROR_CODES.INTERNAL_ERROR)
    })
  }
}

function generateRemark(ruleResult) {
  const remarks = []

  if (ruleResult.isDuplicate) {
    remarks.push('重复提交')
  }
  if (ruleResult.missingFields.length > 0) {
    remarks.push(`缺${ruleResult.missingFields.length}个字段`)
  }
  if (ruleResult.conflicts.length > 0) {
    remarks.push(`${ruleResult.conflicts.length}条规则冲突`)
  }
  if (ruleResult.ruleHits.length > 0) {
    remarks.push(`命中${ruleResult.ruleHits.length}条规则`)
  }

  return remarks.join('；') || '正常处理'
}

async function getAuditDetail(req, res) {
  try {
    const { auditNo } = req.params

    const record = getAuditByNo(auditNo)
    if (!record) {
      return res.status(404).json({
        success: false,
        code: ERROR_CODES.AUDIT_NOT_FOUND,
        message: '审计记录不存在',
        errorDetail: explainError(ERROR_CODES.AUDIT_NOT_FOUND)
      })
    }

    const taskStatus = getTaskStatus(record.businessNo, record)

    return res.json({
      success: true,
      data: {
        audit: record,
        taskStatus
      }
    })
  } catch (error) {
    console.error('Get audit detail error:', error)
    return res.status(500).json({
      success: false,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '系统内部错误',
      errorDetail: explainError(ERROR_CODES.INTERNAL_ERROR)
    })
  }
}

async function getAuditReplay(req, res) {
  try {
    const { auditNo } = req.params

    const replayData = replayAudit(auditNo)
    if (!replayData) {
      return res.status(404).json({
        success: false,
        code: ERROR_CODES.AUDIT_NOT_FOUND,
        message: '审计记录不存在',
        errorDetail: explainError(ERROR_CODES.AUDIT_NOT_FOUND)
      })
    }

    return res.json({
      success: true,
      data: replayData
    })
  } catch (error) {
    console.error('Get audit replay error:', error)
    return res.status(500).json({
      success: false,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '系统内部错误',
      errorDetail: explainError(ERROR_CODES.INTERNAL_ERROR)
    })
  }
}

async function getBusinessHistory(req, res) {
  try {
    const { businessNo } = req.params
    const history = getAuditHistoryByBusiness(businessNo)

    return res.json({
      success: true,
      data: {
        businessNo,
        total: history.length,
        records: history
      }
    })
  } catch (error) {
    console.error('Get business history error:', error)
    return res.status(500).json({
      success: false,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '系统内部错误',
      errorDetail: explainError(ERROR_CODES.INTERNAL_ERROR)
    })
  }
}

async function listAudits(req, res) {
  try {
    const params = {
      businessNo: req.query.businessNo,
      operator: req.query.operator,
      auditType: req.query.auditType,
      status: req.query.status,
      pageSize: parseInt(req.query.pageSize, 10) || 20,
      pageNum: parseInt(req.query.pageNum, 10) || 1
    }

    const result = getAuditList(params)

    return res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('List audits error:', error)
    return res.status(500).json({
      success: false,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '系统内部错误',
      errorDetail: explainError(ERROR_CODES.INTERNAL_ERROR)
    })
  }
}

async function reviewSubsidy(req, res) {
  try {
    const { auditNo } = req.params
    const { operator, reviewResult, reviewComment } = req.body

    if (!operator) {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.PARAM_MISSING,
        message: '操作人不能为空',
        errorDetail: explainError(ERROR_CODES.PARAM_MISSING)
      })
    }

    const originalRecord = getAuditByNo(auditNo)
    if (!originalRecord) {
      return res.status(404).json({
        success: false,
        code: ERROR_CODES.AUDIT_NOT_FOUND,
        message: '审计记录不存在',
        errorDetail: explainError(ERROR_CODES.AUDIT_NOT_FOUND)
      })
    }

    const reviewAudit = createAuditRecord({
      businessNo: originalRecord.businessNo,
      operator,
      auditType: AUDIT_TYPES.MANUAL_REVIEW,
      inputData: {
        originalAuditNo: auditNo,
        reviewResult,
        reviewComment
      },
      outputData: {
        reviewResult,
        reviewComment
      },
      ruleHits: [],
      riskTags: reviewResult === 'pass' ? ['review_passed'] : ['review_rejected'],
      status: reviewResult === 'pass' ? 'review_passed' : 'review_rejected',
      remark: reviewComment || ''
    })

    return res.json({
      success: true,
      data: {
        auditNo: reviewAudit.auditNo,
        originalAuditNo: auditNo,
        reviewResult,
        reviewComment,
        reviewedAt: reviewAudit.createdAt,
        reviewer: operator
      }
    })
  } catch (error) {
    console.error('Review subsidy error:', error)
    return res.status(500).json({
      success: false,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '系统内部错误',
      errorDetail: explainError(ERROR_CODES.INTERNAL_ERROR)
    })
  }
}

module.exports = {
  calculateSubsidy,
  getAuditDetail,
  getAuditReplay,
  getBusinessHistory,
  listAudits,
  reviewSubsidy
}
