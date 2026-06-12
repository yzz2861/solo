import { useNavigate } from 'react-router-dom'
import { ScanSearch, Store, AlertTriangle, Image, AlertCircle, Clock } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import {
  type IssueType,
  ISSUE_TYPE_LABELS,
  ISSUE_TYPE_COLORS,
  CONFIDENCE_COLORS,
  getConfidenceLevel,
} from '@/types'

const ISSUE_FILTERS: { value: IssueType | null; label: string }[] = [
  { value: null, label: '全部' },
  { value: 'MISSING_PRICE', label: '缺价签' },
  { value: 'WRONG_PRICE', label: '错价签' },
  { value: 'INSUFFICIENT_SHELF', label: '排面不足' },
  { value: 'COMPETITOR_MIX', label: '竞品混放' },
  { value: 'DISPLAY_BLOCKED', label: '堆头遮挡' },
]

const QUALITY_LABELS: Record<string, string> = {
  BLURRY: '模糊',
  GLARE: '反光',
  OCCLUDED: '遮挡',
  MULTI_ANGLE: '多角度',
}

const CONFIDENCE_LABELS: Record<string, string> = {
  HIGH: '高置信',
  MEDIUM: '中置信',
  LOW: '低置信',
}

export default function RecognitionResults() {
  const navigate = useNavigate()
  const photos = useAppStore((s) => s.photos)
  const stores = useAppStore((s) => s.stores)
  const annotations = useAppStore((s) => s.annotations)
  const selectedStoreFilter = useAppStore((s) => s.selectedStoreFilter)
  const selectedIssueFilter = useAppStore((s) => s.selectedIssueFilter)
  const setSelectedStoreFilter = useAppStore((s) => s.setSelectedStoreFilter)
  const setSelectedIssueFilter = useAppStore((s) => s.setSelectedIssueFilter)

  const filtered = photos.filter((p) => {
    if (selectedStoreFilter && p.storeId !== selectedStoreFilter) return false
    if (selectedIssueFilter && !p.issueTypes.includes(selectedIssueFilter as IssueType)) return false
    return true
  })

  const issuePhotos = filtered.filter((p) => p.hasIssues)
  const highConfIssues = annotations.filter(
    (a) => a.confidenceLevel === 'HIGH' && filtered.some((p) => p.id === a.photoId)
  )
  const pendingItems = annotations.filter(
    (a) => a.status === 'PENDING' && filtered.some((p) => p.id === a.photoId)
  )

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <ScanSearch className="w-5 h-5 text-accent" />
          识别结果
        </h1>
        <p className="text-sm text-gray-400 mt-1">AI 已完成陈列问题识别，请查看并确认</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {ISSUE_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setSelectedIssueFilter(f.value)}
              className={`btn-secondary text-xs px-3 py-1.5 rounded-full transition-all ${
                selectedIssueFilter === f.value
                  ? 'bg-accent text-white border-accent'
                  : 'text-gray-400 border-brand-600 hover:text-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <select
            value={selectedStoreFilter ?? ''}
            onChange={(e) => setSelectedStoreFilter(e.target.value || null)}
            className="bg-brand-700 border border-brand-600 text-gray-200 text-xs rounded-lg pl-9 pr-8 py-2 appearance-none cursor-pointer focus:outline-none focus:border-accent/50"
          >
            <option value="">全部门店</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '总照片数', value: filtered.length, icon: Image, color: 'text-blue-400' },
          { label: '问题照片', value: issuePhotos.length, icon: AlertCircle, color: 'text-danger' },
          { label: '高置信问题', value: highConfIssues.length, icon: AlertTriangle, color: 'text-pass' },
          { label: '待复核项', value: pendingItems.length, icon: Clock, color: 'text-warn' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4 flex items-center gap-3">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{stat.label}</p>
              <p className="stat-value text-lg font-mono text-gray-100">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((photo) => {
          const level = getConfidenceLevel(photo.minConfidence)
          const levelColor = CONFIDENCE_COLORS[level]

          return (
            <div
              key={photo.id}
              onClick={() => navigate(`/review/${photo.id}`)}
              className="card overflow-hidden cursor-pointer group transition-all hover:ring-1 hover:ring-accent/30"
            >
              <div className="relative aspect-[4/3]">
                <img
                  src={photo.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {photo.hasIssues && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
                )}
                {photo.quality !== 'GOOD' && (
                  <span className="absolute top-2 left-2 flex items-center gap-1 bg-warn/90 text-brand-900 text-[10px] font-medium px-1.5 py-0.5 rounded">
                    <AlertTriangle className="w-3 h-3" />
                    {QUALITY_LABELS[photo.quality]}
                  </span>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 space-y-1">
                  <div className="flex flex-wrap gap-1">
                    {photo.issueTypes.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] text-white px-1.5 py-0.5 rounded-sm font-medium"
                        style={{ backgroundColor: ISSUE_TYPE_COLORS[t] }}
                      >
                        {ISSUE_TYPE_LABELS[t]}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: levelColor }}
                    />
                    <span className="text-[9px] text-gray-300">{CONFIDENCE_LABELS[level]}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-gray-500 text-sm">
          当前筛选条件下没有照片
        </div>
      )}
    </div>
  )
}
