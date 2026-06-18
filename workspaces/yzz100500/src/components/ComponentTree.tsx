import { useState, useMemo } from 'react'
import {
  ChevronsUpDown,
  ChevronRight,
  ChevronDown,
  Search,
  BoxSelect,
  Minus,
  Pilcrow,
  Layers,
  AlertTriangle,
  FileWarning,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import type { ComponentType, ComponentItem, Disease } from '@/types'

const TYPE_CONFIG: Record<
  Exclude<ComponentType, 'disease'>,
  { label: string; icon: React.ElementType }
> = {
  beam: { label: '梁', icon: BoxSelect },
  purlin: { label: '檩', icon: Minus },
  pillar: { label: '柱', icon: Pilcrow },
  dougong: { label: '斗拱', icon: Layers },
}

const SECTION_ORDER: Exclude<ComponentType, 'disease'>[] = [
  'beam',
  'purlin',
  'pillar',
  'dougong',
]

export default function ComponentTree() {
  const project = useStore((s) => s.project)
  const components = useStore((s) => s.components)
  const annotations = useStore((s) => s.annotations)
  const diseases = useStore((s) => s.diseases)
  const alerts = useStore((s) => s.alerts)
  const selectedComponentId = useStore((s) => s.selectedComponentId)
  const setSelectedComponentId = useStore((s) => s.setSelectedComponentId)
  const setSelectedAnnotationId = useStore((s) => s.setSelectedAnnotationId)
  const setRightPanelTab = useStore((s) => s.setRightPanelTab)

  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const grouped = useMemo(() => {
    const map: Record<string, ComponentItem[]> = {}
    for (const type of SECTION_ORDER) {
      map[type] = []
    }
    const q = search.trim().toLowerCase()
    for (const comp of components) {
      if (comp.type === 'disease') continue
      if (q && !comp.name.toLowerCase().includes(q) && !comp.code.toLowerCase().includes(q)) {
        continue
      }
      if (map[comp.type]) {
        map[comp.type].push(comp)
      }
    }
    return map
  }, [components, search])

  const diseasesByComponent = useMemo(() => {
    const map: Record<string, Disease[]> = {}
    for (const d of diseases) {
      if (!map[d.componentId]) map[d.componentId] = []
      map[d.componentId].push(d)
    }
    return map
  }, [diseases])

  const unresolvedAlerts = useMemo(
    () => alerts.filter((a) => !a.resolved).length,
    [alerts]
  )

  const toggleSection = (type: string) =>
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }))

  const handleSelect = (comp: ComponentItem) => {
    setSelectedComponentId(comp.id)
    const matching = annotations.find((a) => a.componentId === comp.id)
    setSelectedAnnotationId(matching?.id ?? null)
    setRightPanelTab('info')
  }

  const handleSelectDisease = (disease: Disease) => {
    setSelectedComponentId(disease.componentId)
    const matching = annotations.find((a) => a.componentId === disease.componentId)
    setSelectedAnnotationId(matching?.id ?? null)
    setRightPanelTab('disease')
  }

  return (
    <div className="glass-panel w-72 h-full flex flex-col text-ink-100">
      <div className="p-4 border-b border-sandalwood-700/30">
        {project && (
          <div>
            <h2 className="text-base font-serif font-semibold text-sandalwood-200 truncate">
              {project.name}
            </h2>
            <p className="text-xs text-ink-400 mt-1 line-clamp-2">{project.description}</p>
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-b border-sandalwood-700/30">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索构件..."
            className="w-full pl-7 pr-3 py-1.5 rounded bg-ink-800/50 border border-ink-600/40 text-xs text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-sandalwood-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {SECTION_ORDER.map((type) => {
          const config = TYPE_CONFIG[type]
          const items = grouped[type] ?? []
          const isCollapsed = collapsed[type] ?? false
          const Icon = config.icon

          return (
            <div key={type}>
              <button
                onClick={() => toggleSection(type)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-sandalwood-800/30 text-xs font-medium text-sandalwood-300 transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <Icon className="w-3.5 h-3.5" />
                <span>{config.label}</span>
                <span className="ml-auto text-ink-500 text-[10px]">{items.length}</span>
              </button>

              {!isCollapsed && (
                <div className="pb-1">
                  {items.map((comp) => {
                    const isSelected = selectedComponentId === comp.id
                    const compDiseases = diseasesByComponent[comp.id] ?? []
                    const hasNoCode = !comp.code || comp.code.trim() === ''

                    return (
                      <div key={comp.id}>
                        <button
                          onClick={() => handleSelect(comp)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 pl-8 py-1.5 text-xs transition-colors',
                            isSelected
                              ? 'bg-sandalwood-700 text-sandalwood-50'
                              : 'hover:bg-sandalwood-800/20 text-ink-200'
                          )}
                        >
                          <Icon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{comp.name}</span>
                          {hasNoCode ? (
                            <span className="ml-auto shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-cinnabar-500/20 text-cinnabar-300">
                              <FileWarning className="w-2.5 h-2.5" />
                              缺编号
                            </span>
                          ) : (
                            <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-ink-700/60 text-ink-300">
                              {comp.code}
                            </span>
                          )}
                        </button>

                        {isSelected && compDiseases.length > 0 && (
                          <div className="pl-12">
                            {compDiseases.map((d) => (
                              <button
                                key={d.id}
                                onClick={() => handleSelectDisease(d)}
                                className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] text-cinnabar-300 hover:bg-cinnabar-500/10 transition-colors"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{d.type}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {items.length === 0 && (
                    <div className="px-8 py-2 text-[10px] text-ink-500">暂无构件</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t border-sandalwood-700/30 px-3 py-2.5 flex items-center gap-3 text-[10px] text-ink-400">
        <span>
          构件 <strong className="text-ink-200">{components.filter((c) => c.type !== 'disease').length}</strong>
        </span>
        <span className="text-ink-600">|</span>
        <span>
          病害 <strong className="text-cinnabar-300">{diseases.length}</strong>
        </span>
        <span className="text-ink-600">|</span>
        <span>
          告警 <strong className={cn(unresolvedAlerts > 0 && 'text-cinnabar-400')}>{unresolvedAlerts}</strong>
        </span>
      </div>
    </div>
  )
}
