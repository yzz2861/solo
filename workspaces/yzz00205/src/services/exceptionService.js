const {
  RISK_TAGS,
  NEXT_ACTIONS,
  CONCLUSION_TYPES,
  ERROR_CODES
} = require('../constants')

const EXPLANATIONS = {
  [RISK_TAGS.NORMAL]: {
    title: '正常',
    description: '业务数据完整，规则匹配正常，无异常情况。',
    impact: '无影响，可正常推进。',
    suggestion: '按正常流程处理。'
  },
  [RISK_TAGS.MISSING_FIELDS]: {
    title: '字段缺失',
    description: '提交的业务数据中存在必填字段缺失。',
    impact: '无法完成完整的补贴核算，可能导致核算结果不准确。',
    suggestion: '请补充缺失的字段信息后重新提交。'
  },
  [RISK_TAGS.RULE_CONFLICT]: {
    title: '规则冲突',
    description: '业务数据同时命中多条存在冲突的规则。',
    impact: '核算结果可能存在多解，需人工判定适用规则。',
    suggestion: '请相关规则制定人员或法务主管确认适用规则。'
  },
  [RISK_TAGS.DUPLICATE_PROCESSING]: {
    title: '重复处理',
    description: '该业务编号已存在处理记录，属于重复提交。',
    impact: '重复提交可能导致重复发放补贴，已自动拦截。',
    suggestion: '如确需重新处理，请先撤销原处理记录或走变更流程。'
  },
  [RISK_TAGS.MANUAL_REVIEW]: {
    title: '人工复核',
    description: '根据规则配置，该业务需要人工复核确认。',
    impact: '处理进度暂停，等待人工复核结果。',
    suggestion: '请将相关材料提交给复核人员，按复核意见处理。'
  },
  [RISK_TAGS.RULE_HIT]: {
    title: '规则命中',
    description: '业务数据已成功匹配补贴核算规则。',
    impact: '可正常计算补贴金额。',
    suggestion: '按规则执行补贴发放。'
  },
  [RISK_TAGS.CALCULATION_ERROR]: {
    title: '计算错误',
    description: '补贴金额计算过程中发生错误。',
    impact: '无法得出准确的补贴金额。',
    suggestion: '请检查业务数据和规则版本，联系技术支持。'
  }
}

const NEXT_ACTION_DETAILS = {
  [NEXT_ACTIONS.ACCEPT]: {
    label: '通过',
    description: '业务审核通过，可进入下一环节。',
    requiresAction: false,
    targetRole: 'system'
  },
  [NEXT_ACTIONS.REJECT]: {
    label: '驳回',
    description: '业务不符合要求，予以驳回。',
    requiresAction: false,
    targetRole: 'system'
  },
  [NEXT_ACTIONS.MANUAL_REVIEW]: {
    label: '人工复核',
    description: '需要人工复核确认后才能继续。',
    requiresAction: true,
    targetRole: 'reviewer',
    formFields: ['reviewComment', 'reviewResult']
  },
  [NEXT_ACTIONS.SUPPLEMENT_INFO]: {
    label: '补充信息',
    description: '需要补充缺失的字段信息。',
    requiresAction: true,
    targetRole: 'applicant',
    formFields: ['supplementedFields']
  },
  [NEXT_ACTIONS.RESOLVE_CONFLICT]: {
    label: '解决冲突',
    description: '需要解决规则冲突问题。',
    requiresAction: true,
    targetRole: 'rule_admin',
    formFields: ['conflictResolution', 'selectedRule']
  },
  [NEXT_ACTIONS.REPROCESS]: {
    label: '重新处理',
    description: '撤销原记录后重新提交处理。',
    requiresAction: true,
    targetRole: 'operator',
    formFields: ['reprocessReason']
  },
  [NEXT_ACTIONS.RECORD_ONLY]: {
    label: '仅记录',
    description: '仅做记录处理，不影响业务状态。',
    requiresAction: false,
    targetRole: 'system'
  }
}

const CONCLUSION_DETAILS = {
  [CONCLUSION_TYPES.PASS]: {
    label: '通过',
    level: 'success',
    color: '#52c41a'
  },
  [CONCLUSION_TYPES.FAIL]: {
    label: '不通过',
    level: 'error',
    color: '#ff4d4f'
  },
  [CONCLUSION_TYPES.PENDING]: {
    label: '待补充',
    level: 'warning',
    color: '#faad14'
  },
  [CONCLUSION_TYPES.REVIEW]: {
    label: '待复核',
    level: 'info',
    color: '#1890ff'
  }
}

const ERROR_EXPLANATIONS = {
  [ERROR_CODES.PARAM_MISSING]: {
    title: '参数缺失',
    userMessage: '请求参数不完整，请检查必填项。',
    resolution: '请补充缺失的参数后重新提交请求。'
  },
  [ERROR_CODES.PARAM_INVALID]: {
    title: '参数无效',
    userMessage: '请求参数格式或取值无效。',
    resolution: '请检查参数格式和取值范围，修正后重新提交。'
  },
  [ERROR_CODES.RULE_VERSION_NOT_FOUND]: {
    title: '规则版本不存在',
    userMessage: '指定的规则版本不存在。',
    resolution: '请使用有效的规则版本号，或联系管理员更新规则库。'
  },
  [ERROR_CODES.DUPLICATE_BUSINESS]: {
    title: '业务重复',
    userMessage: '该业务编号已存在处理记录。',
    resolution: '如需重新处理，请走变更或撤销流程。'
  },
  [ERROR_CODES.RULE_CONFLICT]: {
    title: '规则冲突',
    userMessage: '业务数据触发规则冲突。',
    resolution: '请联系规则管理员处理冲突后再提交。'
  },
  [ERROR_CODES.CALCULATION_ERROR]: {
    title: '计算错误',
    userMessage: '补贴计算过程中发生错误。',
    resolution: '请检查业务数据是否正确，或联系技术支持。'
  },
  [ERROR_CODES.AUDIT_NOT_FOUND]: {
    title: '审计记录不存在',
    userMessage: '指定的审计编号不存在。',
    resolution: '请检查审计编号是否正确。'
  },
  [ERROR_CODES.INTERNAL_ERROR]: {
    title: '系统内部错误',
    userMessage: '系统发生内部错误，请稍后重试。',
    resolution: '如问题持续存在，请联系技术支持。'
  }
}

function explainRiskTags(riskTags) {
  if (!riskTags || riskTags.length === 0) {
    return [EXPLANATIONS[RISK_TAGS.NORMAL]]
  }
  return riskTags.map(tag => ({
    tag,
    ...EXPLANATIONS[tag]
  })).filter(Boolean)
}

function explainNextAction(action) {
  return NEXT_ACTION_DETAILS[action] || null
}

function explainConclusion(conclusion) {
  return CONCLUSION_DETAILS[conclusion] || null
}

function explainError(errorCode) {
  return ERROR_EXPLANATIONS[errorCode] || ERROR_EXPLANATIONS[ERROR_CODES.INTERNAL_ERROR]
}

function generateExceptionReport(ruleResult) {
  const { riskTags, nextAction, conclusion, missingFields, conflicts, isDuplicate, previousRecord, calculation, error } = ruleResult

  return {
    summary: {
      totalRisks: riskTags.filter(t => t !== RISK_TAGS.RULE_HIT && t !== RISK_TAGS.NORMAL).length,
      needsManual: nextAction === NEXT_ACTIONS.MANUAL_REVIEW || nextAction === NEXT_ACTIONS.RESOLVE_CONFLICT,
      canAutoProcess: conclusion === CONCLUSION_TYPES.PASS
    },
    riskExplanations: explainRiskTags(riskTags),
    nextActionDetail: explainNextAction(nextAction),
    conclusionDetail: explainConclusion(conclusion),
    missingFieldDetails: missingFields || [],
    conflictDetails: conflicts || [],
    duplicateInfo: isDuplicate ? {
      isDuplicate: true,
      previousAuditNo: previousRecord?.auditNo,
      previousProcessedAt: previousRecord?.processedAt
    } : { isDuplicate: false },
    calculationDetail: calculation || null,
    errorDetail: error ? explainError(error.code) : null
  }
}

function getTaskStatus(businessNo, auditRecord) {
  const { status, nextAction, conclusion, riskTags, createdAt, operator } = auditRecord

  return {
    businessNo,
    auditNo: auditRecord.auditNo,
    currentStatus: status,
    conclusion,
    conclusionDetail: explainConclusion(conclusion),
    nextAction,
    nextActionDetail: explainNextAction(nextAction),
    riskTags,
    riskExplanations: explainRiskTags(riskTags),
    currentHandler: getCurrentHandler(nextAction, operator),
    createdAt,
    lastUpdatedAt: createdAt,
    processingTimeline: buildTimeline(auditRecord)
  }
}

function getCurrentHandler(nextAction, defaultOperator) {
  const actionDetail = NEXT_ACTION_DETAILS[nextAction]
  if (!actionDetail) {
    return defaultOperator
  }
  if (actionDetail.targetRole === 'system') {
    return 'system'
  }
  return actionDetail.targetRole
}

function buildTimeline(auditRecord) {
  const timeline = []

  timeline.push({
    time: auditRecord.createdAt,
    event: '提交申请',
    operator: auditRecord.operator,
    type: 'submit'
  })

  if (auditRecord.ruleHits && auditRecord.ruleHits.length > 0) {
    timeline.push({
      time: auditRecord.createdAt,
      event: `规则匹配：命中 ${auditRecord.ruleHits.length} 条规则`,
      operator: 'system',
      type: 'rule_check'
    })
  }

  if (auditRecord.riskTags && auditRecord.riskTags.length > 0) {
    const hasIssue = auditRecord.riskTags.some(t => t !== RISK_TAGS.RULE_HIT && t !== RISK_TAGS.NORMAL)
    if (hasIssue) {
      timeline.push({
        time: auditRecord.createdAt,
        event: `风险检测：发现 ${auditRecord.riskTags.filter(t => t !== RISK_TAGS.RULE_HIT).length} 个风险项`,
        operator: 'system',
        type: 'risk_check'
      })
    }
  }

  timeline.push({
    time: auditRecord.createdAt,
    event: `处理完成：${auditRecord.status}`,
    operator: 'system',
    type: 'result'
  })

  return timeline
}

module.exports = {
  EXPLANATIONS,
  NEXT_ACTION_DETAILS,
  CONCLUSION_DETAILS,
  ERROR_EXPLANATIONS,
  explainRiskTags,
  explainNextAction,
  explainConclusion,
  explainError,
  generateExceptionReport,
  getTaskStatus
}
