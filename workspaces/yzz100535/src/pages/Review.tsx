import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Eye, EyeOff, Send, UserMinus, AlertCircle, X } from 'lucide-react'
import { getWorkAverageScore } from '@/utils/validation'

export default function Review() {
  const { id: eventId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const events = useStore((s) => s.events)
  const judges = useStore((s) => s.judges)
  const works = useStore((s) => s.works)
  const scores = useStore((s) => s.scores)
  const setScore = useStore((s) => s.setScore)
  const setComment = useStore((s) => s.setComment)
  const updateJudge = useStore((s) => s.updateJudge)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [panelOpen, setPanelOpen] = useState(false)
  const [authorRevealed, setAuthorRevealed] = useState(false)

  const event = events.find((e) => e.id === eventId)
  const eventWorks = works.filter((w) => w.eventId === eventId)
  const eventJudges = judges.filter((j) => j.eventId === eventId)

  const currentWork = eventWorks[currentIndex]
  const totalWorks = eventWorks.length

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1))
    setAuthorRevealed(false)
  }, [])

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(totalWorks - 1, i + 1))
    setAuthorRevealed(false)
  }, [totalWorks])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'Escape') navigate(`/event/${eventId}`)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goPrev, goNext, navigate, eventId])

  if (!event) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0F] text-dark-200">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-dark-400" />
          <p className="text-lg">活动不存在</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded-lg border border-gold-500/50 bg-gold-500/20 px-4 py-2 text-sm text-gold-500 transition hover:bg-gold-500/30"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  if (totalWorks === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0F] text-dark-200">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-dark-400" />
          <p className="text-lg">尚未导入作品</p>
          <p className="mt-2 text-sm text-dark-300">请先在活动详情页导入作品</p>
          <button
            onClick={() => navigate(`/event/${eventId}?tab=import`)}
            className="mt-4 rounded-lg border border-gold-500/50 bg-gold-500/20 px-4 py-2 text-sm text-gold-500 transition hover:bg-gold-500/30"
          >
            去导入作品
          </button>
        </div>
      </div>
    )
  }

  const avgScore = getWorkAverageScore(currentWork.id, scores, eventJudges)
  const workScores = scores.filter((sc) => sc.workId === currentWork.id)

  const isOutOfRange = (score: number | null) => {
    if (score === null) return false
    return score < event.scoreMin || score > event.scoreMax
  }

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden bg-[#0A0A0F]">
      <div className="relative flex flex-1 flex-col">
        <div className="absolute left-8 top-8 z-10">
          <p className="font-display text-4xl font-bold text-gold-500">
            {currentWork.anonymousCode}
          </p>
          <p className="mt-1 text-lg text-dark-200">{currentWork.theme}</p>
        </div>

        <div className="absolute right-8 top-8 z-10 flex items-center gap-3">
          <button
            onClick={() => setAuthorRevealed((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-dark-400/30 bg-dark-600/60 px-3 py-2 text-sm text-dark-100 transition hover:border-gold-500/30 hover:text-gold-500"
          >
            {authorRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {authorRevealed ? '隐藏作者' : '显示作者'}
          </button>
          <button
            onClick={() => navigate(`/event/${eventId}`)}
            className="flex items-center gap-2 rounded-lg border border-dark-400/30 bg-dark-600/60 px-3 py-2 text-sm text-dark-100 transition hover:border-red-500/30 hover:text-red-400"
          >
            <X className="h-4 w-4" />
            退出
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center p-8">
          {currentWork.imageUrl ? (
            <img
              src={currentWork.imageUrl}
              alt={currentWork.anonymousCode}
              className="max-h-[80vh] max-w-full object-contain"
            />
          ) : (
            <div className="flex h-[60vh] w-[60vh] items-center justify-center rounded-xl border border-dark-400/30 bg-dark-700">
              <div className="text-center">
                <AlertCircle className="mx-auto mb-2 h-12 w-12 text-dark-400" />
                <p className="text-sm text-dark-300">图片未找到</p>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/40 backdrop-blur-md">
          <div className="flex items-center justify-between px-8 py-4">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 rounded-lg border border-dark-400/30 bg-dark-600/60 px-4 py-2 text-sm text-dark-100 transition hover:border-gold-500/30 hover:text-gold-500 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              上一幅
            </button>

            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-semibold text-dark-50">
                {currentIndex + 1}/{totalWorks}
              </span>
              <div className="flex items-center gap-1 text-xs text-dark-300">
                {!authorRevealed ? (
                  <span className="blur-sm select-none">{currentWork.author}</span>
                ) : (
                  <span className="text-gold-500">{currentWork.author}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setPanelOpen((v) => !v)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  panelOpen
                    ? 'border-gold-500/50 bg-gold-500/20 text-gold-500 hover:bg-gold-500/30'
                    : 'border-dark-400/30 bg-dark-600/60 text-dark-100 hover:border-gold-500/30 hover:text-gold-500'
                }`}
              >
                <Send className="h-4 w-4" />
                打分面板
              </button>

              <button
                onClick={goNext}
                disabled={currentIndex === totalWorks - 1}
                className="flex items-center gap-2 rounded-lg border border-dark-400/30 bg-dark-600/60 px-4 py-2 text-sm text-dark-100 transition hover:border-gold-500/30 hover:text-gold-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                下一幅
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`flex h-full flex-col border-l border-dark-400/30 bg-dark-600 transition-all duration-300 ${
          panelOpen ? 'w-[380px]' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex items-center justify-between border-b border-dark-400/30 px-5 py-4">
          <h2 className="text-lg font-semibold text-dark-50">评分面板</h2>
          <span className="rounded-full bg-gold-500/15 px-3 py-0.5 text-sm font-medium text-gold-500">
            {currentWork.anonymousCode}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-6">
            {eventJudges.map((judge) => {
              const judgeScore = workScores.find((sc) => sc.judgeId === judge.id)

              if (judge.absent) {
                return (
                  <div key={judge.id} className="rounded-lg border border-dark-400/20 bg-dark-700/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <UserMinus className="h-4 w-4 text-dark-400" />
                      <span className="font-medium text-dark-200">{judge.name}</span>
                      <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
                        缺席
                      </span>
                    </div>
                    <textarea
                      value={judge.absentNote || ''}
                      onChange={(e) => updateJudge(judge.id, { absentNote: e.target.value })}
                      placeholder="补录说明"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-dark-400/30 bg-dark-700 px-3 py-2 text-sm text-dark-100 placeholder:text-dark-400 focus:border-gold-500/50 focus:outline-none"
                    />
                  </div>
                )
              }

              const outOfRange = isOutOfRange(judgeScore?.score ?? null)

              return (
                <div key={judge.id} className="rounded-lg border border-dark-400/20 bg-dark-700/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="font-medium text-dark-50">{judge.name}</span>
                  </div>

                  <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs text-dark-300">
                        评分 ({event.scoreMin}-{event.scoreMax})
                      </label>
                      {outOfRange && (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          超出范围
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      value={judgeScore?.score ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '') {
                          setScore(currentWork.id, judge.id, null)
                        } else {
                          setScore(currentWork.id, judge.id, Number(val))
                        }
                      }}
                      min={event.scoreMin}
                      max={event.scoreMax}
                      className={`w-full rounded-lg border bg-dark-700 px-3 py-2 text-sm text-dark-50 focus:outline-none ${
                        outOfRange
                          ? 'border-red-500 focus:border-red-400'
                          : 'border-dark-400/30 focus:border-gold-500/50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-dark-300">评语</label>
                    <textarea
                      value={judgeScore?.comment || ''}
                      onChange={(e) => setComment(currentWork.id, judge.id, e.target.value)}
                      placeholder="可选评语"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-dark-400/30 bg-dark-700 px-3 py-2 text-sm text-dark-100 placeholder:text-dark-400 focus:border-gold-500/50 focus:outline-none"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="border-t border-dark-400/30 px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-200">实时均分</span>
            <span className="font-display text-2xl font-bold text-gold-500">
              {avgScore > 0 ? avgScore.toFixed(2) : '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
