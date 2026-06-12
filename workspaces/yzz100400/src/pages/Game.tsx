import { useParams, useNavigate } from "react-router-dom"
import { useEffect } from "react"
import HexMap from "@/components/HexMap"
import DispatchPanel from "@/components/DispatchPanel"
import TidalIndicator from "@/components/TidalIndicator"
import ReplayPanel from "@/components/ReplayPanel"
import { useGameStore } from "@/store/gameStore"

export default function Game() {
  const { levelId } = useParams<{ levelId: string }>()
  const navigate = useNavigate()
  const phase = useGameStore((s) => s.phase)
  const currentLevelId = useGameStore((s) => s.currentLevelId)
  const currentTurn = useGameStore((s) => s.currentTurn)
  const maxTurns = useGameStore((s) => s.maxTurns)
  const startLevel = useGameStore((s) => s.startLevel)

  useEffect(() => {
    if (levelId && currentLevelId !== levelId) {
      startLevel(levelId)
    }
  }, [levelId, currentLevelId, startLevel])

  if (phase === "replay") {
    return (
      <div className="h-screen w-screen bg-[#0a1628]">
        <ReplayPanel />
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a1628]">
      <div className="h-12 flex items-center justify-between px-4 bg-[#0d1f3c] border-b border-[#1a3a5c] shrink-0">
        <span className="text-white font-bold text-sm">
          {currentLevelId ?? "—"}
        </span>
        <span className="text-[#7eb8da] text-sm">
          回合 {currentTurn}/{maxTurns}
        </span>
        <button
          onClick={() => navigate("/")}
          className="px-3 py-1 text-sm text-[#7eb8da] hover:text-white border border-[#1a3a5c] rounded hover:border-[#7eb8da] transition-colors"
        >
          返回
        </button>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="w-14 shrink-0">
          <TidalIndicator />
        </div>
        <div className="flex-1 min-w-0">
          <HexMap />
        </div>
        <div className="w-80 shrink-0 overflow-y-auto">
          <DispatchPanel />
        </div>
      </div>
    </div>
  )
}
