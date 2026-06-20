export type RiskLevel = 'safe' | 'caution' | 'warning' | 'danger'

const pad2 = (n: number) => n.toString().padStart(2, '0')

export function formatDateTime(input: number | string): string {
  const d = new Date(input)
  if (isNaN(d.getTime())) return ''
  return (
    d.getFullYear() +
    '-' +
    pad2(d.getMonth() + 1) +
    '-' +
    pad2(d.getDate()) +
    ' ' +
    pad2(d.getHours()) +
    ':' +
    pad2(d.getMinutes())
  )
}

export function formatDate(input: number | string): string {
  const d = new Date(input)
  if (isNaN(d.getTime())) return ''
  return (
    d.getFullYear() +
    '-' +
    pad2(d.getMonth() + 1) +
    '-' +
    pad2(d.getDate())
  )
}

export function formatNumber(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || isNaN(n)) return '-'
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function cnRiskLevel(level: RiskLevel): string {
  switch (level) {
    case 'safe':
      return '安全'
    case 'caution':
      return '留意'
    case 'warning':
      return '警告'
    case 'danger':
      return '危险'
    default:
      return '未知'
  }
}
