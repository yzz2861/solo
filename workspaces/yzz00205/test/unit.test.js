const assert = require('assert')
const {
  processSubsidyRules,
  validateRuleVersion,
  validateObjectCategory,
  checkMissingFields,
  checkInvalidParams,
  calculateSubsidy,
  markProcessed
} = require('../src/services/ruleEngine')

const {
  createAuditRecord,
  getAuditByNo,
  replayAudit,
  getAuditHistoryByBusiness
} = require('../src/services/auditService')

const {
  generateExceptionReport,
  explainRiskTags,
  getTaskStatus
} = require('../src/services/exceptionService')

const {
  RISK_TAGS,
  CONCLUSION_TYPES,
  NEXT_ACTIONS,
  OBJECT_CATEGORIES,
  RULE_VERSIONS,
  ERROR_CODES
} = require('../src/constants')

let passed = 0
let failed = 0
const failures = []

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    failures.push({ name, error: e })
    console.log(`  ✗ ${name}`)
    console.log(`    ${e.message}`)
  }
}

function makeBaseParams(overrides = {}) {
  return {
    businessNo: 'TEST-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    objectStatus: {
      category: 'civil',
      isRemote: false,
      hasDifficulty: false
    },
    timeWindow: {
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      days: 14
    },
    ruleVersion: 'v2.0',
    operator: 'test-operator',
    ...overrides
  }
}

console.log('========== 法援案件补贴核算 API 单元测试 ==========\n')

console.log('\n1. 常量与基础校验')
test('合法规则版本应返回 true', () => {
  assert.strictEqual(validateRuleVersion('v2.0'), true)
})

test('非法规则版本应返回 false', () => {
  assert.strictEqual(validateRuleVersion('v99.0'), false)
})

test('合法案件类别应返回 true', () => {
  OBJECT_CATEGORIES.forEach(cat => {
    assert.strictEqual(validateObjectCategory(cat), true, `${cat} 应该是合法类别`)
  })
})

test('非法案件类别应返回 false', () => {
  assert.strictEqual(validateObjectCategory('unknown'), false)
  assert.strictEqual(validateObjectCategory(''), false)
  assert.strictEqual(validateObjectCategory(null), false)
  assert.strictEqual(validateObjectCategory(undefined), false)
})

test('OBJECT_CATEGORIES 包含 criminal, civil, administrative', () => {
  assert.deepStrictEqual(
    OBJECT_CATEGORIES.sort(),
    ['administrative', 'civil', 'criminal'].sort()
  )
})

console.log('\n2. 缺字段校验 (checkMissingFields)')
test('完整数据应无缺失字段', () => {
  const missing = checkMissingFields(
    { category: 'civil' },
    { startDate: '2026-01-01', endDate: '2026-01-15' }
  )
  assert.strictEqual(missing.length, 0)
})

test('缺失 category 应被检测', () => {
  const missing = checkMissingFields(
    {},
    { startDate: '2026-01-01', endDate: '2026-01-15' }
  )
  assert.strictEqual(missing.length, 1)
  assert.strictEqual(missing[0].field, 'objectStatus.category')
})

test('缺失 timeWindow 应被检测', () => {
  const missing = checkMissingFields({ category: 'civil' }, null)
  assert.strictEqual(missing.length, 2)
})

console.log('\n3. 无效参数校验 (checkInvalidParams) - 本次修复重点')
test('未知 category 应被检测为无效参数', () => {
  const invalid = checkInvalidParams({ category: 'unknown' }, 'v2.0')
  assert.strictEqual(invalid.length, 1, '应检测到1个无效参数')
  assert.strictEqual(invalid[0].field, 'objectStatus.category')
  assert.strictEqual(invalid[0].value, 'unknown')
  assert.ok(invalid[0].description.includes('不合法'))
})

test('合法 category 不应被检测为无效', () => {
  const invalid = checkInvalidParams({ category: 'civil' }, 'v2.0')
  assert.strictEqual(invalid.length, 0)
})

test('isRemote 非布尔值应被检测', () => {
  const invalid = checkInvalidParams(
    { category: 'civil', isRemote: 'yes' },
    'v2.0'
  )
  assert.strictEqual(invalid.length, 1)
  assert.strictEqual(invalid[0].field, 'objectStatus.isRemote')
})

test('hasDifficulty 非布尔值应被检测', () => {
  const invalid = checkInvalidParams(
    { category: 'civil', hasDifficulty: 1 },
    'v2.0'
  )
  assert.strictEqual(invalid.length, 1)
  assert.strictEqual(invalid[0].field, 'objectStatus.hasDifficulty')
})

test('多个无效参数应全部被检测', () => {
  const invalid = checkInvalidParams(
    { category: 'unknown', isRemote: 'yes', hasDifficulty: 'no' },
    'v2.0'
  )
  assert.strictEqual(invalid.length, 3)
})

console.log('\n4. 主流程 (processSubsidyRules) - 正常场景')
test('正常民事案件 v2.0 应通过', () => {
  const params = makeBaseParams()
  const result = processSubsidyRules(params)
  assert.strictEqual(result.conclusion, CONCLUSION_TYPES.PASS)
  assert.strictEqual(result.nextAction, NEXT_ACTIONS.ACCEPT)
  assert.ok(result.riskTags.includes(RISK_TAGS.RULE_HIT))
  assert.strictEqual(result.calculation.finalAmount, 2500)
  assert.strictEqual(result.calculation.baseAmount, 2500)
  assert.ok(result.ruleHits.length > 0)
})

test('正常刑事案件 v2.0 应通过', () => {
  const params = makeBaseParams({
    objectStatus: { category: 'criminal', isRemote: false, hasDifficulty: false }
  })
  const result = processSubsidyRules(params)
  assert.strictEqual(result.conclusion, CONCLUSION_TYPES.PASS)
  assert.strictEqual(result.calculation.baseAmount, 2000)
})

test('行政案件 v2.0 应通过', () => {
  const params = makeBaseParams({
    objectStatus: { category: 'administrative', isRemote: false, hasDifficulty: false }
  })
  const result = processSubsidyRules(params)
  assert.strictEqual(result.conclusion, CONCLUSION_TYPES.PASS)
  assert.strictEqual(result.calculation.baseAmount, 2200)
})

test('偏远地区 v2.0 应有远程补贴', () => {
  const params = makeBaseParams({
    objectStatus: { category: 'civil', isRemote: true, hasDifficulty: false }
  })
  const result = processSubsidyRules(params)
  assert.strictEqual(result.conclusion, CONCLUSION_TYPES.PASS)
  assert.strictEqual(result.calculation.finalAmount, 2800)
  assert.ok(result.calculation.adjustments.some(a => a.type === 'remote_allowance'))
})

test('疑难案件应有加成', () => {
  const params = makeBaseParams({
    objectStatus: { category: 'civil', isRemote: false, hasDifficulty: true }
  })
  const result = processSubsidyRules(params)
  assert.strictEqual(result.conclusion, CONCLUSION_TYPES.PASS)
  assert.strictEqual(result.calculation.finalAmount, 3000)
})

test('超期办理应扣减', () => {
  const params = makeBaseParams({
    timeWindow: { startDate: '2026-01-01', endDate: '2026-03-01', days: 60 }
  })
  const result = processSubsidyRules(params)
  assert.strictEqual(result.conclusion, CONCLUSION_TYPES.PASS)
  assert.ok(result.calculation.adjustments.some(a => a.type === 'overtime_penalty'))
})

console.log('\n5. 主流程 (processSubsidyRules) - 异常场景')

test('未知 category 不能通过 - 本次修复核心验证', () => {
  const params = makeBaseParams({
    objectStatus: { category: 'unknown', isRemote: false, hasDifficulty: false }
  })
  const result = processSubsidyRules(params)

  assert.notStrictEqual(
    result.conclusion,
    CONCLUSION_TYPES.PASS,
    '未知类别不应返回通过！'
  )
  assert.notStrictEqual(
    result.nextAction,
    NEXT_ACTIONS.ACCEPT,
    '未知类别不应返回接受动作！'
  )
  assert.strictEqual(result.conclusion, CONCLUSION_TYPES.FAIL)
  assert.strictEqual(result.nextAction, NEXT_ACTIONS.REJECT)
  assert.ok(result.riskTags.includes(RISK_TAGS.INVALID_PARAM), '应包含 invalid_param 风险标签')
  assert.strictEqual(result.invalidParams.length, 1)
  assert.strictEqual(result.error.code, ERROR_CODES.PARAM_INVALID)
  assert.strictEqual(result.calculation, null, '计算结果应为 null')
})

test('空字符串 category 应判为缺失而非无效', () => {
  const params = makeBaseParams({
    objectStatus: { category: '', isRemote: false, hasDifficulty: false }
  })
  const result = processSubsidyRules(params)
  assert.strictEqual(result.conclusion, CONCLUSION_TYPES.PENDING)
  assert.ok(result.riskTags.includes(RISK_TAGS.MISSING_FIELDS))
  assert.strictEqual(result.missingFields.length, 1)
})

test('缺字段时应返回 pending + supplement_info', () => {
  const params = makeBaseParams({
    objectStatus: {},
    timeWindow: {}
  })
  const result = processSubsidyRules(params)
  assert.strictEqual(result.conclusion, CONCLUSION_TYPES.PENDING)
  assert.strictEqual(result.nextAction, NEXT_ACTIONS.SUPPLEMENT_INFO)
  assert.ok(result.riskTags.includes(RISK_TAGS.MISSING_FIELDS))
  assert.ok(result.missingFields.length > 0)
})

test('无效规则版本应返回 fail', () => {
  const params = makeBaseParams({ ruleVersion: 'v99.0' })
  const result = processSubsidyRules(params)
  assert.strictEqual(result.conclusion, CONCLUSION_TYPES.FAIL)
  assert.strictEqual(result.nextAction, NEXT_ACTIONS.REJECT)
  assert.ok(result.riskTags.includes(RISK_TAGS.CALCULATION_ERROR))
})

test('重复提交应返回 fail + reprocess', () => {
  const params = makeBaseParams()
  const first = processSubsidyRules(params)
  markProcessed(params.businessNo, {
    auditNo: 'AUD-TEST-001',
    conclusion: first.conclusion,
    nextAction: first.nextAction,
    riskTags: first.riskTags
  })

  const second = processSubsidyRules(params)
  assert.strictEqual(second.conclusion, CONCLUSION_TYPES.FAIL)
  assert.strictEqual(second.nextAction, NEXT_ACTIONS.REPROCESS)
  assert.ok(second.riskTags.includes(RISK_TAGS.DUPLICATE_PROCESSING))
  assert.strictEqual(second.isDuplicate, true)
  assert.ok(second.previousRecord, '应返回上一条记录')
})

test('规则冲突(info级)应返回 review + resolve_conflict', () => {
  const params = makeBaseParams({
    objectStatus: { category: 'criminal', isRemote: false, hasDifficulty: true },
    ruleVersion: 'v2.0'
  })
  const result = processSubsidyRules(params)
  assert.strictEqual(result.conclusion, CONCLUSION_TYPES.REVIEW)
  assert.strictEqual(result.nextAction, NEXT_ACTIONS.RESOLVE_CONFLICT)
  assert.ok(result.riskTags.includes(RISK_TAGS.RULE_CONFLICT))
  assert.ok(result.conflicts.length > 0)
  assert.ok(result.conflicts.every(c => c.level === 'info'))
})

test('规则冲突(warning级)应升级为人工复核', () => {
  const params = makeBaseParams({
    objectStatus: { category: 'civil', isRemote: true, hasDifficulty: false },
    ruleVersion: 'v1.0'
  })
  const result = processSubsidyRules(params)
  assert.strictEqual(result.conclusion, CONCLUSION_TYPES.REVIEW)
  assert.strictEqual(result.nextAction, NEXT_ACTIONS.MANUAL_REVIEW)
  assert.ok(result.riskTags.includes(RISK_TAGS.RULE_CONFLICT))
  assert.ok(result.riskTags.includes(RISK_TAGS.MANUAL_REVIEW))
})

console.log('\n6. 补贴计算 (calculateSubsidy)')
test('合法类别计算应正常返回金额', () => {
  const calc = calculateSubsidy(
    { category: 'civil', isRemote: false, hasDifficulty: false },
    'v2.0',
    { days: 10 }
  )
  assert.strictEqual(typeof calc.finalAmount, 'number')
  assert.ok(calc.finalAmount > 0)
})

test('未知类别计算应抛出错误', () => {
  assert.throws(() => {
    calculateSubsidy(
      { category: 'unknown', isRemote: false, hasDifficulty: false },
      'v2.0',
      { days: 10 }
    )
  }, Error)
})

test('v1.0 没有远程补贴', () => {
  const calc = calculateSubsidy(
    { category: 'civil', isRemote: true, hasDifficulty: false },
    'v1.0',
    { days: 10 }
  )
  assert.strictEqual(calc.finalAmount, 2000)
})

test('v2.0 有远程补贴', () => {
  const calc = calculateSubsidy(
    { category: 'civil', isRemote: true, hasDifficulty: false },
    'v2.0',
    { days: 10 }
  )
  assert.strictEqual(calc.finalAmount, 2800)
})

console.log('\n7. 审计留痕 (auditService)')
test('创建审计记录应返回 auditNo', () => {
  const record = createAuditRecord({
    businessNo: 'AUD-TEST-001',
    operator: 'tester',
    auditType: 'rule_check',
    inputData: { foo: 'bar' },
    outputData: { result: 'ok' },
    ruleHits: [],
    riskTags: ['normal'],
    status: 'pass',
    remark: '测试'
  })
  assert.ok(record.auditNo)
  assert.ok(record.auditNo.startsWith('AUD-'))
  assert.strictEqual(record.businessNo, 'AUD-TEST-001')
  assert.strictEqual(record.operator, 'tester')
})

test('按审计编号查询', () => {
  const record = createAuditRecord({
    businessNo: 'AUD-TEST-002',
    operator: 'tester',
    auditType: 'rule_check',
    inputData: {},
    outputData: {},
    ruleHits: [],
    riskTags: [],
    status: 'pass'
  })
  const found = getAuditByNo(record.auditNo)
  assert.ok(found)
  assert.strictEqual(found.auditNo, record.auditNo)
})

test('数据回放应包含步骤', () => {
  const record = createAuditRecord({
    businessNo: 'AUD-TEST-003',
    operator: 'tester',
    auditType: 'rule_check',
    inputData: { category: 'civil' },
    outputData: { finalAmount: 2500 },
    ruleHits: [{ ruleId: 'R-001', ruleName: '基础规则' }],
    riskTags: ['rule_hit'],
    status: 'pass'
  })
  const replay = replayAudit(record.auditNo)
  assert.ok(replay)
  assert.ok(replay.replaySteps.length >= 4)
  assert.strictEqual(replay.replaySteps[0].name, '输入数据接收')
  assert.strictEqual(replay.replaySteps[replay.replaySteps.length - 1].name, '处理结果输出')
})

test('业务历史记录查询', () => {
  const businessNo = 'AUD-TEST-HIST'
  createAuditRecord({
    businessNo,
    operator: 'tester1',
    auditType: 'rule_check',
    inputData: {},
    outputData: {},
    ruleHits: [],
    riskTags: [],
    status: 'pass'
  })
  createAuditRecord({
    businessNo,
    operator: 'tester2',
    auditType: 'manual_review',
    inputData: {},
    outputData: {},
    ruleHits: [],
    riskTags: [],
    status: 'review_passed'
  })
  const history = getAuditHistoryByBusiness(businessNo)
  assert.strictEqual(history.length, 2)
})

console.log('\n8. 异常解释 (exceptionService)')
test('生成异常报告应包含所有必要字段', () => {
  const params = makeBaseParams({
    objectStatus: { category: 'unknown' }
  })
  const ruleResult = processSubsidyRules(params)
  const report = generateExceptionReport(ruleResult)

  assert.ok(report.summary)
  assert.ok(report.riskExplanations)
  assert.ok(report.nextActionDetail)
  assert.ok(report.conclusionDetail)
  assert.ok(Array.isArray(report.invalidParamDetails))
  assert.ok(Array.isArray(report.missingFieldDetails))
  assert.ok(Array.isArray(report.conflictDetails))
  assert.ok(report.duplicateInfo)
  assert.ok(report.errorDetail || report.calculationDetail)
})

test('风险标签解释应包含标题和描述', () => {
  const explanations = explainRiskTags([RISK_TAGS.INVALID_PARAM])
  assert.strictEqual(explanations.length, 1)
  assert.strictEqual(explanations[0].tag, RISK_TAGS.INVALID_PARAM)
  assert.ok(explanations[0].title)
  assert.ok(explanations[0].description)
  assert.ok(explanations[0].impact)
  assert.ok(explanations[0].suggestion)
})

test('正常场景也应生成异常报告', () => {
  const params = makeBaseParams()
  const ruleResult = processSubsidyRules(params)
  const report = generateExceptionReport(ruleResult)
  assert.strictEqual(report.summary.canAutoProcess, true)
  assert.strictEqual(report.summary.totalRisks, 0)
})

test('任务状态应包含时间线', () => {
  const auditRecord = createAuditRecord({
    businessNo: 'TASK-TEST-001',
    operator: 'tester',
    auditType: 'rule_check',
    inputData: {},
    outputData: {
      conclusion: 'pass',
      nextAction: 'accept',
      calculation: { finalAmount: 2500 }
    },
    ruleHits: [{ ruleId: 'R-001', ruleName: '测试规则' }],
    riskTags: ['rule_hit'],
    status: 'pass'
  })
  const status = getTaskStatus('TASK-TEST-001', auditRecord)
  assert.ok(status.processingTimeline)
  assert.ok(status.processingTimeline.length > 0)
  assert.ok(status.currentHandler)
  assert.ok(status.nextAction)
  assert.ok(status.nextActionDetail)
})

console.log('\n9. 规则版本兼容性')
RULE_VERSIONS.forEach(version => {
  test(`${version} 版本应能正常计算民事案件`, () => {
    const params = makeBaseParams({ ruleVersion: version })
    const result = processSubsidyRules(params)
    assert.strictEqual(result.conclusion, CONCLUSION_TYPES.PASS)
    assert.ok(result.calculation.finalAmount > 0)
  })
})

console.log('\n========== 测试结果 ==========')
console.log(`通过: ${passed}`)
console.log(`失败: ${failed}`)
console.log(`总计: ${passed + failed}`)

if (failures.length > 0) {
  console.log('\n失败详情:')
  failures.forEach(f => {
    console.log(`  - ${f.name}: ${f.error.message}`)
  })
  process.exit(1)
} else {
  console.log('\n🎉 所有测试通过！')
  process.exit(0)
}
