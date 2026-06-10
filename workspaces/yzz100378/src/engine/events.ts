import { LevelEvent, ActiveEvent, GameState, LevelConfig, Escalator } from "@/types"

export interface EventResult {
  message: string
  type: LevelEvent["type"]
  escalatorStates?: Record<string, boolean>
  closedExits?: Record<string, boolean>
  surgeEntranceId?: string
  surgeMultiplier?: number
}

export function checkEvents(level: LevelConfig, state: GameState): Array<{ event: LevelEvent; result: EventResult }> {
  const triggered: Array<{ event: LevelEvent; result: EventResult }> = []

  for (const event of level.events) {
    const alreadyTriggered = state.activeEvents.some(ae => ae.eventId === event.id)
    if (alreadyTriggered) continue
    if (state.elapsedTime < event.triggerTime) continue

    const result = resolveEvent(event, level, state)
    triggered.push({ event, result })
  }

  return triggered
}

function resolveEvent(event: LevelEvent, level: LevelConfig, state: GameState): EventResult {
  switch (event.type) {
    case "escalator_stop": {
      const escalatorId = event.params.escalatorId as string
      const esc = level.escalators.find(e => e.id === escalatorId)
      return {
        message: `扶梯${esc ? " " + esc.id : ""}临时停运！`,
        type: "escalator_stop",
        escalatorStates: { [escalatorId]: false }
      }
    }
    case "exit_close": {
      const exitId = event.params.exitId as string
      const ext = level.exits.find(e => e.id === exitId)
      return {
        message: `出口${ext ? " " + ext.label : ""}临时关闭！`,
        type: "exit_close",
        closedExits: { [exitId]: true }
      }
    }
    case "passenger_surge": {
      const entranceId = event.params.entranceId as string
      const multiplier = (event.params.multiplier as number) || 3
      const ent = level.entrances.find(e => e.id === entranceId)
      return {
        message: `${ent ? ent.label : "入口"}客流量突增${multiplier}倍！`,
        type: "passenger_surge",
        surgeEntranceId: entranceId,
        surgeMultiplier: multiplier
      }
    }
    default:
      return { message: "未知事件", type: event.type }
  }
}
