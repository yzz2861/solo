import type { InfoPoint } from '@/types'
import { Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InfoStatusBarProps {
  infoPoints: InfoPoint[]
  confirmedIds: string[]
}

export default function InfoStatusBar({ infoPoints, confirmedIds }: InfoStatusBarProps) {
  const confirmedSet = new Set(confirmedIds)

  return (
    <div className="flex gap-2 px-4 py-3 bg-[#0a1e30] border-b border-[#1a3a54] overflow-x-auto">
      {infoPoints.filter(p => p.required).map((point) => {
        const confirmed = confirmedSet.has(point.id)
        return (
          <div
            key={point.id}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300',
              confirmed
                ? 'bg-[#2EC4B6]/15 text-[#2EC4B6] border border-[#2EC4B6]/30'
                : 'bg-[#1a3a54] text-[#667788] border border-[#2a4a64]'
            )}
          >
            {confirmed ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {point.name}
          </div>
        )
      })}
    </div>
  )
}
