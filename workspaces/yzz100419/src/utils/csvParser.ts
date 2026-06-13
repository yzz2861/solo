import Papa from 'papaparse'
import type {
  Customer,
  Consumption,
  Appointment,
  FollowUpNote,
  Complaint,
  ProjectTypeRule,
} from '@/types'
import {
  mergeCustomers,
  classifyConsumptions,
} from '@/utils/analysis'

export interface FieldSchema {
  target: string
  label: string
  required: boolean
  synonyms: string[]
  description: string
}

export interface TableSchema {
  key: 'consumption' | 'appointment' | 'followUp' | 'complaint'
  name: string
  fields: FieldSchema[]
}

export const CONSUMPTION_SCHEMA: TableSchema = {
  key: 'consumption',
  name: '会员消费表',
  fields: [
    { target: 'memberId', label: '会员号', required: true, synonyms: ['会员号', '会员编号', '卡号', '客户编号', 'vip号', 'vip'], description: '客户唯一标识' },
    { target: 'name', label: '姓名', required: true, synonyms: ['姓名', '客户姓名', '会员姓名', '名称'], description: '客户姓名' },
    { target: 'phone', label: '手机号', required: true, synonyms: ['手机号', '电话', '手机号码', '联系电话', '手机'], description: '联系手机号' },
    { target: 'projectName', label: '项目名称', required: true, synonyms: ['项目名称', '项目', '服务项目', '消费项目', '产品名称'], description: '消费的服务/产品' },
    { target: 'amount', label: '消费金额', required: true, synonyms: ['消费金额', '金额', '实收金额', '成交价', '应收金额', '价格'], description: '实际消费金额（元）' },
    { target: 'consumeDate', label: '消费日期', required: true, synonyms: ['消费日期', '日期', '消费时间', '到店日期', '到店时间', '下单时间'], description: 'YYYY-MM-DD格式' },
    { target: 'consultant', label: '服务顾问', required: false, synonyms: ['服务顾问', '顾问', '美容师', '技师', '服务人员', '责任人'], description: '服务该客户的顾问姓名' },
  ],
}

export const APPOINTMENT_SCHEMA: TableSchema = {
  key: 'appointment',
  name: '预约表',
  fields: [
    { target: 'memberId', label: '会员号', required: true, synonyms: ['会员号', '会员编号', '卡号', '客户编号', 'vip号', 'vip'], description: '客户唯一标识' },
    { target: 'name', label: '姓名', required: true, synonyms: ['姓名', '客户姓名', '会员姓名'], description: '客户姓名' },
    { target: 'phone', label: '手机号', required: true, synonyms: ['手机号', '电话', '手机号码', '联系电话'], description: '联系手机号' },
    { target: 'appointmentDate', label: '预约日期', required: true, synonyms: ['预约日期', '预约时间', '到店时间', '到店日期'], description: 'YYYY-MM-DD格式' },
    { target: 'status', label: '预约状态', required: true, synonyms: ['状态', '预约状态', '到店状态', '执行状态'], description: '已完成/爽约/已取消' },
    { target: 'projectName', label: '预约项目', required: false, synonyms: ['预约项目', '项目', '服务项目'], description: '预约的服务项目' },
    { target: 'consultant', label: '预约顾问', required: false, synonyms: ['预约顾问', '顾问', '服务顾问', '美容师', '技师'], description: '预约分配的顾问' },
  ],
}

export const FOLLOWUP_SCHEMA: TableSchema = {
  key: 'followUp',
  name: '顾问跟进备注',
  fields: [
    { target: 'memberId', label: '会员号', required: true, synonyms: ['会员号', '会员编号', '卡号', '客户编号'], description: '客户唯一标识' },
    { target: 'name', label: '姓名', required: false, synonyms: ['姓名', '客户姓名', '会员姓名'], description: '客户姓名' },
    { target: 'phone', label: '手机号', required: true, synonyms: ['手机号', '电话', '手机号码'], description: '联系手机号' },
    { target: 'consultant', label: '跟进顾问', required: true, synonyms: ['跟进顾问', '顾问', '跟进人', '责任人'], description: '跟进的顾问姓名' },
    { target: 'followUpDate', label: '跟进日期', required: true, synonyms: ['跟进日期', '跟进时间', '联系日期', '联系时间'], description: 'YYYY-MM-DD格式' },
    { target: 'method', label: '跟进方式', required: false, synonyms: ['跟进方式', '联系方式', '沟通方式'], description: '电话/微信/到店/其他' },
    { target: 'content', label: '跟进内容', required: true, synonyms: ['跟进内容', '备注', '跟进备注', '沟通内容', '客户反馈'], description: '具体跟进记录内容' },
    { target: 'isSensitive', label: '是否敏感', required: false, synonyms: ['是否敏感', '敏感', '敏感信息', '保密'], description: '是否含客户敏感信息（是/否）' },
  ],
}

export const COMPLAINT_SCHEMA: TableSchema = {
  key: 'complaint',
  name: '投诉记录',
  fields: [
    { target: 'memberId', label: '会员号', required: true, synonyms: ['会员号', '会员编号', '卡号', '客户编号'], description: '客户唯一标识' },
    { target: 'name', label: '姓名', required: false, synonyms: ['姓名', '客户姓名', '会员姓名'], description: '客户姓名' },
    { target: 'phone', label: '手机号', required: true, synonyms: ['手机号', '电话', '手机号码'], description: '联系手机号' },
    { target: 'complaintDate', label: '投诉日期', required: true, synonyms: ['投诉日期', '投诉时间', '登记日期'], description: 'YYYY-MM-DD格式' },
    { target: 'content', label: '投诉内容', required: true, synonyms: ['投诉内容', '投诉原因', '问题描述', '投诉详情'], description: '客户投诉的具体内容' },
    { target: 'status', label: '处理状态', required: true, synonyms: ['状态', '处理状态', '进度', '处理进度'], description: '待处理/处理中/已解决' },
    { target: 'triggerContactPause', label: '暂停联系', required: false, synonyms: ['暂停联系', '暂缓联系', '是否暂缓', '暂停促销'], description: '是否暂停促销联系（是/否）' },
    { target: 'pauseUntil', label: '暂停至', required: false, synonyms: ['暂停至', '恢复日期', '暂缓截止'], description: 'YYYY-MM-DD格式，可留空' },
  ],
}

export const ALL_SCHEMAS: TableSchema[] = [
  CONSUMPTION_SCHEMA,
  APPOINTMENT_SCHEMA,
  FOLLOWUP_SCHEMA,
  COMPLAINT_SCHEMA,
]

export function autoMapFields(
  csvHeaders: string[],
  schema: TableSchema
): Record<string, string> {
  const mapping: Record<string, string> = {}

  for (const header of csvHeaders) {
    const normalizedHeader = header.replace(/\s|_|-/g, '').toLowerCase()

    for (const field of schema.fields) {
      for (const synonym of field.synonyms) {
        const normalizedSynonym = synonym.replace(/\s|_|-/g, '').toLowerCase()
        if (normalizedHeader === normalizedSynonym ||
            normalizedHeader.includes(normalizedSynonym) ||
            normalizedSynonym.includes(normalizedHeader)) {
          mapping[header] = field.target
          break
        }
      }
      if (mapping[header]) break
    }
  }

  return mapping
}

function parseDate(raw: unknown): string {
  if (!raw) return ''
  const str = String(raw).trim()

  const formats = [
    /^(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})日?$/,
    /^(\d{1,2})[-/月.](\d{1,2})[-/日.]?(\d{4})年?$/,
  ]

  for (const fmt of formats) {
    const m = str.match(fmt)
    if (m) {
      let y: string, mo: string, d: string
      if (fmt === formats[0]) {
        [, y, mo, d] = m
      } else {
        [, mo, d, y] = m
      }
      const yy = parseInt(y)
      const month = parseInt(mo).toString().padStart(2, '0')
      const day = parseInt(d).toString().padStart(2, '0')
      const year = yy < 100 ? 2000 + yy : yy
      return `${year}-${month}-${day}`
    }
  }

  const t = Date.parse(str)
  if (!isNaN(t)) {
    const dt = new Date(t)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  }

  return str
}

function parseNumber(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0
  const n = Number(String(raw).replace(/[^\d.-]/g, ''))
  return isNaN(n) ? 0 : n
}

function parsePhone(raw: unknown): string {
  if (!raw) return ''
  return String(raw).replace(/\D/g, '').slice(0, 11)
}

function parseStatus(raw: unknown, kind: 'appointment' | 'complaint'): string {
  const str = String(raw ?? '').trim()
  if (kind === 'appointment') {
    if (/爽约|未到|失约|no.?show|absent/i.test(str)) return 'no_show'
    if (/取消|取消预约|cancel/i.test(str)) return 'cancelled'
    return 'completed'
  } else {
    if (/处理中|进行中|processing/i.test(str)) return 'processing'
    if (/已解决|解决|完成|resolved|done/i.test(str)) return 'resolved'
    return 'pending'
  }
}

function parseMethod(raw: unknown): 'phone' | 'wechat' | 'in_person' | 'other' {
  const str = String(raw ?? '').trim()
  if (/电话|拨打|phone|call|tel/i.test(str)) return 'phone'
  if (/微信|wechat|wx|消息|短信/i.test(str)) return 'wechat'
  if (/到店|面谈|见面|到店回访|in.?person/i.test(str)) return 'in_person'
  return 'other'
}

function parseBool(raw: unknown): boolean {
  const str = String(raw ?? '').trim()
  return /是|对|true|yes|y|1/i.test(str)
}

function getVal(row: Record<string, unknown>, mapping: Record<string, string>, target: string): unknown {
  for (const [source, tgt] of Object.entries(mapping)) {
    if (tgt === target) return row[source]
  }
  return undefined
}

interface RawConsumptionRow {
  memberId: string
  name: string
  phone: string
  projectName: string
  amount: number
  consumeDate: string
  consultant: string
}

interface RawAppointmentRow {
  memberId: string
  name: string
  phone: string
  appointmentDate: string
  status: 'completed' | 'no_show' | 'cancelled'
  projectName: string
  consultant: string
}

interface RawFollowUpRow {
  memberId: string
  name: string
  phone: string
  consultant: string
  followUpDate: string
  method: 'phone' | 'wechat' | 'in_person' | 'other'
  content: string
  isSensitive: boolean
}

interface RawComplaintRow {
  memberId: string
  name: string
  phone: string
  complaintDate: string
  content: string
  status: 'pending' | 'processing' | 'resolved'
  triggerContactPause: boolean
  pauseUntil: string
}

export interface ParseResult<T> {
  rows: T[]
  errors: string[]
  headers: string[]
  mapping: Record<string, string>
}

export function parseConsumptionCSV(csvData: Papa.ParseResult<Record<string, unknown>>, mapping: Record<string, string>): ParseResult<RawConsumptionRow> {
  const rows: RawConsumptionRow[] = []
  const errors: string[] = []
  const headers = csvData.meta.fields || []

  csvData.data.forEach((row, idx) => {
    const memberId = String(getVal(row, mapping, 'memberId') ?? '').trim()
    const name = String(getVal(row, mapping, 'name') ?? '').trim()
    const phone = parsePhone(getVal(row, mapping, 'phone'))
    const projectName = String(getVal(row, mapping, 'projectName') ?? '').trim()
    const amount = parseNumber(getVal(row, mapping, 'amount'))
    const consumeDate = parseDate(getVal(row, mapping, 'consumeDate'))
    const consultant = String(getVal(row, mapping, 'consultant') ?? '').trim()

    if (!memberId && !phone) {
      errors.push(`第 ${idx + 2} 行：缺少会员号或手机号`)
      return
    }
    if (!projectName) {
      errors.push(`第 ${idx + 2} 行：缺少项目名称`)
      return
    }
    if (!consumeDate) {
      errors.push(`第 ${idx + 2} 行：消费日期格式错误`)
      return
    }

    rows.push({ memberId, name, phone, projectName, amount, consumeDate, consultant })
  })

  return { rows, errors, headers, mapping }
}

export function parseAppointmentCSV(csvData: Papa.ParseResult<Record<string, unknown>>, mapping: Record<string, string>): ParseResult<RawAppointmentRow> {
  const rows: RawAppointmentRow[] = []
  const errors: string[] = []
  const headers = csvData.meta.fields || []

  csvData.data.forEach((row, idx) => {
    const memberId = String(getVal(row, mapping, 'memberId') ?? '').trim()
    const name = String(getVal(row, mapping, 'name') ?? '').trim()
    const phone = parsePhone(getVal(row, mapping, 'phone'))
    const appointmentDate = parseDate(getVal(row, mapping, 'appointmentDate'))
    const status = parseStatus(getVal(row, mapping, 'status'), 'appointment') as 'completed' | 'no_show' | 'cancelled'
    const projectName = String(getVal(row, mapping, 'projectName') ?? '').trim()
    const consultant = String(getVal(row, mapping, 'consultant') ?? '').trim()

    if (!memberId && !phone) {
      errors.push(`第 ${idx + 2} 行：缺少会员号或手机号`)
      return
    }
    if (!appointmentDate) {
      errors.push(`第 ${idx + 2} 行：预约日期格式错误`)
      return
    }

    rows.push({ memberId, name, phone, appointmentDate, status, projectName, consultant })
  })

  return { rows, errors, headers, mapping }
}

export function parseFollowUpCSV(csvData: Papa.ParseResult<Record<string, unknown>>, mapping: Record<string, string>): ParseResult<RawFollowUpRow> {
  const rows: RawFollowUpRow[] = []
  const errors: string[] = []
  const headers = csvData.meta.fields || []

  csvData.data.forEach((row, idx) => {
    const memberId = String(getVal(row, mapping, 'memberId') ?? '').trim()
    const name = String(getVal(row, mapping, 'name') ?? '').trim()
    const phone = parsePhone(getVal(row, mapping, 'phone'))
    const consultant = String(getVal(row, mapping, 'consultant') ?? '').trim()
    const followUpDate = parseDate(getVal(row, mapping, 'followUpDate'))
    const method = parseMethod(getVal(row, mapping, 'method'))
    const content = String(getVal(row, mapping, 'content') ?? '').trim()
    const isSensitive = parseBool(getVal(row, mapping, 'isSensitive'))

    if (!memberId && !phone) {
      errors.push(`第 ${idx + 2} 行：缺少会员号或手机号`)
      return
    }
    if (!consultant) {
      errors.push(`第 ${idx + 2} 行：缺少跟进顾问`)
      return
    }
    if (!followUpDate) {
      errors.push(`第 ${idx + 2} 行：跟进日期格式错误`)
      return
    }
    if (!content) {
      errors.push(`第 ${idx + 2} 行：缺少跟进内容`)
      return
    }

    rows.push({ memberId, name, phone, consultant, followUpDate, method, content, isSensitive })
  })

  return { rows, errors, headers, mapping }
}

export function parseComplaintCSV(csvData: Papa.ParseResult<Record<string, unknown>>, mapping: Record<string, string>): ParseResult<RawComplaintRow> {
  const rows: RawComplaintRow[] = []
  const errors: string[] = []
  const headers = csvData.meta.fields || []

  csvData.data.forEach((row, idx) => {
    const memberId = String(getVal(row, mapping, 'memberId') ?? '').trim()
    const name = String(getVal(row, mapping, 'name') ?? '').trim()
    const phone = parsePhone(getVal(row, mapping, 'phone'))
    const complaintDate = parseDate(getVal(row, mapping, 'complaintDate'))
    const content = String(getVal(row, mapping, 'content') ?? '').trim()
    const status = parseStatus(getVal(row, mapping, 'status'), 'complaint') as 'pending' | 'processing' | 'resolved'
    const triggerContactPause = parseBool(getVal(row, mapping, 'triggerContactPause'))
    const pauseUntil = parseDate(getVal(row, mapping, 'pauseUntil'))

    if (!memberId && !phone) {
      errors.push(`第 ${idx + 2} 行：缺少会员号或手机号`)
      return
    }
    if (!complaintDate) {
      errors.push(`第 ${idx + 2} 行：投诉日期格式错误`)
      return
    }
    if (!content) {
      errors.push(`第 ${idx + 2} 行：缺少投诉内容`)
      return
    }

    rows.push({ memberId, name, phone, complaintDate, content, status, triggerContactPause: triggerContactPause || status !== 'resolved', pauseUntil })
  })

  return { rows, errors, headers, mapping }
}

export interface MergedImportData {
  customers: Customer[]
  consumptions: Consumption[]
  appointments: Appointment[]
  followUpNotes: FollowUpNote[]
  complaints: Complaint[]
  mergeSuggestions: Array<{ ids: string[]; reason: string }>
  stats: {
    rawCustomerCount: number
    mergedCustomerCount: number
    consumptionCount: number
    appointmentCount: number
    followUpCount: number
    complaintCount: number
  }
}

function buildLookupKey(memberId: string, phone: string, name: string): string {
  if (memberId) return `mid:${memberId}`
  if (phone) return `phone:${phone}`
  return `name:${name}`
}

export function mergeImportedData(
  consumptionRows: RawConsumptionRow[],
  appointmentRows: RawAppointmentRow[],
  followUpRows: RawFollowUpRow[],
  complaintRows: RawComplaintRow[],
  projectTypeRules: ProjectTypeRule[]
): MergedImportData {
  const identityMap = new Map<string, { name: string; phone: string; memberId: string }>()
  const allRawRecords: Array<{ name: string; phone: string; memberId?: string }> = []

  const addToIdentity = (memberId: string, phone: string, name: string) => {
    const key = buildLookupKey(memberId, phone, name)
    if (!identityMap.has(key)) {
      identityMap.set(key, { name, phone, memberId })
      allRawRecords.push({ name, phone, memberId: memberId || undefined })
    } else {
      const existing = identityMap.get(key)!
      if (name && !existing.name) existing.name = name
      if (phone && !existing.phone) existing.phone = phone
      if (memberId && !existing.memberId) existing.memberId = memberId
    }
  }

  for (const r of consumptionRows) addToIdentity(r.memberId, r.phone, r.name)
  for (const r of appointmentRows) addToIdentity(r.memberId, r.phone, r.name)
  for (const r of followUpRows) addToIdentity(r.memberId, r.phone, r.name)
  for (const r of complaintRows) addToIdentity(r.memberId, r.phone, r.name)

  const { customers, mergeSuggestions } = mergeCustomers(allRawRecords)

  const customerLookup = new Map<string, Customer>()
  for (const c of customers) {
    for (const mid of c.memberIds) customerLookup.set(`mid:${mid}`, c)
    for (const p of c.phoneHistory) customerLookup.set(`phone:${p}`, c)
    customerLookup.set(`name:${c.canonicalName}`, c)
  }

  const findCustomer = (memberId: string, phone: string, name: string): Customer | undefined => {
    if (memberId && customerLookup.has(`mid:${memberId}`)) return customerLookup.get(`mid:${memberId}`)
    if (phone && customerLookup.has(`phone:${phone}`)) return customerLookup.get(`phone:${phone}`)
    if (name && customerLookup.has(`name:${name}`)) return customerLookup.get(`name:${name}`)
    return undefined
  }

  const unclassifiedConsumptions: Consumption[] = consumptionRows.map((r, i) => {
    const cust = findCustomer(r.memberId, r.phone, r.name)
    return {
      id: `con_imp_${i}`,
      customerId: cust?.id ?? `c_unknown_${i}`,
      projectName: r.projectName,
      projectType: 'regular' as const,
      amount: r.amount,
      consumeDate: r.consumeDate,
      consultant: r.consultant,
    }
  })

  const consumptions = classifyConsumptions(unclassifiedConsumptions, projectTypeRules)

  const consultantAssignments = new Map<string, string>()
  for (const c of consumptions) {
    if (c.consultant && !consultantAssignments.has(c.customerId)) {
      consultantAssignments.set(c.customerId, c.consultant)
    }
  }

  const updatedCustomers = customers.map((c) => ({
    ...c,
    assignedConsultant: c.assignedConsultant || consultantAssignments.get(c.id) || '',
  }))

  for (const c of updatedCustomers) {
    customerLookup.set(`name:${c.canonicalName}`, c)
    if (c.canonicalPhone) customerLookup.set(`phone:${c.canonicalPhone}`, c)
    for (const mid of c.memberIds) customerLookup.set(`mid:${mid}`, c)
  }

  const appointments: Appointment[] = appointmentRows.map((r, i) => {
    const cust = findCustomer(r.memberId, r.phone, r.name)
    return {
      id: `apt_imp_${i}`,
      customerId: cust?.id ?? `c_unknown_apt_${i}`,
      appointmentDate: r.appointmentDate,
      status: r.status,
      projectName: r.projectName,
      consultant: r.consultant,
    }
  })

  const followUpNotes: FollowUpNote[] = followUpRows.map((r, i) => {
    const cust = findCustomer(r.memberId, r.phone, r.name)
    return {
      id: `fn_imp_${i}`,
      customerId: cust?.id ?? `c_unknown_fn_${i}`,
      consultant: r.consultant,
      followUpDate: r.followUpDate,
      method: r.method,
      content: r.content,
      isSensitive: r.isSensitive,
    }
  })

  const complaints: Complaint[] = complaintRows.map((r, i) => {
    const cust = findCustomer(r.memberId, r.phone, r.name)
    return {
      id: `comp_imp_${i}`,
      customerId: cust?.id ?? `c_unknown_comp_${i}`,
      complaintDate: r.complaintDate,
      content: r.content,
      status: r.status,
      triggerContactPause: r.triggerContactPause,
      pauseUntil: r.pauseUntil || undefined,
    }
  })

  return {
    customers: updatedCustomers,
    consumptions,
    appointments,
    followUpNotes,
    complaints,
    mergeSuggestions,
    stats: {
      rawCustomerCount: allRawRecords.length,
      mergedCustomerCount: updatedCustomers.length,
      consumptionCount: consumptions.length,
      appointmentCount: appointments.length,
      followUpCount: followUpNotes.length,
      complaintCount: complaints.length,
    },
  }
}

export async function parseFile(file: File): Promise<Papa.ParseResult<Record<string, unknown>>> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => resolve(results),
      error: (error) => reject(error),
    })
  })
}
