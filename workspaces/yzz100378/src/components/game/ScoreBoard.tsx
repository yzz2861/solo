import { useGameStore } from "@/store/gameStore"
import { useScoreStore } from "@/store/scoreStore"
import { useNavigate } from "react-router-dom"
import { Trophy, Clock, Users, AlertTriangle, RotateCcw, Home } from "lucide-react"
import { calculatePassedRate, calculateAvgCongestionTime, calculateAvgDetourDistance } from "@/engine/scoring"
import { buildCongestionHeatmap } from "@/engine/collision"
import { TrainingRecord, WeakPoint } from "@/types"

export default function ScoreBoard() {
  const score = useGameStore(s => s.score)
  const level = useGameStore(s => s.level)
  const totalSpawned = useGameStore(s => s.totalSpawned)
  const totalExited = useGameStore(s => s.totalExited)
  const congestionPenalty = useGameStore(s => s.congestionPenalty)
  const detourPenalty = useGameStore(s => s.detourPenalty)
  const eventBonus = useGameStore(s => s.eventBonus)
  const elapsedTime = useGameStore(s => s.elapsedTime)
  const passengers = useGameStore(s => s.passengers)
  const replayFrames = useGameStore(s => s.replayFrames)
  const resetGame = useGameStore(s => s.resetGame)
  const playerName = useScoreStore(s => s.currentPlayerName)
  const addRecord = useScoreStore(s => s.addRecord)
  const navigate = useNavigate()

  if (!level) return null

  const passedRate = calculatePassedRate({ totalSpawned, totalExited } as any)
  const avgCongestionTime = calculateAvgCongestionTime(passengers)
  const avgDetourDistance = calculateAvgDetourDistance(passengers)

  const weakPoints: WeakPoint[] = level.transferPoints.map(tp => ({
    transferPointId: tp.id,
    transferPointLabel: tp.label,
    avgResponseTime: 0,
    congestionOccurrences: passengers.filter(p => p.state === "congested" && Math.abs(p.x - tp.x) < 3 && Math.abs(p.y - tp.y) < 3).length
  }))

  const handleSave = () => {
    const record: TrainingRecord = {
      id: `record_${Date.now()}`,
      levelId: level.id,
      levelName: level.name,
      stationName: level.stationName,
      playerName,
      score,
      passedRate,
      avgCongestionTime,
      avgDetourDistance,
      completedAt: new Date().toISOString(),
      duration: Math.floor(elapsedTime),
      weakPoints,
      replayFrames: replayFrames.filter((_, i) => i % 10 === 0)
    }
    addRecord(record)
  }

  const grade = score >= 80 ? "优秀" : score >= 60 ? "良好" : score >= 40 ? "合格" : "需改进"
  const gradeColor = score >= 80 ? "text-[#2a9d8f]" : score >= 60 ? "text-[#457b9d]" : score >= 40 ? "text-[#f4a261]" : "text-[#ff4444]"

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1f36] p-6">
        <div className="mb-6 text-center">
          <Trophy className="mx-auto mb-2 h-10 w-10 text-[#f4a261]" />
          <h2 className="text-xl font-bold text-white">调度结束</h2>
          <div className={`mt-2 text-3xl font-bold ${gradeColor}`}>{grade}</div>
        </div>

        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">最终得分</span>
            <span className="font-bold text-[#f4a261]">{score.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">通过率</span>
            <span className="text-[#2a9d8f]">{(passedRate * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">拥堵扣分</span>
            <span className="text-[#ff4444]">-{congestionPenalty.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">绕行扣分</span>
            <span className="text-[#ffaa00]">-{detourPenalty.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">事件加分</span>
            <span className="text-[#2a9d8f]">+{eventBonus.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">用时</span>
            <span className="text-white">{Math.floor(elapsedTime)}秒</span>
          </div>
        </div>

        {weakPoints.some(wp => wp.congestionOccurrences > 0) && (
          <div className="mb-4 rounded-lg bg-[#ff4444]/10 p-3">
            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-[#ff4444]">
              <AlertTriangle className="h-3 w-3" /> 薄弱环节
            </div>
            {weakPoints.filter(wp => wp.congestionOccurrences > 0).map(wp => (
              <div key={wp.transferPointId} className="text-xs text-gray-400">
                {wp.transferPointLabel}: {wp.congestionOccurrences}次拥堵
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => { handleSave(); resetGame() }}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#457b9d] py-2 text-sm font-medium text-white transition-colors hover:bg-[#457b9d]/80"
          >
            <RotateCcw className="h-4 w-4" /> 重新挑战
          </button>
          <button
            onClick={() => { handleSave(); navigate("/") }}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/10 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/15"
          >
            <Home className="h-4 w-4" /> 返回首页
          </button>
        </div>
      </div>
    </div>
  )
}
