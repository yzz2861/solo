import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import {
  X,
  Play,
  Star,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Wrench,
  FileVideo,
  Clock,
  CheckCircle,
  Circle,
  FolderOpen,
  Info
} from 'lucide-react'
import Modal from '@/components/Modal'
import VideoPlayer from '@/components/VideoPlayer'
import type { VideoSegment, DamageSpot, RepairRequest, Tape } from '@/types'
import {
  formatDateShort,
  TAPE_STATUS_LABELS,
  TAPE_STATUS_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  OUTPUT_FORMAT_LABELS,
  DELIVERY_MEDIUM_LABELS,
  parseTimeToSeconds
} from '@/utils'

interface Props {
  tapeId: string
  onClose: () => void
}

type TabType = 'info' | 'segments' | 'damage' | 'repair'

export default function TapeDetailPanel({ tapeId, onClose }: Props) {
  const { getTape, getCustomer, toggleStarSegment } = useAppStore()
  const tape = getTape(tapeId)
  const customer = tape ? getCustomer(tape.customerId) : null
  const [activeTab, setActiveTab] = useState<TabType>('info')
  const [showPlayer, setShowPlayer] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [pathValid, setPathValid] = useState<boolean | null>(null)

  useEffect(() => {
    if (tape?.videoFilePath) {
      window.electronAPI.checkFileExists(tape.videoFilePath).then(setPathValid)
    }
  }, [tape?.videoFilePath])

  if (!tape) {
    return (
      <div className="w-96 bg-white border-l border-gray-200 p-6 text-center text-gray-400">
        磁带不存在
      </div>
    )
  }

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'info', label: '基本信息', icon: Info },
    { key: 'segments', label: '片段标记', icon: FileVideo },
    { key: 'damage', label: '损坏位置', icon: AlertTriangle },
    { key: 'repair', label: '修复要求', icon: Wrench }
  ]

  const handleJumpToSegment = (segment: VideoSegment) => {
    setCurrentTime(parseTimeToSeconds(segment.timeStart))
    setShowPlayer(true)
  }

  return (
    <>
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">{tape.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {tape.tapeNumber} · {customer?.name || '未知客户'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'text-primary-600 border-primary-500'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {activeTab === 'info' && <InfoTab tape={tape} customerName={customer?.name} pathValid={pathValid} />}
          {activeTab === 'segments' && (
            <SegmentsTab
              tape={tape}
              onJump={handleJumpToSegment}
              onToggleStar={(segId) => toggleStarSegment(tapeId, segId)}
            />
          )}
          {activeTab === 'damage' && <DamageTab tapeId={tapeId} damageSpots={tape.damageSpots} />}
          {activeTab === 'repair' && (
            <RepairTab tapeId={tapeId} repairRequests={tape.repairRequests} />
          )}
        </div>

        {tape.videoFilePath && pathValid && (
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={() => setShowPlayer(true)}
              className="w-full btn-primary btn-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              播放预览
            </button>
          </div>
        )}
      </div>

      {showPlayer && tape.videoFilePath && (
        <VideoPlayer
          src={tape.videoFilePath}
          initialTime={currentTime}
          segments={tape.segments}
          onClose={() => setShowPlayer(false)}
        />
      )}
    </>
  )
}

function InfoTab({ tape, customerName, pathValid }: { tape: Tape; customerName?: string; pathValid: boolean | null }) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className={`tag ${TAPE_STATUS_COLORS[tape.status]}`}>
          {TAPE_STATUS_LABELS[tape.status]}
        </span>
        {tape.formatConfirmed ? (
          <span className="tag bg-green-100 text-green-700">格式已确认</span>
        ) : (
          <span className="tag bg-yellow-100 text-yellow-700">格式待确认</span>
        )}
        {tape.delivered && <span className="tag bg-blue-100 text-blue-700">已交付</span>}
      </div>

      <div className="space-y-3 text-sm">
        <InfoRow label="客户" value={customerName || '未知'} />
        <InfoRow label="磁带编号" value={tape.tapeNumber} />
        <InfoRow label="磁带类型" value={tape.tapeType || '未设置'} />
        <InfoRow label="时长" value={tape.duration || '未设置'} />
        <InfoRow label="输出格式" value={OUTPUT_FORMAT_LABELS[tape.outputFormat]} />
        <InfoRow label="交付介质" value={DELIVERY_MEDIUM_LABELS[tape.deliveryMedium]} />
        {tape.deliveryNotes && <InfoRow label="交付说明" value={tape.deliveryNotes} />}
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5">转录文件路径</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-gray-50 px-2 py-1.5 rounded truncate text-gray-600">
            {tape.videoFilePath || '未设置'}
          </code>
          {tape.videoFilePath && (
            <button
              onClick={() => window.electronAPI.openInFolder(tape.videoFilePath)}
              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
              title="在文件夹中显示"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          )}
        </div>
        {pathValid === false && (
          <p className="text-xs text-red-500 mt-1">⚠️ 文件路径已失效</p>
        )}
      </div>

      {tape.status === 'transcribing' && (
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>转录进度</span>
            <span>{tape.transcriptionProgress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all"
              style={{ width: `${tape.transcriptionProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {tape.notes && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">备注</p>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{tape.notes}</p>
        </div>
      )}

      <div className="text-xs text-gray-400 pt-2 border-t border-gray-50">
        <p>创建：{formatDateShort(tape.createdAt)}</p>
        <p className="mt-1">更新：{formatDateShort(tape.updatedAt)}</p>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  )
}

function SegmentsTab({
  tape,
  onJump,
  onToggleStar
}: {
  tape: Tape
  onJump: (seg: VideoSegment) => void
  onToggleStar: (segId: string) => void
}) {
  const { addSegment, updateSegment, deleteSegment } = useAppStore()
  const [showModal, setShowModal] = useState(false)
  const [editingSeg, setEditingSeg] = useState<VideoSegment | null>(null)

  const sortedSegments = [...tape.segments].sort((a, b) => a.orderIndex - b.orderIndex)

  const handleSubmit = (data: any) => {
    if (editingSeg) {
      updateSegment(tape.id, editingSeg.id, data)
    } else {
      addSegment(tape.id, {
        ...data,
        orderIndex: sortedSegments.length
      })
    }
    setShowModal(false)
    setEditingSeg(null)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />
      case 'processing':
        return <Clock className="w-3.5 h-3.5 text-blue-500" />
      default:
        return <Circle className="w-3.5 h-3.5 text-gray-300" />
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">
          共 {tape.segments.length} 个片段
        </span>
        <button
          onClick={() => {
            setEditingSeg(null)
            setShowModal(true)
          }}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          添加片段
        </button>
      </div>

      {sortedSegments.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          <FileVideo className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>暂无片段标记</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedSegments.map((seg, idx) => (
            <div
              key={seg.id}
              className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(seg.status)}
                    <span className="font-medium text-gray-800 text-sm">{seg.name}</span>
                    <span className="text-xs text-gray-400">#{idx + 1}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {seg.timeStart} - {seg.timeEnd}
                  </p>
                  {seg.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{seg.description}</p>
                  )}
                  {seg.category && (
                    <span className="tag bg-primary-50 text-primary-600 mt-1">
                      {seg.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onToggleStar(seg.id)}
                    className={`p-1 rounded ${seg.starred ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}
                    title={seg.starred ? '取消标星' : '标星（珍贵画面）'}
                  >
                    <Star className={`w-4 h-4 ${seg.starred ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => onJump(seg)}
                    className="p-1 text-gray-400 hover:text-primary-600 rounded"
                    title="跳转播放"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingSeg(seg)
                      setShowModal(true)
                    }}
                    className="p-1 text-gray-400 hover:text-primary-600 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`确定删除片段「${seg.name}」吗？`)) {
                        deleteSegment(tape.id, seg.id)
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <SegmentFormModal
          segment={editingSeg}
          onClose={() => {
            setShowModal(false)
            setEditingSeg(null)
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}

function SegmentFormModal({
  segment,
  onClose,
  onSubmit
}: {
  segment: VideoSegment | null
  onClose: () => void
  onSubmit: (data: any) => void
}) {
  const [form, setForm] = useState({
    name: segment?.name || '',
    description: segment?.description || '',
    timeStart: segment?.timeStart || '00:00:00',
    timeEnd: segment?.timeEnd || '00:01:00',
    starred: segment?.starred || false,
    status: segment?.status || 'pending',
    category: segment?.category || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      alert('请输入片段名称')
      return
    }
    onSubmit(form)
  }

  return (
    <Modal title={segment ? '编辑片段' : '添加片段'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            片段名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-field"
            placeholder="如：入场仪式"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
            <input
              type="text"
              value={form.timeStart}
              onChange={(e) => setForm({ ...form, timeStart: e.target.value })}
              className="input-field"
              placeholder="HH:MM:SS"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
            <input
              type="text"
              value={form.timeEnd}
              onChange={(e) => setForm({ ...form, timeEnd: e.target.value })}
              className="input-field"
              placeholder="HH:MM:SS"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="input-field"
            placeholder="如：婚礼、生日、旅行"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field h-20 resize-none"
            placeholder="片段描述（选填）"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              className="input-field"
            >
              <option value="pending">待处理</option>
              <option value="processing">处理中</option>
              <option value="done">已完成</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={form.starred}
                onChange={(e) => setForm({ ...form, starred: e.target.checked })}
                className="w-4 h-4 text-yellow-500 rounded"
              />
              <span className="text-sm text-gray-700">标星（珍贵画面）</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">
            取消
          </button>
          <button type="submit" className="btn-primary btn-sm">
            {segment ? '保存修改' : '添加片段'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function DamageTab({ tapeId, damageSpots }: { tapeId: string; damageSpots: DamageSpot[] }) {
  const { addDamageSpot, updateDamageSpot, deleteDamageSpot } = useAppStore()
  const [showModal, setShowModal] = useState(false)
  const [editingDmg, setEditingDmg] = useState<DamageSpot | null>(null)

  const handleSubmit = (data: any) => {
    if (editingDmg) {
      updateDamageSpot(tapeId, editingDmg.id, data)
    } else {
      addDamageSpot(tapeId, data)
    }
    setShowModal(false)
    setEditingDmg(null)
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">
          共 {damageSpots.length} 处损坏
        </span>
        <button
          onClick={() => {
            setEditingDmg(null)
            setShowModal(true)
          }}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          添加损坏
        </button>
      </div>

      {damageSpots.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>暂无损坏记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {damageSpots.map((dmg) => (
            <div key={dmg.id} className="p-3 bg-gray-50 rounded-lg group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`tag ${SEVERITY_COLORS[dmg.severity]}`}>
                      {SEVERITY_LABELS[dmg.severity]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {dmg.timeStart} - {dmg.timeEnd}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1.5">{dmg.description}</p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingDmg(dmg)
                      setShowModal(true)
                    }}
                    className="p-1 text-gray-400 hover:text-primary-600 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('确定删除此损坏记录吗？')) {
                        deleteDamageSpot(tapeId, dmg.id)
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <DamageFormModal
          damage={editingDmg}
          onClose={() => {
            setShowModal(false)
            setEditingDmg(null)
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}

function DamageFormModal({
  damage,
  onClose,
  onSubmit
}: {
  damage: DamageSpot | null
  onClose: () => void
  onSubmit: (data: any) => void
}) {
  const [form, setForm] = useState({
    timeStart: damage?.timeStart || '00:00:00',
    timeEnd: damage?.timeEnd || '00:00:10',
    description: damage?.description || '',
    severity: damage?.severity || 'moderate'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) {
      alert('请输入损坏描述')
      return
    }
    onSubmit(form)
  }

  return (
    <Modal title={damage ? '编辑损坏记录' : '添加损坏记录'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
            <input
              type="text"
              value={form.timeStart}
              onChange={(e) => setForm({ ...form, timeStart: e.target.value })}
              className="input-field"
              placeholder="HH:MM:SS"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
            <input
              type="text"
              value={form.timeEnd}
              onChange={(e) => setForm({ ...form, timeEnd: e.target.value })}
              className="input-field"
              placeholder="HH:MM:SS"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">严重程度</label>
          <div className="flex gap-3">
            {(['mild', 'moderate', 'severe'] as const).map((s) => (
              <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="severity"
                  value={s}
                  checked={form.severity === s}
                  onChange={(e) => setForm({ ...form, severity: e.target.value as any })}
                  className="w-4 h-4"
                />
                <span className={`tag ${SEVERITY_COLORS[s]}`}>{SEVERITY_LABELS[s]}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            损坏描述 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field h-24 resize-none"
            placeholder="描述损坏情况，如：画面雪花、声音失真、磁粉脱落等"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">
            取消
          </button>
          <button type="submit" className="btn-primary btn-sm">
            {damage ? '保存修改' : '添加记录'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function RepairTab({ tapeId, repairRequests }: { tapeId: string; repairRequests: RepairRequest[] }) {
  const { addRepairRequest, updateRepairRequest, deleteRepairRequest } = useAppStore()
  const [showModal, setShowModal] = useState(false)
  const [editingReq, setEditingReq] = useState<RepairRequest | null>(null)

  const handleSubmit = (data: any) => {
    if (editingReq) {
      updateRepairRequest(tapeId, editingReq.id, data)
    } else {
      addRepairRequest(tapeId, data)
    }
    setShowModal(false)
    setEditingReq(null)
  }

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700'
  }

  const priorityLabels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高'
  }

  const statusLabels: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    done: '已完成'
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">
          共 {repairRequests.length} 项修复要求
        </span>
        <button
          onClick={() => {
            setEditingReq(null)
            setShowModal(true)
          }}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          添加要求
        </button>
      </div>

      {repairRequests.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>暂无修复要求</p>
        </div>
      ) : (
        <div className="space-y-2">
          {repairRequests.map((req) => (
            <div key={req.id} className="p-3 bg-gray-50 rounded-lg group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`tag ${priorityColors[req.priority]}`}>
                      优先级：{priorityLabels[req.priority]}
                    </span>
                    <span className="tag bg-blue-50 text-blue-600">
                      {statusLabels[req.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1.5">{req.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    创建于 {formatDateShort(req.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingReq(req)
                      setShowModal(true)
                    }}
                    className="p-1 text-gray-400 hover:text-primary-600 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('确定删除此修复要求吗？')) {
                        deleteRepairRequest(tapeId, req.id)
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <RepairFormModal
          request={editingReq}
          onClose={() => {
            setShowModal(false)
            setEditingReq(null)
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}

function RepairFormModal({
  request,
  onClose,
  onSubmit
}: {
  request: RepairRequest | null
  onClose: () => void
  onSubmit: (data: any) => void
}) {
  const [form, setForm] = useState({
    description: request?.description || '',
    priority: request?.priority || 'medium',
    status: request?.status || 'pending'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) {
      alert('请输入修复要求描述')
      return
    }
    onSubmit(form)
  }

  return (
    <Modal title={request ? '编辑修复要求' : '添加修复要求'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            修复要求 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field h-24 resize-none"
            placeholder="描述具体的修复要求，如：去除雪花噪点、修复声音、色彩校正等"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
          <div className="flex gap-3">
            {(['low', 'medium', 'high'] as const).map((p) => (
              <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  value={p}
                  checked={form.priority === p}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  {p === 'low' ? '低' : p === 'medium' ? '中' : '高'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as any })}
            className="input-field"
          >
            <option value="pending">待处理</option>
            <option value="in_progress">进行中</option>
            <option value="done">已完成</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">
            取消
          </button>
          <button type="submit" className="btn-primary btn-sm">
            {request ? '保存修改' : '添加要求'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
