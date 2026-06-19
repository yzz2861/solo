import type { Option, OptionCategory } from '@/types'
import { cn } from '@/lib/utils'
import { Heart, ClipboardCheck, Wrench, TrendingUp } from 'lucide-react'

interface OptionCardProps {
  option: Option
  onClick: (option: Option) => void
  disabled?: boolean
}

const categoryConfig: Record<OptionCategory, { icon: typeof Heart; label: string; colorClass: string; borderClass: string }> = {
  comfort: { icon: Heart, label: '安抚', colorClass: 'text-pink-400', borderClass: 'hover:border-pink-400/40' },
  info: { icon: ClipboardCheck, label: '确认信息', colorClass: 'text-blue-400', borderClass: 'hover:border-blue-400/40' },
  maintenance: { icon: Wrench, label: '通知维保', colorClass: 'text-amber-400', borderClass: 'hover:border-amber-400/40' },
  escalate: { icon: TrendingUp, label: '升级', colorClass: 'text-purple-400', borderClass: 'hover:border-purple-400/40' },
}

export default function OptionCard({ option, onClick, disabled }: OptionCardProps) {
  const config = categoryConfig[option.category]
  const Icon = config.icon

  return (
    <button
      onClick={() => onClick(option)}
      disabled={disabled}
      className={cn(
        'w-full text-left p-4 rounded-xl bg-[#1a3a54] border border-[#2a4a64] transition-all duration-200',
        config.borderClass,
        'hover:bg-[#1f4060] hover:shadow-lg active:scale-[0.98]',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-[#1a3a54] hover:shadow-none active:scale-100'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-[#0a1e30]', config.colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full bg-[#0a1e30]', config.colorClass)}>
              {config.label}
            </span>
            {option.confirmsInfoPoints.length > 0 && (
              <span className="text-xs text-[#2EC4B6]">
                +{option.confirmsInfoPoints.length}信息点
              </span>
            )}
          </div>
          <p className="text-sm text-white/90 leading-relaxed">{option.text}</p>
        </div>
      </div>
    </button>
  )
}
