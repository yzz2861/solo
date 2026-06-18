export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}${timestamp}${random}`
}

export function formatTime(timeSeconds: number): string {
  const hours = Math.floor(timeSeconds / 3600)
  const minutes = Math.floor((timeSeconds % 3600) / 60)
  const seconds = Math.floor(timeSeconds % 60)
  const ms = Math.floor((timeSeconds % 1) * 100)
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  let seconds = 0
  if (parts.length === 3) {
    seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2])
  } else if (parts.length === 2) {
    seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1])
  } else {
    seconds = parseFloat(timeStr)
  }
  return isNaN(seconds) ? 0 : seconds
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDateShort(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export const TAPE_STATUS_LABELS: Record<string, string> = {
  pending: '待转录',
  transcribing: '转录中',
  interrupted: '转录中断',
  transcribed: '已转录',
  repairing: '修复中',
  completed: '已完成'
}

export const TAPE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  transcribing: 'bg-blue-100 text-blue-700',
  interrupted: 'bg-red-100 text-red-700',
  transcribed: 'bg-green-100 text-green-700',
  repairing: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-emerald-100 text-emerald-700'
}

export const DELIVERY_MEDIUM_LABELS: Record<string, string> = {
  usb: 'U盘',
  dvd: 'DVD光盘',
  cloud: '云存储',
  hard_drive: '移动硬盘',
  other: '其他'
}

export const OUTPUT_FORMAT_LABELS: Record<string, string> = {
  mp4: 'MP4',
  mov: 'MOV',
  avi: 'AVI',
  mkv: 'MKV',
  custom: '自定义'
}

export const SEVERITY_LABELS: Record<string, string> = {
  mild: '轻微',
  moderate: '中等',
  severe: '严重'
}

export const SEVERITY_COLORS: Record<string, string> = {
  mild: 'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  severe: 'bg-red-100 text-red-700'
}
