import type { AppEvent, Judge, Work, Score, ValidationWarning } from '@/types'

export function validateImagePaths(works: Work[]): ValidationWarning[] {
  return works
    .filter((w) => !w.imageValid)
    .map((w) => ({
      type: 'image_invalid' as const,
      message: `作品 ${w.anonymousCode} 图片路径无效: ${w.imagePath}`,
      targetId: w.id,
    }))
}

export function validateAuthorLimit(works: Work[], maxPerAuthor: number): ValidationWarning[] {
  const authorCount: Record<string, number> = {}
  for (const w of works) {
    authorCount[w.author] = (authorCount[w.author] || 0) + 1
  }
  const warnings: ValidationWarning[] = []
  const exceeded = Object.entries(authorCount).filter(([, count]) => count > maxPerAuthor)
  for (const [author, count] of exceeded) {
    const work = works.find((w) => w.author === author)!
    warnings.push({
      type: 'author_exceed',
      message: `作者 "${author}" 提交了 ${count} 幅作品，超过上限 ${maxPerAuthor}`,
      targetId: work.id,
    })
  }
  return warnings
}

export function validateJudgeScores(
  judges: Judge[],
  works: Work[],
  scores: Score[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = []
  for (const judge of judges) {
    if (judge.absent) continue
    const judgeScores = scores.filter((sc) => sc.judgeId === judge.id)
    const missingWorks = works.filter(
      (w) => !judgeScores.find((sc) => sc.workId === w.id && sc.score !== null)
    )
    if (missingWorks.length > 0) {
      warnings.push({
        type: 'judge_missing',
        message: `评委 "${judge.name}" 尚有 ${missingWorks.length} 幅作品未评分`,
        targetId: judge.id,
      })
    }
  }
  return warnings
}

export function validateScoreRange(
  scores: Score[],
  event: AppEvent
): ValidationWarning[] {
  return scores
    .filter((sc) => sc.score !== null && (sc.score! < event.scoreMin || sc.score! > event.scoreMax))
    .map((sc) => ({
      type: 'score_out_of_range' as const,
      message: `评分 ${sc.score} 超出范围 [${event.scoreMin}, ${event.scoreMax}]`,
      targetId: sc.id,
    }))
}

export function runAllValidations(
  event: AppEvent,
  judges: Judge[],
  works: Work[],
  scores: Score[]
): ValidationWarning[] {
  return [
    ...validateImagePaths(works),
    ...validateAuthorLimit(works, event.maxWorksPerAuthor),
    ...validateJudgeScores(judges, works, scores),
    ...validateScoreRange(scores, event),
  ]
}

export function getWorkAverageScore(workId: string, scores: Score[], judges: Judge[]): number {
  const activeJudges = judges.filter((j) => !j.absent)
  const activeJudgeIds = new Set(activeJudges.map((j) => j.id))
  const workScores = scores.filter(
    (sc) => sc.workId === workId && sc.judgeId && activeJudgeIds.has(sc.judgeId) && sc.score !== null
  )
  if (workScores.length === 0) return 0
  const sum = workScores.reduce((acc, sc) => acc + sc.score!, 0)
  return Math.round((sum / workScores.length) * 100) / 100
}

export function getRankedWorks(
  works: Work[],
  scores: Score[],
  judges: Judge[]
): (Work & { avgScore: number; rank: number })[] {
  const ranked = works
    .map((w) => ({
      ...w,
      avgScore: getWorkAverageScore(w.id, scores, judges),
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
  return ranked.map((w, i) => ({ ...w, rank: i + 1 }))
}

export function getAggregatedComment(workId: string, scores: Score[], judges: Judge[]): string {
  const activeJudges = judges.filter((j) => !j.absent)
  const activeJudgeIds = new Set(activeJudges.map((j) => j.id))
  const workScores = scores.filter(
    (sc) => sc.workId === workId && sc.judgeId && activeJudgeIds.has(sc.judgeId) && sc.comment.trim()
  )
  return workScores.map((sc) => {
    const judge = judges.find((j) => j.id === sc.judgeId)
    return judge ? `${judge.name}: ${sc.comment}` : sc.comment
  }).join('\n')
}
