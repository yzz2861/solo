import { runQuery, runExec, getOne, uuid } from '../db/database'
import { extractInfo, generateShortMessage, type ExtractionResult } from './extractorService'
import { detectSuspicions } from './suspicionService'
import type {
  WorkOrder,
  WorkOrderStatus,
  SuspicionTag,
  EvidenceSentence,
  VersionEntry,
  Staff,
  UpdateTicketRequest,
  AssignTicketRequest,
  UrgencyLevel
} from '../../shared/types'

interface WorkOrderRow {
  id: string
  source_text: string
  community: string | null
  building: string | null
  room_number: string | null
  problem_type: string | null
  urgency: UrgencyLevel | null
  callback_sentence: string | null
  is_confirmed: number
  status: WorkOrderStatus
  assignee_id: string | null
  dispatcher_id: string | null
  short_message: string | null
  created_at: string
  updated_at: string
  assignee_name: string | null
  assignee_phone: string | null
  dispatcher_name: string | null
}

const mapRowToWorkOrder = (
  row: WorkOrderRow,
  suspicionTags: SuspicionTag[],
  evidenceSentences: EvidenceSentence[],
  versionHistory: VersionEntry[]
): WorkOrder => ({
  id: row.id,
  sourceText: row.source_text,
  community: row.community,
  building: row.building,
  roomNumber: row.room_number,
  problemType: row.problem_type,
  urgency: row.urgency,
  callbackSentence: row.callback_sentence,
  suspicionTags,
  isConfirmed: row.is_confirmed === 1,
  status: row.status,
  assigneeId: row.assignee_id,
  assigneeName: row.assignee_name ?? undefined,
  assigneePhone: row.assignee_phone ?? undefined,
  dispatcherId: row.dispatcher_id,
  dispatcherName: row.dispatcher_name ?? undefined,
  shortMessage: row.short_message,
  evidenceSentences,
  versionHistory,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const getSuspicionTags = async (workOrderId: string): Promise<SuspicionTag[]> => {
  const rows = await runQuery<{
    id: string
    work_order_id: string
    type: SuspicionTag['type']
    description: string
    source_text: string
    resolved: number
    resolver_note: string | null
  }>(
    'SELECT * FROM suspicion_tags WHERE work_order_id = ? ORDER BY type',
    [workOrderId]
  )
  return rows.map(row => ({
    id: row.id,
    type: row.type,
    description: row.description,
    sourceText: row.source_text,
    resolved: row.resolved === 1,
    resolverNote: row.resolver_note
  }))
}

const getEvidenceSentences = async (workOrderId: string): Promise<EvidenceSentence[]> => {
  const rows = await runQuery<{
    id: string
    work_order_id: string
    original: string
    corrected: string | null
    field: string
  }>(
    'SELECT * FROM evidence_sentences WHERE work_order_id = ? ORDER BY field',
    [workOrderId]
  )
  return rows.map(row => ({
    id: row.id,
    original: row.original,
    corrected: row.corrected,
    field: row.field
  }))
}

const getVersionHistory = async (workOrderId: string): Promise<VersionEntry[]> => {
  const rows = await runQuery<{
    id: string
    work_order_id: string
    timestamp: string
    editor_id: string
    editor_name: string
    changes_json: string
    note: string | null
  }>(
    'SELECT * FROM version_entries WHERE work_order_id = ? ORDER BY timestamp DESC',
    [workOrderId]
  )
  return rows.map(row => ({
    id: row.id,
    timestamp: row.timestamp,
    editorId: row.editor_id,
    editorName: row.editor_name,
    changes: JSON.parse(row.changes_json),
    note: row.note
  }))
}

const buildWorkOrder = async (row: WorkOrderRow): Promise<WorkOrder> => {
  const [tags, evidence, history] = await Promise.all([
    getSuspicionTags(row.id),
    getEvidenceSentences(row.id),
    getVersionHistory(row.id)
  ])
  return mapRowToWorkOrder(row, tags, evidence, history)
}

export const createTicket = async (sourceText: string): Promise<WorkOrder> => {
  const extraction = extractInfo(sourceText)
  const suspicions = detectSuspicions(sourceText, extraction)
  const shortMsg = generateShortMessage(extraction)

  const ticketId = uuid.v4()
  const isConfirmed = suspicions.length === 0

  await runExec(
    `INSERT INTO work_orders 
     (id, source_text, community, building, room_number, problem_type, urgency, 
      callback_sentence, is_confirmed, status, short_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ticketId, sourceText, extraction.community, extraction.building,
      extraction.roomNumber, extraction.problemType, extraction.urgency,
      extraction.callbackSentence, isConfirmed ? 1 : 0, 'pending', shortMsg
    ]
  )

  for (const tag of suspicions) {
    await runExec(
      `INSERT INTO suspicion_tags (id, work_order_id, type, description, source_text)
       VALUES (?, ?, ?, ?, ?)`,
      [tag.id, ticketId, tag.type, tag.description, tag.sourceText]
    )
  }

  for (const evidence of extraction.evidenceSentences) {
    await runExec(
      `INSERT INTO evidence_sentences (id, work_order_id, original, corrected, field)
       VALUES (?, ?, ?, ?, ?)`,
      [evidence.id, ticketId, evidence.original, evidence.corrected, evidence.field]
    )
  }

  return getTicketById(ticketId)
}

export const getTicketById = async (id: string): Promise<WorkOrder> => {
  const row = await getOne<WorkOrderRow>(
    `SELECT wo.*, 
            a.name as assignee_name, a.phone as assignee_phone,
            d.name as dispatcher_name
     FROM work_orders wo
     LEFT JOIN staff a ON wo.assignee_id = a.id
     LEFT JOIN staff d ON wo.dispatcher_id = d.id
     WHERE wo.id = ?`,
    [id]
  )

  if (!row) {
    throw new Error('工单不存在')
  }

  return buildWorkOrder(row)
}

export interface TicketFilters {
  status?: WorkOrderStatus
  assigneeId?: string
}

export const getTicketList = async (filters: TicketFilters = {}): Promise<WorkOrder[]> => {
  let sql = `SELECT wo.*, 
             a.name as assignee_name, a.phone as assignee_phone,
             d.name as dispatcher_name
             FROM work_orders wo
             LEFT JOIN staff a ON wo.assignee_id = a.id
             LEFT JOIN staff d ON wo.dispatcher_id = d.id`

  const params: string[] = []
  const conditions: string[] = []

  if (filters.status) {
    conditions.push('wo.status = ?')
    params.push(filters.status)
  }
  if (filters.assigneeId) {
    conditions.push('wo.assignee_id = ?')
    params.push(filters.assigneeId)
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }
  sql += ' ORDER BY wo.created_at DESC'

  const rows = await runQuery<WorkOrderRow>(sql, params)
  return Promise.all(rows.map(buildWorkOrder))
}

export const getTechTickets = async (techId: string): Promise<WorkOrder[]> => {
  return getTicketList({ assigneeId: techId })
}

const addVersionHistory = async (
  workOrderId: string,
  editorId: string,
  editorName: string,
  changes: Record<string, { old: unknown; new: unknown }>,
  note: string | null
): Promise<void> => {
  const versionId = uuid.v4()
  await runExec(
    `INSERT INTO version_entries (id, work_order_id, editor_id, editor_name, changes_json, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [versionId, workOrderId, editorId, editorName, JSON.stringify(changes), note]
  )
}

export const updateTicket = async (
  id: string,
  req: UpdateTicketRequest
): Promise<WorkOrder> => {
  const oldTicket = await getTicketById(id)

  const fieldMap: Record<string, keyof UpdateTicketRequest> = {
    community: 'community',
    building: 'building',
    room_number: 'roomNumber',
    problem_type: 'problemType',
    urgency: 'urgency',
    callback_sentence: 'callbackSentence'
  }

  const changes: Record<string, { old: unknown; new: unknown }> = {}
  const setClauses: string[] = []
  const params: unknown[] = []

  for (const [dbField, reqField] of Object.entries(fieldMap)) {
    if (reqField in req && req[reqField] !== undefined) {
      const oldValue = oldTicket[reqField as keyof WorkOrder]
      const newValue = req[reqField]
      if (oldValue !== newValue) {
        changes[dbField] = { old: oldValue, new: newValue }
        setClauses.push(`${dbField} = ?`)
        params.push(newValue)

        await runExec(
          `UPDATE evidence_sentences SET corrected = ? 
           WHERE work_order_id = ? AND field = ?`,
          [newValue, id, reqField]
        )
      }
    }
  }

  if ('isConfirmed' in req && req.isConfirmed !== undefined) {
    const oldValue = oldTicket.isConfirmed
    if (oldValue !== req.isConfirmed) {
      changes['is_confirmed'] = { old: oldValue ? 1 : 0, new: req.isConfirmed ? 1 : 0 }
      setClauses.push('is_confirmed = ?')
      params.push(req.isConfirmed ? 1 : 0)
    }
  }

  if (Object.keys(changes).length === 0) {
    return oldTicket
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id)

  await runExec(
    `UPDATE work_orders SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  )

  await addVersionHistory(id, req.editorId, req.editorName, changes, req.note ?? null)

  const updatedTicket = await getTicketById(id)
  const newExtraction = {
    community: updatedTicket.community,
    building: updatedTicket.building,
    roomNumber: updatedTicket.roomNumber,
    problemType: updatedTicket.problemType,
    urgency: updatedTicket.urgency,
    callbackSentence: updatedTicket.callbackSentence,
    evidenceSentences: updatedTicket.evidenceSentences,
    suspicions: []
  }
  const newShortMsg = generateShortMessage(newExtraction)

  await runExec('UPDATE work_orders SET short_message = ? WHERE id = ?', [newShortMsg, id])

  return getTicketById(id)
}

export const assignTicket = async (
  id: string,
  req: AssignTicketRequest
): Promise<WorkOrder> => {
  const oldTicket = await getTicketById(id)

  await runExec(
    `UPDATE work_orders 
     SET assignee_id = ?, dispatcher_id = ?, short_message = ?, status = 'assigned',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [req.assigneeId, req.dispatcherId, req.shortMessage, id]
  )

  const changes = {
    assignee_id: { old: oldTicket.assigneeId, new: req.assigneeId },
    dispatcher_id: { old: oldTicket.dispatcherId, new: req.dispatcherId },
    short_message: { old: oldTicket.shortMessage, new: req.shortMessage },
    status: { old: oldTicket.status, new: 'assigned' }
  }

  await addVersionHistory(id, req.dispatcherId, req.dispatcherName, changes, '工单已派发')

  return getTicketById(id)
}

export const updateTicketStatus = async (
  id: string,
  status: WorkOrderStatus,
  editorId: string,
  editorName: string
): Promise<WorkOrder> => {
  const oldTicket = await getTicketById(id)

  await runExec(
    'UPDATE work_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, id]
  )

  const changes = {
    status: { old: oldTicket.status, new: status }
  }

  await addVersionHistory(id, editorId, editorName, changes, `状态更新为${status}`)

  return getTicketById(id)
}

export const exportTicket = async (id: string): Promise<WorkOrder> => {
  return getTicketById(id)
}

export const exportAllTickets = async (): Promise<WorkOrder[]> => {
  return getTicketList({})
}

export const getTechs = async (): Promise<Staff[]> => {
  return runQuery<Staff>(
    "SELECT id, name, role, phone FROM staff WHERE role = 'tech' ORDER BY name"
  )
}

export const getStaffById = async (id: string): Promise<Staff | null> => {
  return getOne<Staff>(
    'SELECT id, name, role, phone FROM staff WHERE id = ?',
    [id]
  )
}

export const getStaffByCredentials = async (staffId: string): Promise<Staff | null> => {
  return getStaffById(staffId)
}
