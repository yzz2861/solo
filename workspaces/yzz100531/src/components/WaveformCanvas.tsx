import { useRef, useEffect } from 'react'

interface WaveformCanvasProps {
  audioBuffer: AudioBuffer | null
  width?: number
  height?: number
  playbackTime?: number
  duration?: number
  marks?: { startTime: number; endTime: number; color: string }[]
}

export default function WaveformCanvas({
  audioBuffer,
  width = 800,
  height = 80,
  playbackTime = 0,
  duration = 0,
  marks = [],
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#0F1A30'
    ctx.fillRect(0, 0, width, height)

    if (!audioBuffer) return

    const data = audioBuffer.getChannelData(0)
    const step = Math.ceil(data.length / width)
    const midY = height / 2

    for (const mark of marks) {
      if (duration <= 0) continue
      const x1 = (mark.startTime / duration) * width
      const x2 = (mark.endTime / duration) * width
      ctx.fillStyle = mark.color + '33'
      ctx.fillRect(x1, 0, x2 - x1, height)
    }

    ctx.beginPath()
    ctx.strokeStyle = '#5BC0BE'
    ctx.lineWidth = 1

    for (let i = 0; i < width; i++) {
      let min = 1.0
      let max = -1.0
      for (let j = 0; j < step; j++) {
        const idx = i * step + j
        if (idx < data.length) {
          const datum = data[idx]
          if (datum < min) min = datum
          if (datum > max) max = datum
        }
      }
      const yMin = midY + min * midY * 0.9
      const yMax = midY + max * midY * 0.9
      ctx.moveTo(i, yMin)
      ctx.lineTo(i, yMax)
    }
    ctx.stroke()

    if (duration > 0 && playbackTime > 0) {
      const x = (playbackTime / duration) * width
      ctx.beginPath()
      ctx.strokeStyle = '#E8A838'
      ctx.lineWidth = 2
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
  }, [audioBuffer, width, height, playbackTime, duration, marks])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-lg"
    />
  )
}
