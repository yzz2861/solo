import { Clock, Users, TrendingDown, AlertTriangle, Trophy } from "lucide-react"
import { useGameStore } from "@/store/gameStore"

export default function StatusBar() {
  const elapsedTime = useGameStore(s => s.elapsedTime)
  const score = useGameStore(s => s.score)
  const totalSpawned = useGameStore(s => s.totalSpawned)
  const totalExited = useGameStore(s => s.totalExited)
  const congestionPenalty = useGameStore(s => s.congestionPenalty)
  const detourPenalty = useGameStore(s => s.detourPenalty)
  const level = useGameStore(s => s.level)
  const phase = useGameStore(s => s.phase)
  const passengers = useGameStore(s => s.passengers)

  const remaining = level ? Math.max(0, level.timeLimit - elapsedTime) : 0
  const passedRate = totalSpawned > 0 ? Math.round((totalExited / totalSpawned) * 100) : 0
  const congestedCount = passengers.filter(p => p.state === "congested").length

  return (
    <div className="flex w-48 flex-col gap-3 border-l border-white/10 bg-[#141830] p-3 text-xs">
      <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2.5">
        <Clock className="h-4 w-4 text-[#457b9d]" />
        <div>
          <div className="text-[10px] text-gray-500">剩余时间</div>
          <div className={`text-base font-bold tabular-nums ${remaining < 20 ? "text-[#ff4444]" : "text-white"}`}>
            {Math.floor(remaining)}s
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2.5">
        <Trophy className="h-4 w-4 text-[#f4a261]" />
        <div>
          <div className="text-[10px] text-gray-500">当前分数</div>
          <div className="text-base font-bold tabular-nums text-[#f4a261]">{score.toFixed(1)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2.5">
        <Users className="h-4 w-4 text-[#2a9d8f]" />
        <div>
          <div className="text-[10px] text-gray-500">通过率</div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold tabular-nums text-[#2a9d8f]">{passedRate}%</span>
            <span className="text-[10px] text-gray-600">({totalExited}/{totalSpawned})</span>
          </div>
        </div>
      </div>

      {congestedCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-[#ff4444]/10 p-2.5">
          <AlertTriangle className="h-4 w-4 text-[#ff4444]" />
          <div>
            <div className="text-[10px] text-[#ff4444]">拥堵中</div>
            <div className="text-sm font-bold tabular-nums text-[#ff4444]">{congestedCount}人</div>
          </div>
        </div>
      )}

      <div className="mt-1 space-y-1.5 border-t border-white/5 pt-2">
        <div className="flex items-center justify-between text-gray-500">
          <span>拥堵扣分</span>
          <span className="tabular-nums text-[#ff4444]">-{congestionPenalty.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between text-gray-500">
          <span>绕行扣分</span>
          <span className="tabular-nums text-[#ffaa00]">-{detourPenalty.toFixed(1)}</span>
        </div>
      </div>

      {phase === "preparing" && (
        <div className="mt-auto rounded-lg bg-[#457b9d]/10 p-2 text-center text-[10px] text-[#457b9d]">
          点击"开始"后客流开始移动
        </div>
      )}
    </div>
  )
}
