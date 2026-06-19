import type { MissedPoint } from '@/types'
import { AlertTriangle, Lightbulb } from 'lucide-react'

interface SuggestionListProps {
  missedPoints: MissedPoint[]
  totalScore: number
}

export default function SuggestionList({ missedPoints, totalScore }: SuggestionListProps) {
  const hasMissed = missedPoints.length > 0

  return (
    <div className="bg-[#0F2A44] rounded-2xl p-5 border border-[#1a3a54]">
      <h3 className="text-white font-bold mb-4">改进建议</h3>
      {hasMissed ? (
        <div className="space-y-3">
          {missedPoints.map((point) => (
            <div key={point.id} className="bg-[#1a3a54] rounded-xl p-4 border border-red-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-white font-medium mb-1">漏问：{point.infoPointName}</div>
                  <div className="flex items-start gap-2 mt-2">
                    <Lightbulb className="w-4 h-4 text-[#2EC4B6] flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-[#2EC4B6]">正确问法：{point.correctQuestion}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-white font-medium">信息确认完整，做得好！</div>
          <div className="text-[#667788] text-sm mt-1">
            {totalScore >= 80 ? '整体表现优秀，继续保持！' : '还可以做得更好，注意安抚和效率。'}
          </div>
        </div>
      )}
    </div>
  )
}
