import { useState, useMemo } from 'react'
import { Music, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { getAllScalePresets } from '@/utils/scales'
import type { ScaleDefinition } from '@/types'

export default function ScaleSelector() {
  const { selectedScale, setSelectedScale, voiceRange, setVoiceRange } = useAppStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const presets = useMemo(() => getAllScalePresets(), [])
  const filtered = useMemo(
    () => presets.filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [presets, searchTerm]
  )

  const categories = useMemo(() => {
    const cats: Record<string, ScaleDefinition[]> = {}
    for (const s of filtered) {
      const cat = s.name.includes('琶音') ? '琶音' : s.name.includes('自定义') ? '自定义' : '音阶'
      if (!cats[cat]) cats[cat] = []
      cats[cat].push(s)
    }
    return cats
  }, [filtered])

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-amber" />
          <h3 className="font-display font-semibold text-navy dark:text-white">目标音阶</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-navy/50 dark:text-teal/50 hover:text-navy dark:hover:text-teal transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {selectedScale && (
        <div className="px-3 py-2 rounded-lg bg-amber/10 text-sm font-medium text-navy dark:text-amber">
          已选：{selectedScale.name}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setVoiceRange('female')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            voiceRange === 'female'
              ? 'bg-amber text-navy shadow-md'
              : 'bg-navy/5 dark:bg-white/5 text-navy/60 dark:text-white/60 hover:bg-navy/10'
          }`}
        >
          女声
        </button>
        <button
          onClick={() => setVoiceRange('male')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            voiceRange === 'male'
              ? 'bg-amber text-navy shadow-md'
              : 'bg-navy/5 dark:bg-white/5 text-navy/60 dark:text-white/60 hover:bg-navy/10'
          }`}
        >
          男声
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索音阶..."
            className="w-full px-3 py-2 rounded-lg border border-navy/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:border-amber"
          />
          <div className="max-h-64 overflow-y-auto space-y-3">
            {Object.entries(categories).map(([cat, scales]) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-navy/40 dark:text-white/40 uppercase tracking-wider mb-1">
                  {cat}
                </p>
                <div className="space-y-1">
                  {scales.map((scale) => (
                    <button
                      key={scale.id}
                      onClick={() => { setSelectedScale(scale); setIsExpanded(false) }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        selectedScale?.id === scale.id
                          ? 'bg-teal/15 text-teal font-medium'
                          : 'hover:bg-navy/5 dark:hover:bg-white/5 text-navy/70 dark:text-white/70'
                      }`}
                    >
                      {scale.name}
                      <span className="ml-2 text-xs opacity-50">
                        {scale.notes.map((n) => n.name).join(' → ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
