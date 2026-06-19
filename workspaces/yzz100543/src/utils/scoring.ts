export function calculateScore(
  confirmedCount: number,
  requiredCount: number,
  comfortScore: number,
  totalRounds: number,
  baselineRounds: number
): { totalScore: number; infoScore: number; comfortNorm: number; efficiencyScore: number } {
  const infoScore = requiredCount > 0 ? (confirmedCount / requiredCount) * 60 : 0
  const comfortNorm = Math.min(comfortScore, 25)
  const efficiencyRatio = totalRounds <= baselineRounds ? 1 : Math.max(0, 1 - (totalRounds - baselineRounds) / baselineRounds)
  const efficiencyScore = efficiencyRatio * 15

  return {
    totalScore: Math.round(infoScore + comfortNorm + efficiencyScore),
    infoScore: Math.round(infoScore),
    comfortNorm: Math.round(comfortNorm),
    efficiencyScore: Math.round(efficiencyScore),
  }
}
