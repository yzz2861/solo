import { useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Play, Pause, RotateCcw, Home } from "lucide-react"
import { useGameStore } from "@/store/gameStore"
import { useGameLoop } from "@/hooks/useGameLoop"
import { getAllLevels } from "@/utils/levelPresets"
import StationMap from "@/components/game/StationMap"
import ToolPanel from "@/components/game/ToolPanel"
import StatusBar from "@/components/game/StatusBar"
import EventBanner from "@/components/game/EventBanner"
import ScoreBoard from "@/components/game/ScoreBoard"

export default function GamePage() {
  const { levelId } = useParams()
  const navigate = useNavigate()
  const level = useGameStore(s => s.level)
  const phase = useGameStore(s => s.phase)
  const loadLevel = useGameStore(s => s.loadLevel)
  const startGame = useGameStore(s => s.startGame)
  const pauseGame = useGameStore(s => s.pauseGame)
  const resumeGame = useGameStore(s => s.resumeGame)
  const resetGame = useGameStore(s => s.resetGame)
  const tick = useGameStore(s => s.tick)

  useGameLoop(tick, phase === "running")

  useEffect(() => {
    if (!levelId) return
    const levels = getAllLevels()
    const found = levels.find(l => l.id === levelId)
    if (found) {
      loadLevel(found)
    }
  }, [levelId, loadLevel])

  if (!level) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-gray-500">未找到关卡</p>
          <button onClick={() => navigate("/")} className="text-sm text-[#457b9d] hover:underline">
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-[calc(100vh-56px)]">
      <ToolPanel />
      <div className="relative flex-1">
        <StationMap />
        <EventBanner />
        {phase === "finished" && <ScoreBoard />}
      </div>
      <StatusBar />

      <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
        {phase === "preparing" && (
          <button
            onClick={startGame}
            className="flex items-center gap-1.5 rounded-xl bg-[#2a9d8f] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#2a9d8f]/30 transition-all hover:scale-105 hover:bg-[#2a9d8f]/90"
          >
            <Play className="h-4 w-4" /> 开始调度
          </button>
        )}
        {phase === "running" && (
          <button
            onClick={pauseGame}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/15"
          >
            <Pause className="h-4 w-4" /> 暂停
          </button>
        )}
        {phase === "paused" && (
          <>
            <button
              onClick={resumeGame}
              className="flex items-center gap-1.5 rounded-xl bg-[#2a9d8f] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#2a9d8f]/90"
            >
              <Play className="h-4 w-4" /> 继续
            </button>
            <button
              onClick={resetGame}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-gray-300 backdrop-blur-sm transition-all hover:bg-white/15"
            >
              <RotateCcw className="h-4 w-4" /> 重来
            </button>
          </>
        )}
      </div>
    </div>
  )
}
