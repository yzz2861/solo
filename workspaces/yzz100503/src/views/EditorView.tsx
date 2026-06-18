import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import {
  Scissors,
  Star,
  CheckCircle,
  Clock,
  Circle,
  Play,
  Video,
  AlertTriangle,
  Wrench,
  ChevronRight
} from 'lucide-react'
import VideoPlayer from '@/components/VideoPlayer'
import type { VideoSegment, Tape } from '@/types'
import { TAPE_STATUS_LABELS, TAPE_STATUS_COLORS, parseTimeToSeconds } from '@/utils'

export default function EditorView() {
  const { getPendingSegments, getStarredSegments, tapes, toggleStarSegment, updateSegment } =
    useAppStore()
  const [activeTab, setActiveTab] = useState<'pending' | 'starred' | 'damage' | 'repair'>('pending')
  const [selectedTapeId, setSelectedTapeId] = useState<string | null>(null)
  const [playerSrc, setPlayerSrc] = useState<string | null>(null)
  const [playerTime, setPlayerTime] = useState(0)
  const [playerSegments, setPlayerSegments] = useState<VideoSegment[]>([])

  const pendingSegments = getPendingSegments()
  const starredSegments = getStarredSegments()

  const tapesWithDamage = tapes.filter((t) => t.damageSpots.length > 0)
  const tapesWithRepair = tapes.filter(
    (t) => t.repairRequests.some((r) => r.status !== 'done')
  )

  const handlePlaySegment = (tape: Tape, segment: VideoSegment) => {
    if (tape.videoFilePath) {
      setPlayerSrc(tape.videoFilePath)
      setPlayerTime(parseTimeToSeconds(segment.timeStart))
      setPlayerSegments(tape.segments)
    }
  }

  const handleSegmentStatusChange = (
    tapeId: string,
    segmentId: string,
    status: VideoSegment['status']
  ) => {
    updateSegment(tapeId, segmentId, { status })
  }

  const tabs = [
    { key: 'pending', label: '待处理片段', icon: Clock, count: pendingSegments.length },
    { key: 'starred', label: '标星片段', icon: Star, count: starredSegments.length },
    { key: 'damage', label: '损坏磁带', icon: AlertTriangle, count: tapesWithDamage.length },
    { key: 'repair', label: '修复需求', icon: Wrench, count: tapesWithRepair.length }
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 bg-white border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warm-400 to-warm-600 flex items-center justify-center">
            <Scissors className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">剪辑师工作台</h2>
            <p className="text-sm text-gray-500">管理待处理片段、修复标记和珍贵画面保护</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white border-r border-gray-100 flex flex-col">
          <div className="p-3 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{tab.label}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="px-3 py-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2 px-2">磁带快速跳转</p>
            <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-thin">
              {tapes.map((tape) => (
                <button
                  key={tape.id}
                  onClick={() => setSelectedTapeId(tape.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                    selectedTapeId === tape.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Video className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate flex-1">{tape.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {activeTab === 'pending' && (
            <PendingSegmentsPanel
              segments={pendingSegments}
              onPlay={handlePlaySegment}
              onToggleStar={(tapeId, segId) => toggleStarSegment(tapeId, segId)}
              onStatusChange={handleSegmentStatusChange}
            />
          )}

          {activeTab === 'starred' && (
            <StarredSegmentsPanel
              segments={starredSegments}
              onPlay={handlePlaySegment}
              onToggleStar={(tapeId, segId) => toggleStarSegment(tapeId, segId)}
            />
          )}

          {activeTab === 'damage' && <DamageTapesPanel tapes={tapesWithDamage} />}

          {activeTab === 'repair' && <RepairTapesPanel tapes={tapesWithRepair} />}
        </div>
      </div>

      {playerSrc && (
        <VideoPlayer
          src={playerSrc}
          initialTime={playerTime}
          segments={playerSegments}
          onClose={() => setPlayerSrc(null)}
        />
      )}
    </div>
  )
}

function PendingSegmentsPanel({
  segments,
  onPlay,
  onToggleStar,
  onStatusChange
}: {
  segments: { tape: Tape; segment: VideoSegment }[]
  onPlay: (tape: Tape, segment: VideoSegment) => void
  onToggleStar: (tapeId: string, segmentId: string) => void
  onStatusChange: (tapeId: string, segmentId: string, status: VideoSegment['status']) => void
}) {
  if (segments.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg">太棒了！所有片段都已处理完成</p>
        <p className="text-sm mt-1">添加新的片段标记后会出现在这里</p>
      </div>
    )
  }

  const groupedByTape = segments.reduce((acc, item) => {
    if (!acc[item.tape.id]) {
      acc[item.tape.id] = { tape: item.tape, segments: [] }
    }
    acc[item.tape.id].segments.push(item.segment)
    return acc
  }, {} as Record<string, { tape: Tape; segments: VideoSegment[] }>)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">待处理片段</h3>
        <p className="text-sm text-gray-500">共 {segments.length} 个片段需要处理</p>
      </div>

      {Object.values(groupedByTape).map(({ tape, segments: tapeSegments }) => (
        <div key={tape.id} className="card overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 text-primary-500" />
              <div>
                <h4 className="font-medium text-gray-800">{tape.title}</h4>
                <p className="text-xs text-gray-500">{tape.tapeNumber}</p>
              </div>
            </div>
            <span className={`tag ${TAPE_STATUS_COLORS[tape.status]}`}>
              {TAPE_STATUS_LABELS[tape.status]}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {tapeSegments.map((seg) => (
              <div
                key={seg.id}
                className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
              >
                <button
                  onClick={() => onStatusChange(tape.id, seg.id, seg.status === 'done' ? 'pending' : 'done')}
                  className="flex-shrink-0"
                >
                  {seg.status === 'done' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : seg.status === 'processing' ? (
                    <Clock className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 group-hover:text-gray-400" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{seg.name}</span>
                    {seg.starred && (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {seg.timeStart} - {seg.timeEnd}
                    {seg.description && ` · ${seg.description}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onToggleStar(tape.id, seg.id)}
                    className={`p-1.5 rounded ${
                      seg.starred
                        ? 'text-yellow-500 bg-yellow-50'
                        : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                    }`}
                    title={seg.starred ? '取消标星' : '标星（珍贵画面）'}
                  >
                    <Star className={`w-4 h-4 ${seg.starred ? 'fill-current' : ''}`} />
                  </button>
                  {tape.videoFilePath && (
                    <button
                      onClick={() => onPlay(tape, seg)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                      title="播放"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <select
                  value={seg.status}
                  onChange={(e) => onStatusChange(tape.id, seg.id, e.target.value as any)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                >
                  <option value="pending">待处理</option>
                  <option value="processing">处理中</option>
                  <option value="done">已完成</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function StarredSegmentsPanel({
  segments,
  onPlay,
  onToggleStar
}: {
  segments: { tape: Tape; segment: VideoSegment }[]
  onPlay: (tape: Tape, segment: VideoSegment) => void
  onToggleStar: (tapeId: string, segmentId: string) => void
}) {
  if (segments.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Star className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg">暂无标星片段</p>
        <p className="text-sm mt-1">将珍贵画面标星，避免修复时误删</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">⭐ 标星片段</h3>
        <p className="text-sm text-gray-500">共 {segments.length} 个珍贵片段，处理时请注意保护</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {segments.map(({ tape, segment }) => (
          <div
            key={segment.id}
            className="card p-4 border-l-4 border-yellow-400 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  <h4 className="font-semibold text-gray-800">{segment.name}</h4>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  来自：{tape.title} ({tape.tapeNumber})
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {segment.timeStart} - {segment.timeEnd}
                </p>
                {segment.description && (
                  <p className="text-xs text-gray-500 mt-2 bg-yellow-50 p-2 rounded">
                    💡 {segment.description}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="tag bg-gray-100 text-gray-600">
                {segment.status === 'done' ? '已完成' : segment.status === 'processing' ? '处理中' : '待处理'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onToggleStar(tape.id, segment.id)}
                  className="text-xs text-gray-500 hover:text-yellow-600"
                >
                  取消标星
                </button>
                {tape.videoFilePath && (
                  <button
                    onClick={() => onPlay(tape, segment)}
                    className="ml-2 btn-primary btn-sm flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    播放
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DamageTapesPanel({ tapes }: { tapes: Tape[] }) {
  if (tapes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg">没有发现损坏的磁带</p>
        <p className="text-sm mt-1">所有磁带状态良好</p>
      </div>
    )
  }

  const severityOrder = { severe: 0, moderate: 1, mild: 2 }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">损坏磁带列表</h3>
        <p className="text-sm text-gray-500">共 {tapes.length} 盘磁带存在损坏</p>
      </div>

      <div className="space-y-4">
        {tapes.map((tape) => (
          <div key={tape.id} className="card overflow-hidden">
            <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <h4 className="font-medium text-gray-800">{tape.title}</h4>
                  <p className="text-xs text-gray-500">
                    {tape.tapeNumber} · {tape.damageSpots.length} 处损坏
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            <div className="p-4 space-y-2">
              {tape.damageSpots
                .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
                .map((dmg) => (
                  <div
                    key={dmg.id}
                    className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <span
                      className={`tag flex-shrink-0 mt-0.5 ${
                        dmg.severity === 'severe'
                          ? 'bg-red-100 text-red-700'
                          : dmg.severity === 'moderate'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {dmg.severity === 'severe' ? '严重' : dmg.severity === 'moderate' ? '中等' : '轻微'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{dmg.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {dmg.timeStart} - {dmg.timeEnd}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RepairTapesPanel({ tapes }: { tapes: Tape[] }) {
  if (tapes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Wrench className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg">没有待处理的修复需求</p>
        <p className="text-sm mt-1">所有修复任务都已完成</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">修复需求</h3>
        <p className="text-sm text-gray-500">
          共 {tapes.reduce((acc, t) => acc + t.repairRequests.filter((r) => r.status !== 'done').length, 0)} 项修复待完成
        </p>
      </div>

      <div className="space-y-4">
        {tapes.map((tape) => {
          const pendingRepairs = tape.repairRequests.filter((r) => r.status !== 'done')
          if (pendingRepairs.length === 0) return null
          return (
            <div key={tape.id} className="card overflow-hidden">
              <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-blue-500" />
                  <div>
                    <h4 className="font-medium text-gray-800">{tape.title}</h4>
                    <p className="text-xs text-gray-500">
                      {tape.tapeNumber} · {pendingRepairs.length} 项待处理
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {pendingRepairs.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <span
                      className={`tag flex-shrink-0 mt-0.5 ${
                        req.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : req.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {req.priority === 'high' ? '高优先级' : req.priority === 'medium' ? '中优先级' : '低优先级'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{req.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        状态：{req.status === 'pending' ? '待处理' : '进行中'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
