import type { GameScore, ResourceAnalysis, GameTurn, TouristGroup, RescueBoat, TidalWindow, Decision } from "@/types/game"

export function calculateScore(
  rescuedCount: number,
  totalTourists: number,
  turnsUsed: number,
  maxTurns: number,
  missedWindows: TidalWindow[],
  totalWindows: number
): GameScore {
  const rescueEfficiency = (rescuedCount / totalTourists) * 100
  const resourceUtilization = (rescuedCount / totalTourists) * 50 + (rescuedCount / totalTourists) * 50
  const riskControl = 100
  const speed = Math.max(0, ((maxTurns - turnsUsed) / maxTurns) * 100)
  const decision = 100 - (missedWindows.length / Math.max(totalWindows, 1)) * 50
  const total = (rescueEfficiency + resourceUtilization + riskControl + speed + decision) / 5

  return { rescueEfficiency, resourceUtilization, riskControl, speed, decision, total }
}

export function analyzeResources(
  turns: GameTurn[],
  boats: RescueBoat[],
  groups: TouristGroup[]
): ResourceAnalysis {
  const boatDispatchCount: Record<string, number> = {}
  const idleTurns: Record<string, number> = {}
  const boatIds = boats.map(b => b.id)

  for (const id of boatIds) {
    boatDispatchCount[id] = 0
    idleTurns[id] = 0
  }

  let totalDispatches = 0
  let highRiskDispatches = 0
  let lowRiskDispatches = 0

  const groupRiskMap = new Map<string, string>()
  for (const group of groups) {
    groupRiskMap.set(group.id, group.riskLevel)
  }

  for (const turn of turns) {
    const dispatchedBoatIds = new Set<string>()

    for (const d of turn.decisions) {
      if (d.action === "dispatch") {
        boatDispatchCount[d.boatId] = (boatDispatchCount[d.boatId] || 0) + 1
        totalDispatches++
        dispatchedBoatIds.add(d.boatId)

        if (d.targetGroupId) {
          const risk = groupRiskMap.get(d.targetGroupId)
          if (risk === "high" || risk === "critical") {
            highRiskDispatches++
          } else if (risk === "low") {
            lowRiskDispatches++
          }
        }
      }
    }

    for (const id of boatIds) {
      if (!dispatchedBoatIds.has(id)) {
        idleTurns[id]++
      }
    }
  }

  const highRiskDispatchRatio = totalDispatches > 0 ? highRiskDispatches / totalDispatches : 0
  const lowRiskDispatchRatio = totalDispatches > 0 ? lowRiskDispatches / totalDispatches : 0

  const rescuedGroups = groups.filter(g => g.rescued)
  const averageResponseTime = rescuedGroups.length > 0
    ? rescuedGroups.reduce((sum, g) => sum + g.waitTurns, 0) / rescuedGroups.length
    : 0

  return { boatDispatchCount, highRiskDispatchRatio, lowRiskDispatchRatio, idleTurns, averageResponseTime }
}

export function getRiskLevel(
  stamina: number,
  maxStamina: number,
  waitTurns: number,
  waterLevel: number,
  elevation: number
): "low" | "medium" | "high" | "critical" {
  if (waterLevel >= elevation) return "critical"

  const staminaRatio = stamina / maxStamina
  if (staminaRatio > 0.7 && waitTurns < 3) return "low"
  if (staminaRatio > 0.4 && waitTurns < 5) return "medium"
  return "high"
}
