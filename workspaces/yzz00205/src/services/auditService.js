const { v4: uuidv4 } = require('uuid')
const { AUDIT_TYPES, ERROR_CODES } = require('../constants')

const auditRecords = new Map()
const businessAuditIndex = new Map()

function generateAuditNo() {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = uuidv4().slice(0, 8).toUpperCase()
  return `AUD-${dateStr}-${random}`
}

function createAuditRecord(params) {
  const {
    businessNo,
    operator,
    auditType,
    inputData,
    outputData,
    ruleHits = [],
    riskTags = [],
    status,
    remark = ''
  } = params

  const auditNo = generateAuditNo()
  const record = {
    auditNo,
    businessNo,
    operator,
    auditType,
    inputData: JSON.parse(JSON.stringify(inputData)),
    outputData: JSON.parse(JSON.stringify(outputData)),
    ruleHits,
    riskTags,
    status,
    remark,
    createdAt: new Date().toISOString(),
    timestamp: Date.now()
  }

  auditRecords.set(auditNo, record)

  if (!businessAuditIndex.has(businessNo)) {
    businessAuditIndex.set(businessNo, [])
  }
  businessAuditIndex.get(businessNo).push(auditNo)

  return record
}

function getAuditByNo(auditNo) {
  return auditRecords.get(auditNo) || null
}

function getAuditHistoryByBusiness(businessNo) {
  const auditNos = businessAuditIndex.get(businessNo) || []
  return auditNos
    .map(no => auditRecords.get(no))
    .filter(Boolean)
    .sort((a, b) => b.timestamp - a.timestamp)
}

function replayAudit(auditNo) {
  const record = getAuditByNo(auditNo)
  if (!record) {
    return null
  }

  return {
    auditNo: record.auditNo,
    businessNo: record.businessNo,
    operator: record.operator,
    auditType: record.auditType,
    replaySteps: [
      {
        step: 1,
        name: '输入数据接收',
        detail: record.inputData,
        timestamp: record.createdAt
      },
      {
        step: 2,
        name: '规则命中明细',
        detail: record.ruleHits,
        count: record.ruleHits.length
      },
      {
        step: 3,
        name: '风险标签生成',
        detail: record.riskTags,
        count: record.riskTags.length
      },
      {
        step: 4,
        name: '处理结果输出',
        detail: record.outputData,
        status: record.status
      }
    ],
    status: record.status,
    remark: record.remark,
    createdAt: record.createdAt
  }
}

function getAuditList(params = {}) {
  const { businessNo, operator, auditType, status, pageSize = 20, pageNum = 1 } = params

  let records = Array.from(auditRecords.values())

  if (businessNo) {
    records = records.filter(r => r.businessNo === businessNo)
  }
  if (operator) {
    records = records.filter(r => r.operator === operator)
  }
  if (auditType) {
    records = records.filter(r => r.auditType === auditType)
  }
  if (status) {
    records = records.filter(r => r.status === status)
  }

  records.sort((a, b) => b.timestamp - a.timestamp)

  const total = records.length
  const start = (pageNum - 1) * pageSize
  const list = records.slice(start, start + pageSize)

  return {
    total,
    pageNum,
    pageSize,
    list
  }
}

module.exports = {
  createAuditRecord,
  getAuditByNo,
  getAuditHistoryByBusiness,
  replayAudit,
  getAuditList,
  generateAuditNo
}
