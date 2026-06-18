import type { NoteAnalysis } from '@/types'
import { Play } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

interface ParameterTableProps {
  analyses: NoteAnalysis[]
}

export default function ParameterTable({ analyses }: ParameterTableProps) {
  const { playSegment } = useAppStore()

  if (analyses.length === 0) return null

  return (
    <div className="card overflow-hidden">
      <h3 className="font-display font-semibold text-navy dark:text-white mb-4">详细参数</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy/10 dark:border-white/10">
              <th className="text-left py-2 px-3 font-medium text-navy/50 dark:text-white/50">音名</th>
              <th className="text-right py-2 px-3 font-medium text-navy/50 dark:text-white/50">目标频率</th>
              <th className="text-right py-2 px-3 font-medium text-navy/50 dark:text-white/50">实际频率</th>
              <th className="text-right py-2 px-3 font-medium text-navy/50 dark:text-white/50">偏离音分</th>
              <th className="text-right py-2 px-3 font-medium text-navy/50 dark:text-white/50">抖动</th>
              <th className="text-right py-2 px-3 font-medium text-navy/50 dark:text-white/50">时长</th>
              <th className="text-center py-2 px-3 font-medium text-navy/50 dark:text-white/50">回听</th>
            </tr>
          </thead>
          <tbody>
            {analyses.map((a, i) => (
              <tr
                key={i}
                className={`border-b border-navy/5 dark:border-white/5 ${
                  a.actualFreq > 0 && Math.abs(a.deviationCents) > 30
                    ? 'bg-red-50/50 dark:bg-red-900/10'
                    : a.actualFreq > 0 && Math.abs(a.deviationCents) > 15
                    ? 'bg-yellow-50/50 dark:bg-yellow-900/10'
                    : ''
                }`}
              >
                <td className="py-2 px-3 font-medium text-navy dark:text-white">{a.noteName}</td>
                <td className="py-2 px-3 text-right text-navy/60 dark:text-white/60">{a.targetFreq.toFixed(1)}Hz</td>
                <td className="py-2 px-3 text-right text-navy/80 dark:text-white/80">
                  {a.actualFreq > 0 ? `${a.actualFreq.toFixed(1)}Hz` : '-'}
                </td>
                <td className={`py-2 px-3 text-right font-medium ${
                  Math.abs(a.deviationCents) > 30
                    ? 'text-danger'
                    : Math.abs(a.deviationCents) > 15
                    ? 'text-amber-dark'
                    : 'text-success'
                }`}>
                  {a.actualFreq > 0 ? `${a.deviationCents > 0 ? '+' : ''}${a.deviationCents.toFixed(1)}¢` : '-'}
                </td>
                <td className="py-2 px-3 text-right text-navy/60 dark:text-white/60">
                  {a.actualFreq > 0 ? (a.jitter * 100).toFixed(2) + '%' : '-'}
                </td>
                <td className="py-2 px-3 text-right text-navy/60 dark:text-white/60">{a.duration.toFixed(2)}s</td>
                <td className="py-2 px-3 text-center">
                  {a.actualFreq > 0 && (
                    <button
                      onClick={() => playSegment(a.startTime, a.endTime)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal/10 text-teal hover:bg-teal/20 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
