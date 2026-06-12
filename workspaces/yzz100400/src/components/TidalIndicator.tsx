import { useGameStore } from '@/store/gameStore'
import { cn } from '@/lib/utils'
import { getWaterLevelAtTurn } from '@/engine/tidalSystem'
import { levels } from '@/data/levels'

export default function TidalIndicator() {
  const { waterLevel, currentTurn, maxTurns, currentLevelId } = useGameStore()

  const level = currentLevelId ? levels.find(l => l.id === currentLevelId) : null
  const nextWaterLevel = level ? getWaterLevelAtTurn(level.tidalCurve, currentTurn + 1) : waterLevel

  const maxScale = 10
  const clampedLevel = Math.max(0, Math.min(maxScale, waterLevel))
  const clampedNext = Math.max(0, Math.min(maxScale, nextWaterLevel))
  const levelPercent = (clampedLevel / maxScale) * 100
  const nextPercent = (clampedNext / maxScale) * 100

  const riseRate = nextWaterLevel - waterLevel
  const isRisingFast = riseRate > 0.5
  const isNearCritical = waterLevel >= 7

  function levelLineColor(): string {
    if (isNearCritical) return 'bg-[var(--danger-coral)]'
    if (isRisingFast) return 'bg-[var(--warning-amber)]'
    return 'bg-[var(--tide-teal)]'
  }

  return (
    <div className="relative w-12 h-full glass-panel-sm flex flex-col items-center py-2 gap-1">
      <div className="relative flex-1 w-full">
        <div
          className="absolute inset-x-2 bottom-0 rounded-b"
          style={{
            top: 0,
            background: 'linear-gradient(to top, #0A2540, #163456)',
          }}
        />

        {Array.from({ length: maxScale + 1 }, (_, i) => {
          const pct = (i / maxScale) * 100
          return (
            <div
              key={i}
              className="absolute left-0 right-0 flex items-center"
              style={{ bottom: `${pct}%` }}
            >
              <div className="w-1.5 h-px bg-[var(--text-muted)] opacity-50" />
              <span className="text-[7px] text-[var(--text-muted)] ml-0.5 select-none">{i}</span>
            </div>
          )
        })}

        <div
          className={cn(
            'absolute left-1 right-1 h-[2px] animate-wave',
            levelLineColor()
          )}
          style={{ bottom: `${levelPercent}%` }}
        />

        <div
          className="absolute left-1 right-1 h-px bg-[var(--tide-teal)] opacity-30"
          style={{ bottom: `${nextPercent}%` }}
        />
      </div>

      <div className={cn(
        'font-display text-sm font-bold',
        isNearCritical ? 'text-[var(--danger-coral)]' : isRisingFast ? 'text-[var(--warning-amber)]' : 'text-[var(--tide-teal)]'
      )}>
        {waterLevel.toFixed(1)}
      </div>
    </div>
  )
}
