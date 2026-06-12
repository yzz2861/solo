import { useParams, useNavigate } from "react-router-dom"
import { useEffect } from "react"
import ReplayPanel from "@/components/ReplayPanel"
import { useGameStore } from "@/store/gameStore"
import { levels } from "@/data/levels"
import type { ReplaySession } from "@/types/game"
import { ArrowLeft } from "lucide-react"

export default function Replay() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const startReplay = useGameStore((s) => s.startReplay)
  const replaySession = useGameStore((s) => s.replaySession)

  useEffect(() => {
    if (!sessionId) return
    try {
      const raw = localStorage.getItem("tidal-rescue-replays")
      const sessions: ReplaySession[] = raw ? JSON.parse(raw) : []
      const session = sessions.find((s) => s.id === sessionId)
      if (session) {
        startReplay(session)
      }
    } catch {
      // ignore
    }
  }, [sessionId, startReplay])

  const levelName = replaySession
    ? levels.find((l) => l.id === replaySession.levelId)?.name ?? replaySession.levelId
    : ""

  if (!replaySession) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-4"
        style={{ background: "var(--ocean-deep)" }}
      >
        <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
          未找到复盘记录
        </p>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: "var(--tide-teal)" }}
        >
          <ArrowLeft size={16} />
          返回
        </button>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "var(--ocean-deep)" }}
    >
      <div className="glass-panel flex items-center justify-between px-6 py-3 m-3 mb-0">
        <h2
          className="font-display text-lg tracking-wider"
          style={{ color: "var(--tide-teal)" }}
        >
          复盘回放 - {levelName}
        </h2>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={16} />
          返回
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <ReplayPanel />
      </div>
    </div>
  )
}
