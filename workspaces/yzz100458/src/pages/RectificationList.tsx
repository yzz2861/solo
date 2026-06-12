import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ClipboardCheck, Store, ArrowRight, RotateCcw } from 'lucide-react'
import { RECTIFICATION_STATUS_LABELS, ISSUE_TYPE_LABELS, ISSUE_TYPE_COLORS } from '@/types'
import type { RectificationStatus, IssueType } from '@/types'

const STATUS_TABS: { key: RectificationStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: '全部' },
  { key: 'PENDING', label: '待整改' },
  { key: 'IN_PROGRESS', label: '整改中' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'REJECTED', label: '退回整改' },
]

const STATUS_COLORS: Record<RectificationStatus, string> = {
  PENDING: 'bg-warn/20 text-warn-light',
  IN_PROGRESS: 'bg-accent/20 text-accent-light',
  COMPLETED: 'bg-pass/20 text-pass-light',
  REJECTED: 'bg-danger/20 text-danger-light',
}

export default function RectificationList() {
  const stores = useAppStore((s) => s.stores)
  const rectificationItems = useAppStore((s) => s.rectificationItems)
  const updateRectificationStatus = useAppStore((s) => s.updateRectificationStatus)

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<RectificationStatus | 'ALL'>('ALL')

  const filtered = rectificationItems.filter((item) => {
    if (selectedStoreId && item.storeId !== selectedStoreId) return false
    if (activeTab !== 'ALL' && item.status !== activeTab) return false
    return true
  })

  const storeItems = selectedStoreId
    ? rectificationItems.filter((r) => r.storeId === selectedStoreId)
    : rectificationItems

  const completedCount = storeItems.filter((r) => r.status === 'COMPLETED').length
  const totalCount = storeItems.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="flex h-full animate-fade-in">
      <aside className="w-64 flex-shrink-0 bg-surface-card border-r border-brand-700/40 p-4 space-y-2 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-gray-300">门店筛选</span>
        </div>
        <button
          onClick={() => setSelectedStoreId(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            !selectedStoreId ? 'bg-accent/15 text-accent border border-accent/20' : 'text-gray-400 hover:bg-surface-hover'
          }`}
        >
          全部门店
        </button>
        {stores.map((store) => (
          <button
            key={store.id}
            onClick={() => setSelectedStoreId(store.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedStoreId === store.id ? 'bg-accent/15 text-accent border border-accent/20' : 'text-gray-400 hover:bg-surface-hover'
            }`}
          >
            {store.name}
          </button>
        ))}
      </aside>

      <div className="flex-1 p-6 space-y-5 overflow-y-auto">
        <div>
          <h1 className="section-title">整改清单</h1>
          <p className="text-sm text-gray-400 mt-1">按门店跟踪陈列问题整改进度</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">整体完成进度</span>
            <span className="text-sm font-mono text-pass">{completedCount}/{totalCount}</span>
          </div>
          <div className="w-full h-3 bg-brand-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-pass rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5 font-mono">{progressPct}%</p>
        </div>

        <div className="flex gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-accent text-white'
                  : 'bg-surface-light text-gray-400 hover:text-gray-200 hover:bg-surface-lighter'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="card p-8 text-center text-gray-500">
              <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">暂无整改项</p>
            </div>
          )}
          {filtered.map((item) => (
            <div key={item.id} className="card p-4 flex gap-4">
              <img src={item.photoUrl} alt="" className="w-24 h-18 object-cover rounded-lg flex-shrink-0 border border-brand-700/30" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="badge text-[11px]"
                    style={{ backgroundColor: ISSUE_TYPE_COLORS[item.issueType as IssueType] + '30', color: ISSUE_TYPE_COLORS[item.issueType as IssueType] }}
                  >
                    {ISSUE_TYPE_LABELS[item.issueType as IssueType]}
                  </span>
                  <span className={`badge ${STATUS_COLORS[item.status]}`}>
                    {RECTIFICATION_STATUS_LABELS[item.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-200">{item.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{item.storeName}</span>
                  <span className="font-mono">截止: {item.deadline}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 justify-center flex-shrink-0">
                {item.status === 'PENDING' && (
                  <button onClick={() => updateRectificationStatus(item.id, 'IN_PROGRESS')} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                    <ArrowRight className="w-3.5 h-3.5" />
                    标记整改中
                  </button>
                )}
                {item.status === 'IN_PROGRESS' && (
                  <button onClick={() => updateRectificationStatus(item.id, 'COMPLETED')} className="btn-pass text-xs px-3 py-1.5">
                    标记完成
                  </button>
                )}
                {(item.status === 'COMPLETED' || item.status === 'REJECTED') && (
                  <button onClick={() => updateRectificationStatus(item.id, 'PENDING')} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" />
                    退回整改
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
