import type { Feedback, DiscomfortItem, Photo, SizeChart, StyleNumber, Alert } from './types'
import { BODY_PART_LABELS, OPPOSITE_KEYWORDS } from './constants'

export function detectAlerts(
  feedback: Feedback,
  photos: Photo[],
  discomforts: DiscomfortItem[],
  allFeedback: Feedback[],
  allDiscomforts: DiscomfortItem[],
  allPhotos: Photo[],
  styles: StyleNumber[],
  sizeCharts: SizeChart[],
): Alert[] {
  const alerts: Alert[] = []
  const style = styles.find(s => s.id === feedback.styleId)

  if (style && style.versions.length > 1) {
    alerts.push({
      id: `mv-${feedback.id}`,
      type: 'multipleVersions',
      message: `款号 ${style.code} 存在 ${style.versions.length} 个版本（${style.versions.join('、')}），当前选择版本：${feedback.version || '未选择'}`,
      relatedIds: [feedback.styleId],
    })
  }

  const photosWithoutSide = photos.filter(p => p.feedbackId === feedback.id && p.url && !p.side)
  if (photosWithoutSide.length > 0) {
    alerts.push({
      id: `pns-${feedback.id}`,
      type: 'photoNoSide',
      message: `有 ${photosWithoutSide.length} 张照片未标注正反面`,
      relatedIds: photosWithoutSide.map(p => p.id),
    })
  }

  const sizeEntry = sizeCharts.find(
    sc => sc.styleId === feedback.styleId && sc.version === feedback.version && sc.size === feedback.size
  )
  if (sizeEntry) {
    const missingFields: string[] = []
    const fields: (keyof SizeChart)[] = ['neckline', 'shoulder', 'chest', 'waist', 'hip', 'sleeveLength', 'pantsLength']
    for (const f of fields) {
      if (sizeEntry[f] === null) {
        missingFields.push(BODY_PART_LABELS[f as keyof typeof BODY_PART_LABELS])
      }
    }
    if (missingFields.length > 0) {
      alerts.push({
        id: `ms-${feedback.id}`,
        type: 'missingSize',
        message: `尺码 ${feedback.size} 的尺寸表缺项：${missingFields.join('、')}`,
        relatedIds: [sizeEntry.id],
      })
    }
  }

  const sameStyleFeedbacks = allFeedback.filter(
    f => f.styleId === feedback.styleId && f.version === feedback.version && f.id !== feedback.id
  )
  for (const other of sameStyleFeedbacks) {
    const otherDiscomforts = allDiscomforts.filter(d => d.feedbackId === other.id)
    for (const d of discomforts) {
      for (const od of otherDiscomforts) {
        if (d.bodyPart === od.bodyPart && hasOppositeDescription(d.description, od.description)) {
          alerts.push({
            id: `conflict-${d.id}-${od.id}`,
            type: 'conflict',
            message: `${BODY_PART_LABELS[d.bodyPart]}意见冲突：${feedback.wearerName}说"${d.description}"，${other.wearerName}说"${od.description}"`,
            relatedIds: [d.id, od.id, feedback.id, other.id],
          })
        }
      }
    }
  }

  return alerts
}

function hasOppositeDescription(a: string, b: string): boolean {
  for (const [kw1, kw2] of OPPOSITE_KEYWORDS) {
    if ((a.includes(kw1) && b.includes(kw2)) || (a.includes(kw2) && b.includes(kw1))) {
      return true
    }
  }
  return false
}

export function detectAllAlerts(
  allFeedback: Feedback[],
  allDiscomforts: DiscomfortItem[],
  allPhotos: Photo[],
  styles: StyleNumber[],
  sizeCharts: SizeChart[],
): Alert[] {
  const alerts: Alert[] = []
  const seen = new Set<string>()
  for (const fb of allFeedback) {
    const fbPhotos = allPhotos.filter(p => p.feedbackId === fb.id)
    const fbDiscomforts = allDiscomforts.filter(d => d.feedbackId === fb.id)
    const newAlerts = detectAlerts(fb, fbPhotos, fbDiscomforts, allFeedback, allDiscomforts, allPhotos, styles, sizeCharts)
    for (const a of newAlerts) {
      if (!seen.has(a.id)) {
        seen.add(a.id)
        alerts.push(a)
      }
    }
  }
  return alerts
}

export function getConflictAlertsForFeedback(feedbackId: string, alerts: Alert[]): Alert[] {
  return alerts.filter(a => a.type === 'conflict' && a.relatedIds.includes(feedbackId))
}
