import { useRef, useEffect, useCallback } from "react"
import { useEditorStore } from "@/store/editorStore"
import { EditorTool } from "@/types"

const TOOL_COLORS: Record<EditorTool, string> = {
  wall: "#2d3250",
  passage: "#457b9d",
  entrance: "#2a9d8f",
  exit: "#e63946",
  escalator: "#f4a261",
  transfer: "#9b5de5",
  fence: "#ff6b6b",
  select: "#ffffff",
  erase: "#ff4444",
}

export default function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const level = useEditorStore(s => s.level)
  const selectedTool = useEditorStore(s => s.selectedTool)
  const addWall = useEditorStore(s => s.addWall)
  const removeWall = useEditorStore(s => s.removeWall)
  const addEntrance = useEditorStore(s => s.addEntrance)
  const addExit = useEditorStore(s => s.addExit)
  const addEscalator = useEditorStore(s => s.addEscalator)
  const addTransferPoint = useEditorStore(s => s.addTransferPoint)

  const gridSize = level.gridSize || { cols: 20, rows: 15 }
  const cellSize = level.cellSize || 32

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = gridSize.cols * cellSize
    canvas.height = gridSize.rows * cellSize

    ctx.fillStyle = "#0f1225"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let y = 0; y < gridSize.rows; y++) {
      for (let x = 0; x < gridSize.cols; x++) {
        ctx.strokeStyle = "rgba(255,255,255,0.05)"
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize)
      }
    }

    for (const w of level.walls || []) {
      ctx.fillStyle = "#2d3250"
      ctx.fillRect(w.x * cellSize, w.y * cellSize, cellSize, cellSize)
    }

    for (const ent of level.entrances || []) {
      ctx.fillStyle = ent.color || "#2a9d8f"
      ctx.globalAlpha = 0.4
      ctx.fillRect(ent.x * cellSize, ent.y * cellSize, cellSize, cellSize)
      ctx.globalAlpha = 1
      ctx.fillStyle = "#fff"
      ctx.font = `bold ${Math.max(9, cellSize * 0.35)}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("入", ent.x * cellSize + cellSize / 2, ent.y * cellSize + cellSize / 2)
    }

    for (const ext of level.exits || []) {
      ctx.fillStyle = ext.color || "#e63946"
      ctx.globalAlpha = 0.4
      ctx.fillRect(ext.x * cellSize, ext.y * cellSize, cellSize, cellSize)
      ctx.globalAlpha = 1
      ctx.fillStyle = "#fff"
      ctx.font = `bold ${Math.max(9, cellSize * 0.35)}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("出", ext.x * cellSize + cellSize / 2, ext.y * cellSize + cellSize / 2)
    }

    for (const esc of level.escalators || []) {
      ctx.fillStyle = "#f4a261"
      ctx.globalAlpha = 0.4
      ctx.fillRect(esc.x * cellSize, esc.y * cellSize, cellSize, cellSize)
      ctx.globalAlpha = 1
      ctx.fillStyle = "#fff"
      ctx.font = `${Math.max(8, cellSize * 0.4)}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(esc.direction === "up" ? "⬆" : "⬇", esc.x * cellSize + cellSize / 2, esc.y * cellSize + cellSize / 2)
    }

    for (const tp of level.transferPoints || []) {
      ctx.fillStyle = "#9b5de5"
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.arc(tp.x * cellSize + cellSize / 2, tp.y * cellSize + cellSize / 2, cellSize * 0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = "#fff"
      ctx.font = `bold ${Math.max(8, cellSize * 0.3)}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("◆", tp.x * cellSize + cellSize / 2, tp.y * cellSize + cellSize / 2)
    }
  }, [level, gridSize, cellSize])

  useEffect(() => { draw() }, [draw])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const px = (e.clientX - rect.left) * scaleX
    const py = (e.clientY - rect.top) * scaleY
    const gx = Math.floor(px / cellSize)
    const gy = Math.floor(py / cellSize)

    if (gx < 0 || gy < 0 || gx >= gridSize.cols || gy >= gridSize.rows) return

    if (selectedTool === "wall") {
      const isWall = (level.walls || []).some(w => w.x === gx && w.y === gy)
      if (isWall) {
        removeWall(gx, gy)
      } else {
        addWall(gx, gy)
      }
    } else if (selectedTool === "entrance") {
      const id = `ent_${Date.now()}`
      addEntrance({
        id, x: gx, y: gy, label: `入口${(level.entrances || []).length + 1}`,
        color: ["#457b9d", "#2a9d8f", "#e63946", "#f4a261", "#9b5de5"][(level.entrances || []).length % 5],
        passengerRate: 1.5, destinationIds: (level.exits || []).map(ex => ex.id).slice(0, 2)
      })
    } else if (selectedTool === "exit") {
      const id = `ext_${Date.now()}`
      addExit({
        id, x: gx, y: gy, label: `${String.fromCharCode(65 + (level.exits || []).length)}出口`,
        color: ["#e63946", "#457b9d", "#2a9d8f", "#f4a261", "#9b5de5"][(level.exits || []).length % 5]
      })
    } else if (selectedTool === "escalator") {
      const id = `esc_${Date.now()}`
      addEscalator({
        id, x: gx, y: gy, direction: "up", capacity: 6, initiallyOpen: true
      })
    } else if (selectedTool === "transfer") {
      const id = `tp_${Date.now()}`
      addTransferPoint({
        id, x: gx, y: gy, label: `换乘口${(level.transferPoints || []).length + 1}`
      })
    } else if (selectedTool === "erase") {
      removeWall(gx, gy)
    }
  }, [selectedTool, level, cellSize, gridSize, addWall, removeWall, addEntrance, addExit, addEscalator, addTransferPoint])

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-2">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="rounded-lg shadow-xl cursor-crosshair"
        style={{ imageRendering: "pixelated", maxWidth: "100%", maxHeight: "100%" }}
      />
    </div>
  )
}
