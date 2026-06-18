import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { User, Play, Star, Video, ChevronRight, Search } from 'lucide-react'
import VideoPlayer from '@/components/VideoPlayer'
import type { VideoSegment, Tape } from '@/types'
import { parseTimeToSeconds } from '@/utils'

export default function CustomerView() {
  const { customers, tapes, getTapesByCustomer, getCustomer } = useAppStore()
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [selectedTapeId, setSelectedTapeId] = useState<string | null>(null)
  const [playerSrc, setPlayerSrc] = useState<string | null>(null)
  const [playerSegments, setPlayerSegments] = useState<VideoSegment[]>([])
  const [playerTime, setPlayerTime] = useState(0)
  const [searchKeyword, setSearchKeyword] = useState('')

  const filteredCustomers = customers.filter((c) => {
    if (!searchKeyword) return true
    const kw = searchKeyword.toLowerCase()
    return c.name.toLowerCase().includes(kw) || c.phone.includes(kw)
  })

  const customerTapes = selectedCustomerId ? getTapesByCustomer(selectedCustomerId) : []
  const completedTapes = customerTapes.filter((t) => t.status === 'completed' || t.videoFilePath)
  const selectedTape = selectedTapeId ? tapes.find((t) => t.id === selectedTapeId) : null
  const selectedCustomer = selectedCustomerId ? getCustomer(selectedCustomerId) : null

  const handlePlaySegment = (tape: Tape, segment: VideoSegment) => {
    if (tape.videoFilePath) {
      setPlayerSrc(tape.videoFilePath)
      setPlayerTime(parseTimeToSeconds(segment.timeStart))
      setPlayerSegments(tape.segments)
    }
  }

  const handlePlayTape = (tape: Tape) => {
    if (tape.videoFilePath) {
      setPlayerSrc(tape.videoFilePath)
      setPlayerTime(0)
      setPlayerSegments(tape.segments)
    }
  }

  return (
    <div className="h-full flex">
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">客户列表</h3>
          <div className="mt-3 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索客户..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>暂无客户</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredCustomers.map((customer) => {
                const tapeCount = getTapesByCustomer(customer.id).filter(
                  (t) => t.status === 'completed' || t.videoFilePath
                ).length
                return (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomerId(customer.id)
                      setSelectedTapeId(null)
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedCustomerId === customer.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
                      {customer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{customer.name}</p>
                      <p className="text-xs text-gray-500">{tapeCount} 盘可查看</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedCustomerId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Video className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">请选择客户查看影像</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-6 bg-white border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold">
                  {selectedCustomer?.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {selectedCustomer?.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    共 {completedTapes.length} 盘影像可预览
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-64 border-r border-gray-100 flex flex-col bg-gray-50">
                <div className="p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    磁带列表
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
                  {completedTapes.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      暂无可查看的影像
                    </div>
                  ) : (
                    completedTapes.map((tape) => (
                      <button
                        key={tape.id}
                        onClick={() => setSelectedTapeId(tape.id)}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          selectedTapeId === tape.id
                            ? 'bg-white shadow-sm ring-1 ring-primary-200'
                            : 'bg-white/60 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <p className="font-medium text-gray-800 text-sm truncate">
                          {tape.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">{tape.tapeNumber}</span>
                          {tape.segments.length > 0 && (
                            <span className="text-xs text-primary-500">
                              {tape.segments.length} 片段
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                {!selectedTape ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>请选择一盘磁带查看详情</p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div className="card overflow-hidden">
                      <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                        {selectedTape.videoFilePath ? (
                          <>
                            <video
                              src={`file://${selectedTape.videoFilePath}`}
                              className="w-full h-full object-contain"
                              onClick={() => handlePlayTape(selectedTape)}
                            />
                            <button
                              onClick={() => handlePlayTape(selectedTape)}
                              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors"
                            >
                              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                <Play className="w-8 h-8 text-gray-800 ml-1" />
                              </div>
                            </button>
                          </>
                        ) : (
                          <div className="text-gray-500">
                            <Video className="w-16 h-16 mx-auto mb-2 opacity-30" />
                            <p>暂无视频文件</p>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {selectedTape.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          磁带编号：{selectedTape.tapeNumber}
                        </p>
                        {selectedTape.notes && (
                          <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-3 rounded-lg">
                            {selectedTape.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {selectedTape.segments.length > 0 && (
                      <div className="card">
                        <div className="card-header flex items-center justify-between">
                          <span>精彩片段</span>
                          <span className="text-sm text-gray-500 font-normal">
                            点击片段可跳转播放
                          </span>
                        </div>
                        <div className="card-body">
                          <div className="space-y-2">
                            {selectedTape.segments
                              .sort((a, b) => a.orderIndex - b.orderIndex)
                              .map((seg, idx) => (
                                <button
                                  key={seg.id}
                                  onClick={() => handlePlaySegment(selectedTape, seg)}
                                  className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                                >
                                  <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-800">
                                        {seg.name}
                                      </span>
                                      {seg.starred && (
                                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                      )}
                                    </div>
                                    {seg.description && (
                                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                                        {seg.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-gray-500">
                                      {seg.timeStart}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {seg.timeEnd} 结束
                                    </p>
                                  </div>
                                  <Play className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedTape.segments.filter((s) => s.starred).length > 0 && (
                      <div className="card border-yellow-200 bg-yellow-50/30">
                        <div className="card-header border-yellow-100 bg-yellow-50/50">
                          <span className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            珍藏片段
                          </span>
                        </div>
                        <div className="card-body">
                          <div className="grid grid-cols-2 gap-3">
                            {selectedTape.segments
                              .filter((s) => s.starred)
                              .sort((a, b) => a.orderIndex - b.orderIndex)
                              .map((seg) => (
                                <button
                                  key={seg.id}
                                  onClick={() => handlePlaySegment(selectedTape, seg)}
                                  className="p-3 bg-white rounded-lg border border-yellow-200 hover:border-yellow-400 hover:shadow-sm transition-all text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                    <span className="font-medium text-gray-800 text-sm">
                                      {seg.name}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {seg.timeStart} - {seg.timeEnd}
                                  </p>
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
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
