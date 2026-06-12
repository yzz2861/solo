import { useState, useMemo, type ComponentType } from 'react'
import {
  Star,
  StarOff,
  ChevronDown,
  ChevronRight,
  FileCheck,
  GraduationCap,
  Flame,
  Users,
  Wrench,
  AlertTriangle,
  AlertCircle,
  Info,
  Paperclip,
} from 'lucide-react'
import { useAuditStore } from '@/store/auditStore'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  STATUS_LABELS,
  STATUS_COLORS,
  ALERT_TYPE_LABELS,
} from '@/types'
import type { AuditCategory, AuditChecklistItem } from '@/types'
import StatusTag from '@/components/StatusTag'

const CATEGORY_ICON_MAP: Record<AuditCategory, ComponentType<{ className?: string }>> = {
  license: FileCheck,
  training: GraduationCap,
  fire_safety: Flame,
  employee: Users,
  rectification: Wrench,
}

type SortMode = 'default' | 'status' | 'starred'

const STATUS_SORT_ORDER: Record<string, number> = {
  missing: 0,
  expired: 1,
  needs_update: 2,
  existing: 3,
}

const ALERT_SEVERITY_CONFIG: Record<
  string,
  { icon: ComponentType<{ className?: string }>; color: string }
> = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  info: {
    icon: Info,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

export default function Checklist() {
  const { session, toggleStarred, updateItemExpiry, updateItemPages } = useAuditStore()
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | 'all'>('all')
  const [showStarredOnly, setShowStarredOnly] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('default')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredAndSortedItems = useMemo(() => {
    let items = [...session.checklist]

    if (categoryFilter !== 'all') {
      items = items.filter((item) => item.category === categoryFilter)
    }

    if (showStarredOnly) {
      items = items.filter((item) => item.starred)
    }

    if (session.auditDayMode) {
      items.sort((a, b) => {
        const aPriority =
          a.starred && (a.status === 'missing' || a.status === 'expired') ? 0 : 1
        const bPriority =
          b.starred && (b.status === 'missing' || b.status === 'expired') ? 0 : 1
        return aPriority - bPriority
      })
    } else if (sortMode === 'status') {
      items.sort(
        (a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]
      )
    } else if (sortMode === 'starred') {
      items.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0))
    }

    return items
  }, [session.checklist, categoryFilter, showStarredOnly, sortMode, session.auditDayMode])

  const groupedItems = useMemo(() => {
    const groups: Record<string, AuditChecklistItem[]> = {}
    for (const category of CATEGORY_ORDER) {
      const categoryItems = filteredAndSortedItems.filter(
        (item) => item.category === category
      )
      if (categoryItems.length > 0) {
        groups[category] = categoryItems
      }
    }
    return groups
  }, [filteredAndSortedItems])

  const getCategorySummary = (items: AuditChecklistItem[]) => {
    const existing = items.filter((i) => i.status === 'existing').length
    return `${existing}/${items.length} 已就绪`
  }

  return (
    <div className="min-h-screen bg-[#1C1C1E] text-[#FAFAFA]">
      <div className="sticky top-0 z-10 bg-[#1C1C1E] border-b border-[#3F3F46] px-4 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-amber-500 text-black'
                : 'bg-[#3F3F46] text-[#FAFAFA]/70 hover:text-[#FAFAFA]'
            }`}
          >
            全部
          </button>
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#3F3F46] text-[#FAFAFA]/70 hover:text-[#FAFAFA]'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setShowStarredOnly(!showStarredOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              showStarredOnly
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-[#3F3F46] text-[#FAFAFA]/70 hover:text-[#FAFAFA]'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            仅星标
          </button>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            disabled={session.auditDayMode}
            className="bg-[#3F3F46] text-[#FAFAFA]/70 text-sm rounded-md px-3 py-1.5 border-none outline-none disabled:opacity-50"
          >
            <option value="default">默认排序</option>
            <option value="status">按状态（缺失优先）</option>
            <option value="starred">星标优先</option>
          </select>
          {session.auditDayMode && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
              <AlertTriangle className="w-3 h-3" />
              验厂日模式
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="flex items-center justify-center py-20 text-[#FAFAFA]/40 text-sm">
            没有匹配的清单项
          </div>
        ) : (
          Object.entries(groupedItems).map(([category, items]) => {
            const Icon = CATEGORY_ICON_MAP[category as AuditCategory]
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5 text-amber-500" />
                  <h2 className="text-base font-bold text-[#FAFAFA]">
                    {CATEGORY_LABELS[category as AuditCategory]}
                  </h2>
                  <span className="text-xs text-[#FAFAFA]/50">
                    {getCategorySummary(items)}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#3F3F46] rounded-lg overflow-hidden"
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button
                          onClick={() => toggleStarred(item.id)}
                          className="shrink-0"
                        >
                          {item.starred ? (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          ) : (
                            <StarOff className="w-4 h-4 text-[#FAFAFA]/30" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-[#FAFAFA] truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-[#FAFAFA]/50 truncate">
                            {item.description}
                          </div>
                        </div>
                        <StatusTag status={item.status} />
                        {item.matchedFiles.length > 0 && (
                          <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-medium">
                            <Paperclip className="w-3 h-3" />
                            {item.matchedFiles.length}
                          </span>
                        )}
                        <button
                          onClick={() => toggleExpanded(item.id)}
                          className="shrink-0 text-[#FAFAFA]/40 hover:text-[#FAFAFA]/70 transition-colors"
                        >
                          {expandedItems.has(item.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {expandedItems.has(item.id) && (
                        <div className="border-t border-[#FAFAFA]/10 px-4 py-3 space-y-3">
                          {item.matchedFiles.length > 0 && (
                            <div>
                              <div className="text-xs text-[#FAFAFA]/40 mb-1.5">
                                匹配文件
                              </div>
                              <div className="space-y-1">
                                {item.matchedFiles.map((file, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 text-xs text-[#FAFAFA]/70"
                                  >
                                    <Paperclip className="w-3 h-3 text-[#FAFAFA]/40 shrink-0" />
                                    <span className="flex-1 truncate">{file.name}</span>
                                    <span className="text-[#FAFAFA]/30 shrink-0">
                                      {formatDate(file.lastModified)}
                                    </span>
                                    <span className="text-[#FAFAFA]/30 shrink-0">
                                      {formatFileSize(file.size)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.alerts.length > 0 && (
                            <div>
                              <div className="text-xs text-[#FAFAFA]/40 mb-1.5">
                                预警
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {item.alerts.map((alert) => {
                                  const config = ALERT_SEVERITY_CONFIG[alert.severity]
                                  const AlertIcon = config.icon
                                  return (
                                    <span
                                      key={alert.id}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${config.color}`}
                                    >
                                      <AlertIcon className="w-3 h-3" />
                                      {ALERT_TYPE_LABELS[alert.type]}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-4">
                            {item.expiryDate !== undefined && (
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-[#FAFAFA]/40">
                                  有效期至
                                </label>
                                <input
                                  type="date"
                                  value={item.expiryDate || ''}
                                  onChange={(e) =>
                                    updateItemExpiry(item.id, e.target.value)
                                  }
                                  className="bg-[#1C1C1E] text-[#FAFAFA] text-xs rounded px-2 py-1 border border-[#FAFAFA]/10 outline-none focus:border-amber-500/50"
                                />
                              </div>
                            )}
                            {item.expectedPages !== undefined && (
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-[#FAFAFA]/40">
                                  实际页数（期望 {item.expectedPages}）
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={item.actualPages ?? ''}
                                  onChange={(e) =>
                                    updateItemPages(
                                      item.id,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="bg-[#1C1C1E] text-[#FAFAFA] text-xs rounded px-2 py-1 w-20 border border-[#FAFAFA]/10 outline-none focus:border-amber-500/50"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
