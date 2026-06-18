import { useAppStore } from '@/store/useAppStore'
import AudioUploader from '@/components/AudioUploader'
import ScaleSelector from '@/components/ScaleSelector'
import WaveformCanvas from '@/components/WaveformCanvas'
import PitchCurveCanvas from '@/components/PitchCurveCanvas'
import AnomalyBanner from '@/components/AnomalyBanner'
import ParameterTable from '@/components/ParameterTable'
import StudentReport from '@/components/StudentReport'
import { computeOverallScore } from '@/utils/pitchDetection'
import { Play, Save, RotateCcw, ZoomIn, ZoomOut, Loader2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function ReviewPage() {
  const {
    role, audioBuffer, audioUrl, selectedScale, pitchFrames,
    noteAnalyses, anomalies, marks, pendingMarks, isAnalyzing, zoomLevel,
    runAnalysis, saveCurrentRecord, reset, playSegment,
    setZoomLevel, setPlaybackTime, playbackTime,
  } = useAppStore()

  const [studentName, setStudentName] = useState('')
  const [markStartEnd, setMarkStartEnd] = useState<[number, number] | null>(null)
  const [markLabel, setMarkLabel] = useState('')
  const [markColor, setMarkColor] = useState('#E85454')
  const audioRef = useRef<HTMLAudioElement>(null)

  const score = computeOverallScore(noteAnalyses)
  const canAnalyze = audioBuffer && selectedScale
  const hasResults = noteAnalyses.length > 0

  const handleMarkAdd = (startTime: number, endTime: number) => {
    if (role === 'teacher') {
      setMarkStartEnd([startTime, endTime])
      setMarkLabel('')
    }
  }

  const handleSaveMark = async () => {
    if (!markStartEnd) return
    const { addMark } = useAppStore.getState()
    await addMark(markStartEnd[0], markStartEnd[1], markLabel || '重点', markColor)
    setMarkStartEnd(null)
    setMarkLabel('')
  }

  useEffect(() => {
    return () => {
      const { audioUrl } = useAppStore.getState()
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-navy dark:text-white">练习复盘</h2>
          <p className="text-sm text-navy/50 dark:text-white/50 mt-1">
            上传练声音频，选择目标音阶，分析音高表现
          </p>
        </div>
        {hasResults && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-navy/5 dark:bg-white/5">
              <span className="text-sm text-navy/50 dark:text-white/50">综合评分</span>
              <span className={`text-xl font-display font-bold ${
                score >= 80 ? 'text-success' : score >= 50 ? 'text-amber' : 'text-danger'
              }`}>
                {score.toFixed(0)}
              </span>
            </div>
            <button onClick={reset} className="btn-secondary flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <AudioUploader />

          {audioBuffer && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-navy/50 dark:text-white/50">波形预览</span>
                {audioUrl && (
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    controls
                    className="h-8"
                    onTimeUpdate={(e) => setPlaybackTime(e.currentTarget.currentTime)}
                  />
                )}
              </div>
              <WaveformCanvas
                audioBuffer={audioBuffer}
                width={760}
                height={80}
                playbackTime={playbackTime}
                duration={audioBuffer.duration}
                marks={marks.map((m) => ({ startTime: m.startTime, endTime: m.endTime, color: m.color }))}
              />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <ScaleSelector />

          <button
            onClick={runAnalysis}
            disabled={!canAnalyze || isAnalyzing}
            className={`w-full btn-primary flex items-center justify-center gap-2 ${
              !canAnalyze || isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                开始分析
              </>
            )}
          </button>

          {role === 'teacher' && hasResults && (
            <div className="space-y-3">
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="学生姓名"
                className="w-full px-3 py-2 rounded-lg border border-navy/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:border-amber"
              />
              {pendingMarks.length > 0 && (
                <p className="text-xs text-amber font-medium">
                  {pendingMarks.length} 个待保存标记将在保存记录时一并持久化
                </p>
              )}
              <button
                onClick={() => saveCurrentRecord(studentName || '未命名')}
                className="w-full btn-secondary flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存记录
              </button>
            </div>
          )}
        </div>
      </div>

      {anomalies.length > 0 && <AnomalyBanner anomalies={anomalies} />}

      {hasResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-navy dark:text-white">音高曲线</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                className="p-1.5 rounded-lg bg-navy/5 dark:bg-white/5 hover:bg-navy/10 dark:hover:bg-white/10 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-navy/50 dark:text-white/50 w-12 text-center">
                {zoomLevel.toFixed(2)}x
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.25))}
                className="p-1.5 rounded-lg bg-navy/5 dark:bg-white/5 hover:bg-navy/10 dark:hover:bg-white/10 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <PitchCurveCanvas
              pitchFrames={pitchFrames}
              targetNotes={selectedScale?.notes || []}
              duration={audioBuffer?.duration || 0}
              marks={marks}
              width={760 * zoomLevel}
              height={360}
              zoomLevel={1}
              onMarkAdd={handleMarkAdd}
              onSegmentClick={(t) => {
                if (audioBuffer) playSegment(t, Math.min(t + 2, audioBuffer.duration))
              }}
            />
          </div>

          <div className="flex items-center gap-4 text-xs text-navy/40 dark:text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-amber inline-block" style={{ borderTop: '2px dashed #E8A838' }} />
              目标音高
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-teal inline-block" />
              实际音高
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-3 bg-red-200/50 inline-block rounded" />
              重点标记
            </span>
          </div>
        </div>
      )}

      {markStartEnd && role === 'teacher' && (
        <div className="card">
          <h4 className="font-display font-semibold text-navy dark:text-white mb-3">
            添加标记 ({markStartEnd[0].toFixed(1)}s - {markStartEnd[1].toFixed(1)}s)
          </h4>
          <div className="flex gap-3 items-end">
            <input
              type="text"
              value={markLabel}
              onChange={(e) => setMarkLabel(e.target.value)}
              placeholder="标记说明（如：注意气息支撑）"
              className="flex-1 px-3 py-2 rounded-lg border border-navy/10 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:border-amber"
            />
            <input
              type="color"
              value={markColor}
              onChange={(e) => setMarkColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer"
            />
            <button onClick={handleSaveMark} className="btn-primary">保存标记</button>
            <button onClick={() => setMarkStartEnd(null)} className="btn-secondary">取消</button>
          </div>
        </div>
      )}

      {hasResults && role === 'teacher' && (
        <ParameterTable analyses={noteAnalyses} />
      )}

      {hasResults && role === 'student' && (
        <StudentReport analyses={noteAnalyses} score={score} />
      )}
    </div>
  )
}
