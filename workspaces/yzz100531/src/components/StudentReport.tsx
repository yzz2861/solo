import { Sparkles, TrendingUp, AlertCircle, Play } from 'lucide-react'
import type { NoteAnalysis } from '@/types'
import { useAppStore } from '@/store/useAppStore'

interface StudentReportProps {
  analyses: NoteAnalysis[]
  score: number
}

function getEncouragement(score: number): string {
  if (score >= 85) return '太棒了！你的音准非常出色！继续保持！'
  if (score >= 70) return '表现不错！大部分音都很准，再加油一点点！'
  if (score >= 50) return '有进步！坚持练习，你会越来越好的！'
  return '每一次练习都是成长！不用着急，慢慢来，你一定可以的！'
}

function getEmoji(score: number): string {
  if (score >= 85) return '🌟'
  if (score >= 70) return '👏'
  if (score >= 50) return '💪'
  return '🎵'
}

export default function StudentReport({ analyses, score }: StudentReportProps) {
  const { playSegment } = useAppStore()

  const weakNotes = analyses
    .filter((a) => a.actualFreq > 0 && Math.abs(a.deviationCents) > 20)
    .sort((a, b) => Math.abs(b.deviationCents) - Math.abs(a.deviationCents))

  const goodNotes = analyses.filter(
    (a) => a.actualFreq > 0 && Math.abs(a.deviationCents) <= 10
  )

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-amber" />
        <h3 className="font-display font-semibold text-navy dark:text-white">练习报告</h3>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber/10 to-teal/10">
        <div className="text-4xl">{getEmoji(score)}</div>
        <div>
          <p className="text-lg font-display font-bold text-navy dark:text-white">
            综合评分：{score.toFixed(0)} 分
          </p>
          <p className="text-sm text-navy/60 dark:text-white/60 mt-1">{getEncouragement(score)}</p>
        </div>
      </div>

      {goodNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <p className="text-sm font-medium text-success">表现出色的音</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {goodNotes.map((a, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
                {a.noteName}
              </span>
            ))}
          </div>
        </div>
      )}

      {weakNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber" />
            <p className="text-sm font-medium text-amber">可以再练习的音</p>
          </div>
          <div className="space-y-2">
            {weakNotes.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber/5">
                <span className="font-medium text-navy dark:text-white text-sm">{a.noteName}</span>
                <span className="text-xs text-navy/50 dark:text-white/50">
                  {a.deviationCents > 0 ? '偏高' : '偏低'} {Math.abs(a.deviationCents).toFixed(0)} 音分
                </span>
                <button
                  onClick={() => playSegment(a.startTime, a.endTime)}
                  className="ml-auto flex items-center gap-1 text-xs text-teal hover:text-teal-light transition-colors"
                >
                  <Play className="w-3 h-3" />
                  听一听
                </button>
              </div>
            ))}
          </div>
          {weakNotes.length > 0 && (
            <p className="text-xs text-navy/40 dark:text-white/40 mt-3">
              💡 小贴士：{weakNotes[0].noteName}
              {weakNotes[0].deviationCents > 0 ? '偏高' : '偏低'}的音可以先用钢琴校准，再慢慢唱准。加油！
            </p>
          )}
        </div>
      )}
    </div>
  )
}
