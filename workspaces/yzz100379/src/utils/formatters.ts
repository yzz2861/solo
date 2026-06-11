import type { WorkOrder, UrgencyLevel } from '../../shared/types'
import { URGENCY_LABELS, PROBLEM_TYPES } from '../../shared/types'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function formatAddress(ticket: Partial<WorkOrder>): string {
  const parts: string[] = []
  if (ticket.community) parts.push(ticket.community)
  if (ticket.building) parts.push(ticket.building)
  if (ticket.roomNumber) parts.push(ticket.roomNumber)
  return parts.join(' ') || '暂无地址信息'
}

export function formatShortMessage(ticket: Partial<WorkOrder>): string {
  if (ticket.shortMessage?.trim()) {
    return ticket.shortMessage.trim()
  }

  const parts: string[] = []
  if (ticket.problemType) {
    parts.push(ticket.problemType)
  } else if (ticket.sourceText) {
    const trimmed = ticket.sourceText.trim()
    parts.push(trimmed.length > 20 ? trimmed.slice(0, 20) + '…' : trimmed)
  } else {
    parts.push('维修服务')
  }

  const urgency = ticket.urgency ? URGENCY_LABELS[ticket.urgency] : null
  if (urgency && urgency !== '普通') {
    parts.unshift(`【${urgency}】`)
  }

  return parts.join('')
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  try {
    return format(d, 'yyyy-MM-dd HH:mm', { locale: zhCN })
  } catch {
    return '-'
  }
}

export function getUrgencyColor(urgency: UrgencyLevel | null | undefined): string {
  switch (urgency) {
    case 'high':
      return 'bg-red-600 text-white'
    case 'medium':
      return 'bg-amber-500 text-white'
    case 'low':
      return 'bg-blue-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}

export function getUrgencyBgColor(urgency: UrgencyLevel | null | undefined): string {
  switch (urgency) {
    case 'high':
      return 'bg-red-50 border-red-200'
    case 'medium':
      return 'bg-amber-50 border-amber-200'
    case 'low':
      return 'bg-blue-50 border-blue-200'
    default:
      return 'bg-gray-50 border-gray-200'
  }
}

export function getStatusColor(status: WorkOrder['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-100 text-gray-700'
    case 'assigned':
      return 'bg-orange-100 text-orange-700'
    case 'processing':
      return 'bg-blue-100 text-blue-700'
    case 'completed':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export function getProblemTypes(): readonly string[] {
  return PROBLEM_TYPES
}
