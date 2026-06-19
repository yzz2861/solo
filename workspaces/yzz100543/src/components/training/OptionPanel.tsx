import type { Option, OptionCategory } from '@/types'
import OptionCard from './OptionCard'
import { Heart, ClipboardCheck, Wrench, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface OptionPanelProps {
  options: Option[]
  onSelect: (option: Option) => void
  disabled?: boolean
}

const tabs: { category: OptionCategory; label: string; icon: typeof Heart }[] = [
  { category: 'comfort', label: '安抚话术', icon: Heart },
  { category: 'info', label: '确认信息', icon: ClipboardCheck },
  { category: 'maintenance', label: '通知维保', icon: Wrench },
  { category: 'escalate', label: '升级经理', icon: TrendingUp },
]

export default function OptionPanel({ options, onSelect, disabled }: OptionPanelProps) {
  const [activeTab, setActiveTab] = useState<OptionCategory>('comfort')
  const filtered = options.filter(o => o.category === activeTab)
  const hasOptions = filtered.length > 0

  return (
    <div className="bg-[#0a1e30] border-t border-[#1a3a54]">
      <div className="flex border-b border-[#1a3a54]">
        {tabs.map((tab) => {
          const count = options.filter(o => o.category === tab.category).length
          return (
            <button
              key={tab.category}
              onClick={() => setActiveTab(tab.category)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors relative',
                activeTab === tab.category
                  ? 'text-white'
                  : 'text-[#667788] hover:text-[#8899aa]'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  'w-4 h-4 rounded-full text-[10px] flex items-center justify-center',
                  activeTab === tab.category ? 'bg-[#FF6B35] text-white' : 'bg-[#1a3a54] text-[#667788]'
                )}>
                  {count}
                </span>
              )}
              {activeTab === tab.category && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#FF6B35] rounded-full" />
              )}
            </button>
          )
        })}
      </div>
      <div className="p-4 space-y-3 max-h-[40vh] overflow-y-auto">
        {hasOptions ? (
          filtered.map((option) => (
            <OptionCard key={option.id} option={option} onClick={onSelect} disabled={disabled} />
          ))
        ) : (
          <div className="text-center py-8 text-[#667788] text-sm">
            当前分类没有可用选项
          </div>
        )}
      </div>
    </div>
  )
}
