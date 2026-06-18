import { useEffect, useState, useMemo, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { BarChart3, TrendingUp, Eye } from 'lucide-react'
import type { PracticeRecord } from '@/types'

const WEEK_COLORS = ['#5BC0BE', '#E8A838', '#E85454', '#8B5CF6', '#4CAF50', '#F472B6', '#06B6D4', '#EF4444']

export default function ComparePage() {
  const { allRecords, loadAllRecords, loadAudioForRecord } = useAppStore()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    loadAllRecords()
  }, [loadAllRecords])

  const selectedRecords = useMemo(
    () => allRecords.filter((r) => selectedIds.includes(r.id)),
    [allRecords, selectedIds]
  )

  const stabilityTrend = useMemo(() => {
    return selectedRecords.map((r) => ({
      week: new Date(r.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      avgDeviation: r.noteAnalyses.length > 0
        ? r.noteAnalyses.reduce((s, a) => s + Math.abs(a.deviationCents), 0) / r.noteAnalyses.length
        : 0,
      avgJitter: r.noteAnalyses.length > 0
        ? r.noteAnalyses.reduce((s, a) => s + a.jitter, 0) / r.noteAnalyses.length
        : 0,
      score: r.overallScore,
    }))
  }, [selectedRecords])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || selectedRecords.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = 760
    const height = 360
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#0F1A30'
    ctx.fillRect(0, 0, width, height)

    const padding = { top: 30, bottom: 40, left: 60, right: 20 }
    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom

    const allFreqs = selectedRecords.flatMap((r) => r.pitchFrames.map((f) => f.frequency).filter((f) => f > 0))
    if (allFreqs.length === 0) return

    const minFreq = Math.min(...allFreqs) * 0.8
    const maxFreq = Math.max(...allFreqs) * 1.2
    const maxDuration = Math.max(...selectedRecords.map((r) => {
      const frames = r.pitchFrames
      return frames.length > 0 ? frames[frames.length - 1].time : 0
    }))

    const freqToY = (freq: number) => {
      const logMin = Math.log2(Math.max(minFreq, 20))
      const logMax = Math.log2(maxFreq)
      const logFreq = Math.log2(Math.max(freq, 20))
      return padding.top + chartH * (1 - (logFreq - logMin) / (logMax - logMin))
    }

    const timeToX = (time: number) => {
      return padding.left + (time / maxDuration) * chartW
    }

    ctx.strokeStyle = '#1a2a4a'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartH / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    for (let t = 0; t <= maxDuration; t += Math.max(1, Math.floor(maxDuration / 10))) {
      const x = timeToX(t)
      ctx.beginPath()
      ctx.strokeStyle = '#1a2a4a'
      ctx.moveTo(x, padding.top)
      ctx.lineTo(x, height - padding.bottom)
      ctx.stroke()
      ctx.fillStyle = '#555'
      ctx.font = '10px DM Sans'
      ctx.fillText(`${t.toFixed(0)}s`, x - 8, height - padding.bottom + 14)
    }

    selectedRecords.forEach((record, idx) => {
      const color = WEEK_COLORS[idx % WEEK_COLORS.length]
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      let started = false
      for (const frame of record.pitchFrames) {
        if (frame.frequency <= 0 || frame.confidence < 0.3) {
          started = false
          continue
        }
        const x = timeToX(frame.time)
        const y = freqToY(frame.frequency)
        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
    })

    const legendY = height - 12
    let legendX = padding.left
    selectedRecords.forEach((record, idx) => {
      const color = WEEK_COLORS[idx % WEEK_COLORS.length]
      const label = new Date(record.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
      ctx.fillStyle = color
      ctx.fillRect(legendX, legendY - 6, 12, 6)
      ctx.fillStyle = '#aaa'
      ctx.font = '10px DM Sans'
      ctx.fillText(label, legendX + 16, legendY)
      legendX += 80
    })
  }, [selectedRecords])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleViewRecord = async (record: PracticeRecord) => {
    await loadAudioForRecord(record)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-navy dark:text-white">多周对比</h2>
        <p className="text-sm text-navy/50 dark:text-white/50 mt-1">
          选择历史练习记录，叠加对比音高曲线和稳定度趋势
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber" />
            <h3 className="font-display font-semibold text-navy dark:text-white">历史记录</h3>
          </div>
          {allRecords.length === 0 ? (
            <p className="text-sm text-navy/40 dark:text-white/40 py-8 text-center">
              暂无练习记录，请先在练习复盘页保存
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {allRecords.map((record) => (
                <div
                  key={record.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedIds.includes(record.id)
                      ? 'border-teal bg-teal/5'
                      : 'border-navy/5 dark:border-white/5 hover:border-navy/20 dark:hover:border-white/20'
                  }`}
                  onClick={() => toggleSelect(record.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(record.id)}
                    onChange={() => toggleSelect(record.id)}
                    className="accent-teal"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy dark:text-white truncate">
                      {record.studentName}
                    </p>
                    <p className="text-xs text-navy/40 dark:text-white/40">
                      {new Date(record.date).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${
                    record.overallScore >= 80 ? 'text-success' : record.overallScore >= 50 ? 'text-amber' : 'text-danger'
                  }`}>
                    {record.overallScore.toFixed(0)}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleViewRecord(record) }}
                    className="p-1.5 rounded-lg hover:bg-navy/5 dark:hover:bg-white/5 transition-colors"
                    title="查看详情"
                  >
                    <Eye className="w-4 h-4 text-navy/40 dark:text-white/40" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedRecords.length > 0 ? (
            <>
              <div className="card">
                <h3 className="font-display font-semibold text-navy dark:text-white mb-3">叠加音高曲线</h3>
                <canvas
                  ref={canvasRef}
                  style={{ width: 760, height: 360 }}
                  className="rounded-lg w-full"
                />
              </div>

              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-amber" />
                  <h3 className="font-display font-semibold text-navy dark:text-white">稳定度趋势</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {stabilityTrend.map((item, i) => (
                    <div key={i} className="p-3 rounded-xl bg-navy/5 dark:bg-white/5 text-center">
                      <p className="text-xs text-navy/40 dark:text-white/40">{item.week}</p>
                      <p className="text-lg font-bold text-navy dark:text-white mt-1">
                        {item.score.toFixed(0)}
                      </p>
                      <p className="text-[10px] text-navy/30 dark:text-white/30 mt-0.5">
                        偏离 {item.avgDeviation.toFixed(1)}¢ / 抖动 {(item.avgJitter * 100).toFixed(2)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="card flex flex-col items-center justify-center py-16 text-navy/30 dark:text-white/30">
              <BarChart3 className="w-12 h-12 mb-3" />
              <p className="text-sm">选择至少一条记录开始对比</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
