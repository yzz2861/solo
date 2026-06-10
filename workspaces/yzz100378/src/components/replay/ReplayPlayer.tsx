import { useRef, useEffect, useState, useCallback } from "react"
import { Play, Pause, SkipBack, SkipForward } from "lucide-react"
import { ReplayFrame, LevelConfig } from "@/types"

interface Props {
  frames: ReplayFrame[]
  level: LevelConfig
}

export default function ReplayPlayer({ frames, level }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    if (!playing || frames.length === 0) return
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= frames.length - 1) {
          setPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 1000 / (30 * speed))
    return () => clearInterval(interval)
  }, [playing, speed, frames.length])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const frame = frames[currentIndex]
    if (!frame) return

    const { gridSize, cellSize } = level
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

    for (const w of level.walls) {
      ctx.fillStyle = "#2d3250"
      ctx.fillRect(w.x * cellSize, w.y * cellSize, cellSize, cellSize)
    }

    for (const ent of level.entrances) {
      ctx.fillStyle = ent.color
      ctx.globalAlpha = 0.3
      ctx.fillRect(ent.x * cellSize, ent.y * cellSize, cellSize, cellSize)
      ctx.globalAlpha = 1
    }

    for (const ext of level.exits) {
      ctx.fillStyle = ext.color
      ctx.globalAlpha = 0.3
      ctx.fillRect(ext.x * cellSize, ext.y * cellSize, cellSize, cellSize)
      ctx.globalAlpha = 1
    }

    if (frame.congestionHeatmap) {
      for (let y = 0; y < gridSize.rows && y < frame.congestionHeatmap.length; y++) {
        for (let x = 0; x < gridSize.cols && x < frame.congestionHeatmap[y].length; x++) {
          const val = frame.congestionHeatmap[y][x]
          if (val > 4) {
            ctx.fillStyle = `rgba(255, 68, 68, ${Math.min(0.6, val * 0.08)})`
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
          }
        }
      }
    }

    for (const p of frame.passengers) {
      let color = "#457b9d"
      if (p.state === "congested") color = "#ff4444"
      else if (p.state === "detouring") color = "#ffaa00"
      ctx.fillStyle = color
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.arc(p.x * cellSize + cellSize / 2, p.y * cellSize + cellSize / 2, cellSize * 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }, [frames, currentIndex, level])

  useEffect(() => { draw() }, [draw])

  return (
    <div>
      <div className="flex items-center justify-center overflow-auto">
        <canvas ref={canvasRef} className="rounded-lg shadow-xl" style={{ imageRendering: "pixelated", maxWidth: "100%" }} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={() => { setCurrentIndex(0); setPlaying(false) }} className="text-gray-400 hover:text-white">
          <SkipBack className="h-4 w-4" />
        </button>
        <button onClick={() => setPlaying(!playing)} className="rounded-full bg-[#457b9d] p-2 text-white hover:bg-[#457b9d]/80">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button onClick={() => { setCurrentIndex(frames.length - 1); setPlaying(false) }} className="text-gray-400 hover:text-white">
          <SkipForward className="h-4 w-4" />
        </button>
        <input
          type="range" min={0} max={Math.max(0, frames.length - 1)}
          value={currentIndex}
          onChange={e => { setCurrentIndex(parseInt(e.target.value)); setPlaying(false) }}
          className="flex-1"
        />
        <span className="text-xs tabular-nums text-gray-500">
          {frames[currentIndex]?.timestamp.toFixed(1) || "0.0"}s
        </span>
        <select
          value={speed}
          onChange={e => setSpeed(parseFloat(e.target.value))}
          className="rounded bg-[#1a1f36] px-1 py-0.5 text-xs text-white border border-white/10"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </div>
    </div>
  )
}
