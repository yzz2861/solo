import type { InfoPoint, MissedPoint } from '@/types'

export function detectMissedPoints(
  confirmedInfoPointIds: string[],
  requiredInfoPoints: InfoPoint[],
  sessionId: string
): MissedPoint[] {
  const confirmedSet = new Set(confirmedInfoPointIds)
  const missed: MissedPoint[] = []

  for (const point of requiredInfoPoints) {
    if (point.required && !confirmedSet.has(point.id)) {
      missed.push({
        id: `missed-${sessionId}-${point.id}`,
        sessionId,
        infoPointId: point.id,
        correctQuestion: point.questionExample,
        infoPointName: point.name,
      })
    }
  }

  return missed
}
