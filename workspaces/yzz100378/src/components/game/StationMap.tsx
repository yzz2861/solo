import { useRef, useEffect, useCallback } from "react"
import { useGameStore } from "@/store/gameStore"
import { LevelConfig, Passenger, GameTool } from "@/types"
import { getCellKey } from "@/engine/collision"

const COLORS = {
  bg: "#0f1225",
  grid: "rgba(255,255,255,0.05)",
  wall: "#2d3250",
  entrance: (c: string) => c,
  exit: (c: string) => c,
  escalator: "#f4a261",
  escalatorOff: "#6b4c2a",
  fence: "#ff6b6b",
  guide: "#00cc66",
  transferPoint: "#9b5de5",
  passenger_moving: "#457b9d",
  passenger_congested: "#ff4444",
  passenger_detouring: "#ffaa00",
  guideIcon: "#00cc66",
}

export default function StationMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const level = useGameStore(s => s.level)
  const phase = useGameStore(s => s.phase)
  const passengers = useGameStore(s => s.passengers)
  const fences = useGameStore(s => s.fences)
  const guides = useGameStore(s => s.guides)
  const escalatorStates = useGameStore(s => s.escalatorStates)
  const closedExits = useGameStore(s => s.closedExits)
  const selectedTool = useGameStore(s => s.selectedTool)
  const addFence = useGameStore(s => s.addFence)
  const removeFence = useGameStore(s => s.removeFence)
  const addGuide = useGameStore(s => s.addGuide)
  const removeGuide = useGameStore(s => s.removeGuide)
  const toggleEscalator = useGameStore(s => s.toggleEscalator)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !level) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { gridSize, cellSize } = level
    canvas.width = gridSize.cols * cellSize
    canvas.height = gridSize.rows * cellSize

    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let y = 0; y < gridSize.rows; y++) {
      for (let x = 0; x < gridSize.cols; x++) {
        ctx.strokeStyle = COLORS.grid
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize)
      }
    }

    for (const w of level.walls) {
      ctx.fillStyle = COLORS.wall
      ctx.fillRect(w.x * cellSize, w.y * cellSize, cellSize, cellSize)
    }

    for (const f of fences) {
      ctx.fillStyle = COLORS.fence
      ctx.globalAlpha = 0.7
      if (f.orientation === "h") {
        ctx.fillRect(f.x * cellSize, f.y * cellSize + cellSize * 0.4, cellSize, cellSize * 0.2)
      } else {
        ctx.fillRect(f.x * cellSize + cellSize * 0.4, f.y * cellSize, cellSize * 0.2, cellSize)
      }
      ctx.globalAlpha = 1
    }

    for (const ent of level.entrances) {
      ctx.fillStyle = COLORS.entrance(ent.color)
      ctx.globalAlpha = 0.3
      ctx.fillRect(ent.x * cellSize, ent.y * cellSize, cellSize, cellSize)
      ctx.globalAlpha = 1
      ctx.fillStyle = ent.color
      ctx.font = `bold ${Math.max(9, cellSize * 0.35)}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("入", ent.x * cellSize + cellSize / 2, ent.y * cellSize + cellSize / 2)
    }

    for (const ext of level.exits) {
      const isClosed = closedExits[ext.id]
      ctx.fillStyle = isClosed ? "#ff000033" : COLORS.exit(ext.color)
      ctx.globalAlpha = isClosed ? 0.3 : 0.3
      ctx.fillRect(ext.x * cellSize, ext.y * cellSize, cellSize, cellSize)
      ctx.globalAlpha = 1
      ctx.fillStyle = isClosed ? "#ff4444" : ext.color
      ctx.font = `bold ${Math.max(9, cellSize * 0.35)}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(isClosed ? "✕" : "出", ext.x * cellSize + cellSize / 2, ext.y * cellSize + cellSize / 2)
    }

    for (const esc of level.escalators) {
      const isOpen = escalatorStates[esc.id]
      ctx.fillStyle = isOpen ? COLORS.escalator : COLORS.escalatorOff
      ctx.globalAlpha = 0.5
      ctx.fillRect(esc.x * cellSize, esc.y * cellSize, cellSize, cellSize)
      ctx.globalAlpha = 1
      ctx.fillStyle = isOpen ? COLORS.escalator : COLORS.escalatorOff
      ctx.font = `${Math.max(8, cellSize * 0.4)}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(isOpen ? "⬆" : "⏸", esc.x * cellSize + cellSize / 2, esc.y * cellSize + cellSize / 2)
    }

    for (const tp of level.transferPoints) {
      ctx.fillStyle = COLORS.transferPoint
      ctx.globalAlpha = 0.2
      ctx.beginPath()
      ctx.arc(tp.x * cellSize + cellSize / 2, tp.y * cellSize + cellSize / 2, cellSize * 0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = COLORS.transferPoint
      ctx.font = `bold ${Math.max(7, cellSize * 0.3)}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("◆", tp.x * cellSize + cellSize / 2, tp.y * cellSize + cellSize / 2)
    }

    for (const g of guides) {
      ctx.fillStyle = COLORS.guideIcon
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      ctx.arc(g.x * cellSize + cellSize / 2, g.y * cellSize + cellSize / 2, cellSize * 0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = "#fff"
      ctx.font = `bold ${Math.max(8, cellSize * 0.35)}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("引", g.x * cellSize + cellSize / 2, g.y * cellSize + cellSize / 2)
    }

    for (const p of passengers) {
      if (p.state === "exited") continue
      let color = p.color
      if (p.state === "congested") color = COLORS.passenger_congested
      else if (p.state === "detouring") color = COLORS.passenger_detouring

      ctx.fillStyle = color
      ctx.globalAlpha = p.state === "congested" ? 0.6 + Math.sin(Date.now() / 200) * 0.4 : 0.85
      ctx.beginPath()
      ctx.arc(p.x * cellSize + cellSize / 2, p.y * cellSize + cellSize / 2, cellSize * 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }, [level, passengers, fences, guides, escalatorStates, closedExits])

  useEffect(() => {
    draw()
  }, [draw])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!level || phase === "finished") return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const px = (e.clientX - rect.left) * scaleX
    const py = (e.clientY - rect.top) * scaleY
    const gx = Math.floor(px / level.cellSize)
    const gy = Math.floor(py / level.cellSize)

    if (gx < 0 || gy < 0 || gx >= level.gridSize.cols || gy >= level.gridSize.rows) return

    if (selectedTool === "fence") {
      const isWall = level.walls.some(w => w.x === gx && w.y === gy)
      const isEntrance = level.entrances.some(en => en.x === gx && en.y === gy)
      const isExit = level.exits.some(ex => ex.x === gx && ex.y === gy)
      const isEscalator = level.escalators.some(es => es.x === gx && es.y === gy)
      if (!isWall && !isEntrance && !isExit && !isEscalator) {
        const existing = fences.find(f => f.x === gx && f.y === gy)
        if (existing) {
          removeFence(existing.id)
        } else {
          addFence(gx, gy, "h")
        }
      }
    } else if (selectedTool === "guide") {
      const existingGuide = guides.find(g => g.x === gx && g.y === gy)
      if (existingGuide) {
        removeGuide(existingGuide.id)
      } else {
        const firstEntrance = level.entrances[0]
        if (firstEntrance) {
          addGuide(gx, gy, firstEntrance.id)
        }
      }
    } else if (selectedTool === "escalator") {
      const esc = level.escalators.find(es => es.x === gx && es.y === gy)
      if (esc) {
        toggleEscalator(esc.id)
      }
    } else if (selectedTool === "erase") {
      const fenceAtPos = fences.find(f => f.x === gx && f.y === gy)
      if (fenceAtPos) {
        removeFence(fenceAtPos.id)
        return
      }
      const guideAtPos = guides.find(g => g.x === gx && g.y === gy)
      if (guideAtPos) {
        removeGuide(guideAtPos.id)
      }
    }
  }, [level, phase, selectedTool, fences, guides, addFence, removeFence, addGuide, removeGuide, toggleEscalator])

  if (!level) return <div className="flex h-full items-center justify-center text-gray-500">加载中...</div>

  return (
    <div ref={containerRef} className="flex h-full items-center justify-center overflow-auto p-2">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="rounded-lg shadow-xl"
        style={{ imageRendering: "pixelated", maxWidth: "100%", maxHeight: "100%" }}
      />
    </div>
  )
}
