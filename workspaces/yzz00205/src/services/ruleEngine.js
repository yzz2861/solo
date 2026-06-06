const { v4: uuidv4 } = require('uuid')
const {
  SUBSIDY_STANDARDS,
  RULE_VERSIONS,
  RISK_TAGS,
  NEXT_ACTIONS,
  CONCLUSION_TYPES,
  OBJECT_CATEGORIES,
  ERROR_CODES
} = require('../constants')

const processedRecords = new Map()

function validateRuleVersion(version) {
  return RULE_VERSIONS.includes(version)
}

function validateObjectCategory(category) {
  return OBJECT_CATEGORIES.includes(category)
}

function checkDuplicate(businessNo) {
  return processedRecords.has(businessNo)
}

function getPreviousRecord(businessNo) {
  return processedRecords.get(businessNo) || null
}

function calculateSubsidy(objectStatus, ruleVersion, timeWindow) {
  const standards = SUBSIDY_STANDARDS[ruleVersion]
  if (!standards) {
    throw new Error(ERROR_CODES.RULE_VERSION_NOT_FOUND)
  }

  const { category, isRemote = false, hasDifficulty = false } = objectStatus

  if (!validateObjectCategory(category)) {
    throw new Error(ERROR_CODES.PARAM_INVALID)
  }

  const baseAmount = standards[category] || 0

  let amount = baseAmount
  let calculationDetails = {
    baseAmount,
    category,
    ruleVersion,
    adjustments: []
  }

  if (standards.remoteAllowance && isRemote) {
    amount += standards.remoteAllowance
    calculationDetails.adjustments.push({
      type: 'remote_allowance',
      amount: standards.remoteAllowance,
      reason: '偏远地区补贴'
    })
  }

  if (hasDifficulty) {
    const difficultyBonus = Math.floor(baseAmount * 0.2)
    amount += difficultyBonus
    calculationDetails.adjustments.push({
      type: 'difficulty_bonus',
      amount: difficultyBonus,
      reason: '疑难案件加成'
    })
  }

  if (timeWindow && timeWindow.days) {
    const days = parseInt(timeWindow.days, 10)
    if (days > 30) {
      const overtimePenalty = Math.floor(baseAmount * 0.1)
      amount -= overtimePenalty
      calculationDetails.adjustments.push({
        type: 'overtime_penalty',
        amount: -overtimePenalty,
        reason: '超期办理扣减'
      })
    }
  }

  if (amount > standards.maxPerYear) {
    calculationDetails.annualCapApplied = true
    calculationDetails.annualCapAmount = standards.maxPerYear
    amount = standards.maxPerYear
  }

  calculationDetails.finalAmount = Math.max(0, amount)

  return calculationDetails
}

function checkRuleConflicts(objectStatus, ruleVersion) {
  const conflicts = []
  const { category, hasDifficulty, isRemote } = objectStatus

  if (ruleVersion === 'v1.0' && isRemote) {
    conflicts.push({
      ruleId: 'R-001',
      level: 'warning',
      description: 'v1.0版本规则不包含偏远地区补贴标准，按基础金额核算',
      suggestion: '建议升级到v2.0版本以支持偏远地区补贴计算'
    })
  }

  if (category === 'criminal' && hasDifficulty) {
    conflicts.push({
      ruleId: 'R-002',
      level: 'info',
      description: '刑事案件疑难加成需人工复核确认',
      suggestion: '提交复核材料，由法务主管审批'
    })
  }

  return conflicts
}

function checkMissingFields(objectStatus, timeWindow) {
  const missing = []

  if (!objectStatus.category) {
    missing.push({ field: 'objectStatus.category', description: '案件类别缺失' })
  }

  if (!timeWindow || !timeWindow.startDate) {
    missing.push({ field: 'timeWindow.startDate', description: '开始日期缺失' })
  }

  if (!timeWindow || !timeWindow.endDate) {
    missing.push({ field: 'timeWindow.endDate', description: '结束日期缺失' })
  }

  return missing
}

function checkInvalidParams(objectStatus, ruleVersion) {
  const invalid = []

  if (objectStatus.category && !validateObjectCategory(objectStatus.category)) {
    invalid.push({
      field: 'objectStatus.category',
      value: objectStatus.category,
      description: `案件类别不合法，有效值为 ${OBJECT_CATEGORIES.join('、')}`,
      validValues: OBJECT_CATEGORIES
    })
  }

  if (objectStatus.isRemote !== undefined && typeof objectStatus.isRemote !== 'boolean') {
    invalid.push({
      field: 'objectStatus.isRemote',
      value: objectStatus.isRemote,
      description: '是否偏远地区必须为布尔值',
      validType: 'boolean'
    })
  }

  if (objectStatus.hasDifficulty !== undefined && typeof objectStatus.hasDifficulty !== 'boolean') {
    invalid.push({
      field: 'objectStatus.hasDifficulty',
      value: objectStatus.hasDifficulty,
      description: '是否疑难案件必须为布尔值',
      validType: 'boolean'
    })
  }

  return invalid
}

function processSubsidyRules(params) {
  const { businessNo, objectStatus, timeWindow, ruleVersion, operator } = params

  const result = {
    businessNo,
    ruleVersion,
    calculation: null,
    riskTags: [],
    ruleHits: [],
    conflicts: [],
    missingFields: [],
    invalidParams: [],
    isDuplicate: false,
    previousRecord: null,
    conclusion: CONCLUSION_TYPES.PASS,
    nextAction: NEXT_ACTIONS.ACCEPT
  }

  if (!validateRuleVersion(ruleVersion)) {
    result.riskTags.push(RISK_TAGS.CALCULATION_ERROR)
    result.conclusion = CONCLUSION_TYPES.FAIL
    result.nextAction = NEXT_ACTIONS.REJECT
    result.error = {
      code: ERROR_CODES.RULE_VERSION_NOT_FOUND,
      message: `规则版本 ${ruleVersion} 不存在`
    }
    return result
  }

  result.missingFields = checkMissingFields(objectStatus, timeWindow)
  if (result.missingFields.length > 0) {
    result.riskTags.push(RISK_TAGS.MISSING_FIELDS)
    result.conclusion = CONCLUSION_TYPES.PENDING
    result.nextAction = NEXT_ACTIONS.SUPPLEMENT_INFO
  }

  result.invalidParams = checkInvalidParams(objectStatus, ruleVersion)
  if (result.invalidParams.length > 0) {
    result.riskTags.push(RISK_TAGS.INVALID_PARAM)
    result.conclusion = CONCLUSION_TYPES.FAIL
    result.nextAction = NEXT_ACTIONS.REJECT
    result.error = {
      code: ERROR_CODES.PARAM_INVALID,
      message: '存在无效参数',
      details: result.invalidParams
    }
    return result
  }

  result.isDuplicate = checkDuplicate(businessNo)
  if (result.isDuplicate) {
    result.previousRecord = getPreviousRecord(businessNo)
    result.riskTags.push(RISK_TAGS.DUPLICATE_PROCESSING)
    result.conclusion = CONCLUSION_TYPES.FAIL
    result.nextAction = NEXT_ACTIONS.REPROCESS
    return result
  }

  result.conflicts = checkRuleConflicts(objectStatus, ruleVersion)
  if (result.conflicts.length > 0) {
    result.riskTags.push(RISK_TAGS.RULE_CONFLICT)
    result.conclusion = CONCLUSION_TYPES.REVIEW
    result.nextAction = NEXT_ACTIONS.RESOLVE_CONFLICT
  }

  if (result.missingFields.length === 0) {
    try {
      result.calculation = calculateSubsidy(objectStatus, ruleVersion, timeWindow)
      result.ruleHits.push({
        ruleId: 'R-SUB-001',
        ruleName: '基础补贴计算规则',
        hitReason: '符合基础补贴发放条件',
        amount: result.calculation.baseAmount
      })

      result.calculation.adjustments.forEach((adj, idx) => {
        result.ruleHits.push({
          ruleId: `R-ADJ-${String(idx + 1).padStart(3, '0')}`,
          ruleName: adj.reason,
          hitReason: adj.type,
          amount: adj.amount
        })
      })

      if (result.calculation.annualCapApplied) {
        result.ruleHits.push({
          ruleId: 'R-CAP-001',
          ruleName: '年度上限规则',
          hitReason: '超过年度补贴上限，已封顶',
          amount: result.calculation.annualCapAmount
        })
      }

      result.riskTags.push(RISK_TAGS.RULE_HIT)
    } catch (e) {
      result.riskTags.push(RISK_TAGS.CALCULATION_ERROR)
      result.conclusion = CONCLUSION_TYPES.FAIL
      result.nextAction = NEXT_ACTIONS.REJECT
      result.error = {
        code: ERROR_CODES.CALCULATION_ERROR,
        message: e.message
      }
      return result
    }
  }

  if (objectStatus.needsReview || result.conflicts.some(c => c.level === 'warning')) {
    result.riskTags.push(RISK_TAGS.MANUAL_REVIEW)
    result.conclusion = CONCLUSION_TYPES.REVIEW
    result.nextAction = NEXT_ACTIONS.MANUAL_REVIEW
  }

  return result
}

function markProcessed(businessNo, record) {
  processedRecords.set(businessNo, {
    ...record,
    processedAt: new Date().toISOString()
  })
}

module.exports = {
  validateRuleVersion,
  validateObjectCategory,
  checkDuplicate,
  getPreviousRecord,
  calculateSubsidy,
  checkRuleConflicts,
  checkMissingFields,
  checkInvalidParams,
  processSubsidyRules,
  markProcessed
}
