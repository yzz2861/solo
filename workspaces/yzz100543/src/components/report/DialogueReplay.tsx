import type { DialogueLog, MissedPoint } from '@/types'
import DialogueBubble from '@/components/training/DialogueBubble'

interface DialogueReplayProps {
  logs: DialogueLog[]
  missedPoints: MissedPoint[]
}

export default function DialogueReplay({ logs, missedPoints }: DialogueReplayProps) {
  const missedMap = new Map(missedPoints.map(m => [m.infoPointId, m]))

  return (
    <div className="bg-[#0F2A44] rounded-2xl p-5 border border-[#1a3a54]">
      <h3 className="text-white font-bold mb-4">对话回放</h3>
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
        {logs.map((log) => {
          const isMissed = log.isMissed ?? false
          const missedPoint = log.missedInfoPointId ? missedMap.get(log.missedInfoPointId) : undefined
          return (
            <DialogueBubble
              key={log.id}
              speaker={log.speaker}
              text={log.text}
              isMissed={isMissed}
              missedInfoPointName={missedPoint?.infoPointName}
              correctQuestion={missedPoint?.correctQuestion}
            />
          )
        })}
      </div>
    </div>
  )
}
