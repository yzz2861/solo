import { cn } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'

interface TouristCardProps {
  group: {
    id: string
    position: { q: number; r: number }
    count: number
    stamina: number
    maxStamina: number
    waitTurns: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    rescued: boolean
  }
  isSelected: boolean
  onClick: () => void
}

const riskColors: Record<string, string> = {
  low: 'bg-[var(--safe-green)]',
  medium: 'bg-[var(--warning-amber)]',
  high: 'bg-[var(--danger-coral)]',
  critical: 'bg-red-500 animate-pulse-danger',
}

function staminaColor(ratio: number): string {
  if (ratio > 0.7) return 'bg-[var(--safe-green)]'
  if (ratio > 0.4) return 'bg-[var(--warning-amber)]'
  return 'bg-[var(--danger-coral)]'
}

export default function TouristCard({ group, isSelected, onClick }: TouristCardProps) {
  const staminaRatio = group.maxStamina > 0 ? group.stamina / group.maxStamina : 0

  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-panel-sm relative p-3 cursor-pointer transition-all duration-200',
        isSelected && 'border-[var(--tide-teal)] border shadow-[0_0_12px_rgba(0,201,167,0.25)]',
        group.rescued && 'opacity-50'
      )}
    >
      {group.rescued && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <CheckCircle className="w-8 h-8 text-[var(--safe-green)]" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', riskColors[group.riskLevel])} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-[var(--text-primary)] truncate">{group.id}</span>
            <span className="text-[var(--text-secondary)]">×{group.count}</span>
            <span className="text-[var(--text-muted)] text-xs">
              ({group.position.q},{group.position.r})
            </span>
          </div>
        </div>

        <div className="w-20 shrink-0">
          <div className="h-1.5 rounded-full bg-[var(--surface)]">
            <div
              className={cn('stamina-bar rounded-full', staminaColor(staminaRatio))}
              style={{ width: `${Math.max(0, Math.min(100, staminaRatio * 100))}%` }}
            />
          </div>
          <div className="text-[10px] text-[var(--text-muted)] text-right mt-0.5">
            {Math.round(staminaRatio * 100)}%
          </div>
        </div>
      </div>

      <div className="mt-1.5 text-xs text-[var(--text-muted)] pl-[22px]">
        等待 {group.waitTurns} 回合
      </div>
    </div>
  )
}
