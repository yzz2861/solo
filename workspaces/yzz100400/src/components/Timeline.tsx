import { useRef, useCallback } from 'react'

interface TimelineProps {
  totalTurns: number
  currentTurn: number
  decisions: { turnNumber: number; tidalWindowStatus: string }[]
  tidalWindows: { startTurn: number; endTurn: number; description: string }[]
  onTurnChange: (turn: number) => void
}

const STATUS_COLORS: Record<string, { band: string; dot: string }> = {
  optimal: { band: 'rgba(16, 185, 129, 0.25)', dot: '#10B981' },
  closing: { band: 'rgba(245, 158, 11, 0.25)', dot: '#F59E0B' },
  missed: { band: 'rgba(255, 107, 107, 0.25)', dot: '#FF6B6B' },
}

export default function Timeline({
  totalTurns,
  currentTurn,
  decisions,
  tidalWindows,
  onTurnChange,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  const turnToX = useCallback(
    (turn: number) => {
      if (totalTurns <= 1) return 0
      return (turn / (totalTurns - 1)) * 100
    },
    [totalTurns]
  )

  const xToTurn = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return 0
      const rect = trackRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return Math.round(ratio * (totalTurns - 1))
    },
    [totalTurns]
  )

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      const turn = xToTurn(e.clientX)
      onTurnChange(turn)
    },
    [xToTurn, onTurnChange]
  )

  const handleDrag = useCallback(
    (e: React.MouseEvent) => {
      if (e.buttons !== 1) return
      const turn = xToTurn(e.clientX)
      onTurnChange(turn)
    },
    [xToTurn, onTurnChange]
  )

  const turnMarkers = Array.from({ length: totalTurns }, (_, i) => i)

  return (
    <div className="w-full select-none">
      <div
        ref={trackRef}
        className="relative h-12 cursor-pointer"
        onClick={handleTrackClick}
        onMouseMove={handleDrag}
      >
        <div className="absolute top-4 left-0 right-0 h-3 rounded-full" style={{ background: 'rgba(14, 42, 71, 0.9)' }} />

        {tidalWindows.map((tw, idx) => {
          const statusKey = Object.keys(STATUS_COLORS).find((k) =>
            tw.description.toLowerCase().includes(k)
          ) ?? 'optimal'
          const colors = STATUS_COLORS[statusKey] ?? STATUS_COLORS.optimal
          const left = turnToX(tw.startTurn)
          const right = turnToX(tw.endTurn)
          return (
            <div
              key={idx}
              className="absolute top-4 h-3 rounded-full"
              style={{
                left: `${left}%`,
                width: `${right - left}%`,
                background: colors.band,
                border: `1px solid ${colors.dot}40`,
              }}
            />
          )
        })}

        <div className="absolute top-4 left-0 right-0 h-3 flex items-center">
          {turnMarkers.map((t) => (
            <div
              key={t}
              className="absolute h-full flex items-center justify-center"
              style={{ left: `${turnToX(t)}%` }}
            >
              <div className="w-0.5 h-1.5 rounded-sm" style={{ background: 'var(--text-muted)' }} />
            </div>
          ))}
        </div>

        {decisions.map((d, idx) => {
          const colors = STATUS_COLORS[d.tidalWindowStatus] ?? STATUS_COLORS.optimal
          return (
            <div
              key={idx}
              className="absolute top-3.5 flex items-center justify-center"
              style={{ left: `${turnToX(d.turnNumber)}%`, transform: 'translateX(-50%)' }}
            >
              <div
                className="w-3 h-3 rounded-full border-2"
                style={{ background: colors.dot, borderColor: `${colors.dot}80` }}
              />
            </div>
          )
        })}

        <div
          className="absolute top-0 bottom-0 w-0.5 z-10"
          style={{
            left: `${turnToX(currentTurn)}%`,
            background: 'var(--tide-teal)',
            boxShadow: '0 0 8px var(--tide-teal)',
          }}
        >
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
            style={{ background: 'var(--tide-teal)', boxShadow: '0 0 6px var(--tide-teal)' }}
          />
        </div>
      </div>

      <div className="relative h-5 mt-0.5">
        {turnMarkers.filter((t) => totalTurns <= 20 || t % Math.ceil(totalTurns / 20) === 0).map((t) => (
          <span
            key={t}
            className="absolute text-[10px] -translate-x-1/2"
            style={{
              left: `${turnToX(t)}%`,
              color: t === currentTurn ? 'var(--tide-teal)' : 'var(--text-muted)',
              fontWeight: t === currentTurn ? 600 : 400,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}
