import type { Speaker } from '@/types'
import { cn } from '@/lib/utils'
import { User, Headset, Info } from 'lucide-react'

interface DialogueBubbleProps {
  speaker: Speaker
  text: string
  isMissed?: boolean
  missedInfoPointName?: string
  correctQuestion?: string
  emotion?: string
  animate?: boolean
}

const speakerConfig: Record<Speaker, { icon: typeof User; label: string; bgClass: string; textClass: string; align: string }> = {
  passenger: { icon: User, label: '乘客', bgClass: 'bg-[#1a3a54]', textClass: 'text-white', align: 'self-start' },
  system: { icon: Headset, label: '客服', bgClass: 'bg-[#0F2A44] border border-[#2a5a84]', textClass: 'text-[#88ccff]', align: 'self-end' },
  narrator: { icon: Info, label: '系统', bgClass: 'bg-[#2a1a0a] border border-[#4a3a2a]', textClass: 'text-[#FF6B35]', align: 'self-center' },
}

export default function DialogueBubble({ speaker, text, isMissed, missedInfoPointName, correctQuestion, emotion, animate }: DialogueBubbleProps) {
  const config = speakerConfig[speaker]
  const Icon = config.icon

  return (
    <div className={cn('flex gap-3 max-w-[85%]', config.align, animate && 'animate-slideUp')}>
      {speaker !== 'system' && (
        <div className={cn('flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center', speaker === 'passenger' ? 'bg-[#2a4a64]' : 'bg-[#3a2a1a]')}>
          <Icon className="w-4 h-4 text-[#8899aa]" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-medium', speaker === 'system' ? 'text-[#4499cc]' : 'text-[#667788]')}>{config.label}</span>
          {emotion && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20">
              {emotion}
            </span>
          )}
        </div>
        <div className={cn('rounded-2xl px-4 py-3', config.bgClass, isMissed && 'border-2 border-red-500/50')}>
          <p className={cn('text-sm leading-relaxed', config.textClass)}>{text}</p>
          {isMissed && missedInfoPointName && (
            <div className="mt-2 pt-2 border-t border-red-500/20">
              <p className="text-xs text-red-400">⚠️ 漏问信息点：{missedInfoPointName}</p>
              {correctQuestion && (
                <p className="text-xs text-green-400 mt-1">✅ 正确问法：{correctQuestion}</p>
              )}
            </div>
          )}
        </div>
      </div>
      {speaker === 'system' && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-[#0a2a44]">
          <Icon className="w-4 h-4 text-[#4499cc]" />
        </div>
      )}
    </div>
  )
}
