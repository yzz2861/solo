interface ScoreOverviewProps {
  totalScore: number
  infoScore: number
  comfortScore: number
  efficiencyScore: number
}

export default function ScoreOverview({ totalScore, infoScore, comfortScore, efficiencyScore }: ScoreOverviewProps) {
  const maxInfo = 60
  const maxComfort = 25
  const maxEfficiency = 15

  const scoreColor = totalScore >= 80 ? '#2EC4B6' : totalScore >= 60 ? '#FF6B35' : '#ef4444'
  const scoreLabel = totalScore >= 80 ? '优秀' : totalScore >= 60 ? '合格' : '需加强'

  return (
    <div className="bg-[#0F2A44] rounded-2xl p-6 border border-[#1a3a54]">
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1a3a54" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeDasharray={`${(totalScore / 100) * 264} 264`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{totalScore}</span>
            <span className="text-xs" style={{ color: scoreColor }}>{scoreLabel}</span>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#667788]">信息完整度</span>
              <span className="text-white">{infoScore}/{maxInfo}</span>
            </div>
            <div className="h-2 bg-[#1a3a54] rounded-full overflow-hidden">
              <div className="h-full bg-[#4499cc] rounded-full transition-all duration-1000" style={{ width: `${(infoScore / maxInfo) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#667788]">安抚有效性</span>
              <span className="text-white">{comfortScore}/{maxComfort}</span>
            </div>
            <div className="h-2 bg-[#1a3a54] rounded-full overflow-hidden">
              <div className="h-full bg-pink-400 rounded-full transition-all duration-1000" style={{ width: `${(comfortScore / maxComfort) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#667788]">响应效率</span>
              <span className="text-white">{efficiencyScore}/{maxEfficiency}</span>
            </div>
            <div className="h-2 bg-[#1a3a54] rounded-full overflow-hidden">
              <div className="h-full bg-purple-400 rounded-full transition-all duration-1000" style={{ width: `${(efficiencyScore / maxEfficiency) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
