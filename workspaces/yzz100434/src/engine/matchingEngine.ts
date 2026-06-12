import type {
  AuditChecklistItem,
  ScannedFile,
  Alert,
  FileStatus,
  AlertType,
} from '@/types'

function generateAlertId(): string {
  return `alt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function extractDateFromFileName(name: string): Date | null {
  const patterns = [
    /(\d{4})[年\-\/\.](\d{1,2})[月\-\/\.]?(\d{0,2})/,
    /(\d{4})(\d{2})(\d{2})/,
    /^(\d{4})(\d{2})/,
  ]
  for (const p of patterns) {
    const m = name.match(p)
    if (m) {
      const year = parseInt(m[1], 10)
      const month = parseInt(m[2], 10)
      const day = m[3] ? parseInt(m[3], 10) : 1
      if (year >= 2000 && year <= 2099 && month >= 1 && month <= 12) {
        return new Date(year, month - 1, day)
      }
    }
  }
  return null
}

function hasMonthInFileName(name: string): boolean {
  const monthPatterns = [
    /\d{1,2}月/,
    /\d{4}[年\-\/\.]\d{1,2}/,
    /\d{4}\d{2}/,
    /0[1-9]|1[0-2]/,
  ]
  return monthPatterns.some((p) => p.test(name))
}

function isFileExpired(file: ScannedFile, item: AuditChecklistItem): boolean {
  if (item.expiryDate) {
    return new Date(item.expiryDate) < new Date()
  }
  if (item.category === 'license' || item.category === 'training') {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    return file.lastModified < threeMonthsAgo.getTime()
  }
  if (item.category === 'fire_safety') {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    return file.lastModified < oneMonthAgo.getTime()
  }
  return false
}

function isExpiringSoon(item: AuditChecklistItem): boolean {
  if (!item.expiryDate) return false
  const expiry = new Date(item.expiryDate)
  const now = new Date()
  const thirtyDaysLater = new Date()
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
  return expiry > now && expiry <= thirtyDaysLater
}

function checkExpiringSoon(item: AuditChecklistItem): Alert | null {
  if (!isExpiringSoon(item)) return null
  return {
    id: generateAlertId(),
    type: 'expiring_soon',
    message: `${item.name}将于${item.expiryDate}到期，请尽快续期`,
    severity: 'critical',
  }
}

function checkMissingMonth(files: ScannedFile[]): Alert[] {
  const alerts: Alert[] = []
  const filesWithoutMonth = files.filter((f) => !hasMonthInFileName(f.name))
  if (filesWithoutMonth.length > 0) {
    alerts.push({
      id: generateAlertId(),
      type: 'missing_month',
      message: `${filesWithoutMonth.length}个文件名无法识别月份，建议按"YYYY年MM月"格式命名`,
      severity: 'warning',
    })
  }
  return alerts
}

function checkMultipleVersions(
  item: AuditChecklistItem,
  files: ScannedFile[]
): Alert[] {
  const alerts: Alert[] = []
  if (files.length <= 1) return alerts

  const baseNames = files.map((f) => {
    return f.name
      .replace(/v?\d+(\.\d+)*/gi, '')
      .replace(/[_\-\s]*副本.*/, '')
      .replace(/[_\-\s]*copy.*/i, '')
      .replace(/\.\w+$/, '')
      .trim()
  })

  const nameCounts: Record<string, number> = {}
  baseNames.forEach((n) => {
    nameCounts[n] = (nameCounts[n] || 0) + 1
  })

  const duplicates = Object.entries(nameCounts).filter(
    ([, count]) => count > 1
  )
  if (duplicates.length > 0) {
    alerts.push({
      id: generateAlertId(),
      type: 'multiple_versions',
      message: `发现${duplicates.length}组同名不同版本文件，请确认使用最新版本并归档旧版`,
      severity: 'warning',
    })
  }
  return alerts
}

function checkMissingPages(item: AuditChecklistItem): Alert | null {
  if (!item.expectedPages) return null
  const actual = item.actualPages ?? item.matchedFiles.length
  if (actual < item.expectedPages) {
    return {
      id: generateAlertId(),
      type: 'missing_pages',
      message: `预计${item.expectedPages}页，当前仅${actual}页，缺少${item.expectedPages - actual}页`,
      severity: 'critical',
    }
  }
  return null
}

function matchFilesToItem(
  item: AuditChecklistItem,
  files: ScannedFile[]
): ScannedFile[] {
  return files.filter((file) => {
    const fileName = file.name.toLowerCase()
    return item.requiredFiles.some((keyword) =>
      fileName.includes(keyword.toLowerCase())
    )
  })
}

function determineItemStatus(
  item: AuditChecklistItem,
  matchedFiles: ScannedFile[]
): FileStatus {
  if (matchedFiles.length === 0) return 'missing'

  const hasExpiredFile = matchedFiles.some((f) => isFileExpired(f, item))
  if (hasExpiredFile) {
    if (isExpiringSoon(item)) return 'needs_update'
    return 'expired'
  }

  const hasMultipleVersions = matchedFiles.length > 1
  if (hasMultipleVersions) return 'needs_update'

  return 'existing'
}

export function matchAndAnalyze(
  checklist: AuditChecklistItem[],
  scannedFiles: ScannedFile[]
): AuditChecklistItem[] {
  return checklist.map((item) => {
    const matchedFiles = matchFilesToItem(item, scannedFiles)
    const status = determineItemStatus(item, matchedFiles)

    const alerts: Alert[] = []

    if (status !== 'missing') {
      const expiringAlert = checkExpiringSoon(item)
      if (expiringAlert) alerts.push(expiringAlert)

      const monthAlerts = checkMissingMonth(matchedFiles)
      alerts.push(...monthAlerts)

      const versionAlerts = checkMultipleVersions(item, matchedFiles)
      alerts.push(...versionAlerts)

      const pagesAlert = checkMissingPages(item)
      if (pagesAlert) alerts.push(pagesAlert)
    }

    return {
      ...item,
      matchedFiles,
      status,
      alerts,
    }
  })
}

export { extractDateFromFileName, hasMonthInFileName }
