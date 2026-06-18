import { useRef, useEffect } from 'react'
import type { PitchFrame, NoteTarget, PracticeMark } from '@/types'

interface PitchCurveCanvasProps {
  pitchFrames: PitchFrame[]
  targetNotes: NoteTarget[]
  duration: number
  marks: PracticeMark[]
  width?: number
  height?: number
  zoomLevel?: number
  onMarkAdd?: (startTime: number, endTime: number) => void
  onSegmentClick?: (startTime: number) => void
}

export default function PitchCurveCanvas({
  pitchFrames,
  targetNotes,
  duration,
  marks,
  width = 800,
  height = 360,
  zoomLevel = 1,
  onMarkAdd,
  onSegmentClick,
}: PitchCurveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef(0)

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

    const padding = { top: 30, bottom: 30, left: 60, right: 20 }
    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom

    const allFreqs = pitchFrames.map((f) => f.frequency).filter((f) => f > 0)
    const targetFreqs = targetNotes.map((n) => n.frequency)
    const allTargetFreqs = targetFreqs.length > 0 ? targetFreqs : [440]

    const minFreq = Math.min(
      allFreqs.length > 0 ? Math.min(...allFreqs) : 200,
      Math.min(...allTargetFreqs)
    ) * 0.8
    const maxFreq = Math.max(
      allFreqs.length > 0 ? Math.max(...allFreqs) : 800,
      Math.max(...allTargetFreqs)
    ) * 1.2

    const freqToY = (freq: number) => {
      const logMin = Math.log2(Math.max(minFreq, 20))
      const logMax = Math.log2(maxFreq)
      const logFreq = Math.log2(Math.max(freq, 20))
      const ratio = (logFreq - logMin) / (logMax - logMin)
      return padding.top + chartH * (1 - ratio)
    }

    const timeToX = (time: number) => {
      return padding.left + (time / duration) * chartW * zoomLevel
    }

    ctx.strokeStyle = '#1a2a4a'
    ctx.lineWidth = 0.5
    const noteLabels = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
    for (let octave = 2; octave <= 6; octave++) {
      for (const note of noteLabels) {
        const freq = 440 * Math.pow(2, ((octave - 4) * 12 + ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(note) * 2 - 9) / 12)
        if (freq < minFreq || freq > maxFreq) continue
        const y = freqToY(freq)
        ctx.beginPath()
        ctx.strokeStyle = '#1a2a4a'
        ctx.moveTo(padding.left, y)
        ctx.lineTo(width - padding.right, y)
        ctx.stroke()
        ctx.fillStyle = '#555'
        ctx.font = '10px DM Sans'
        ctx.fillText(`${note}${octave}`, 4, y + 3)
      }
    }

    for (let t = 0; t <= duration; t += Math.max(1, Math.floor(duration / 10))) {
      const x = timeToX(t)
      ctx.beginPath()
      ctx.strokeStyle = '#1a2a4a'
      ctx.moveTo(x, padding.top)
      ctx.lineTo(x, height - padding.bottom)
      ctx.stroke()
      ctx.fillStyle = '#555'
      ctx.font = '10px DM Sans'
      ctx.fillText(`${t.toFixed(0)}s`, x - 8, height - padding.bottom + 14)
    }

    for (const mark of marks) {
      const x1 = timeToX(mark.startTime)
      const x2 = timeToX(mark.endTime)
      ctx.fillStyle = mark.color + '22'
      ctx.fillRect(x1, padding.top, x2 - x1, chartH)
      ctx.strokeStyle = mark.color + '66'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(x1, padding.top)
      ctx.lineTo(x1, height - padding.bottom)
      ctx.stroke()
      ctx.moveTo(x2, padding.top)
      ctx.lineTo(x2, height - padding.bottom)
      ctx.stroke()
      ctx.setLineDash([])
    }

    if (targetNotes.length > 0) {
      const totalDur = targetNotes.reduce((s, n) => s + n.duration, 0)
      let currentTime = 0
      for (const note of targetNotes) {
        const noteDur = (note.duration / totalDur) * duration
        const x1 = timeToX(currentTime)
        const x2 = timeToX(currentTime + noteDur)
        const y = freqToY(note.frequency)

        ctx.strokeStyle = '#E8A838'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.moveTo(x1, y)
        ctx.lineTo(x2, y)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.fillStyle = '#E8A83888'
        ctx.font = '11px DM Sans'
        ctx.fillText(note.name, x1 + 4, y - 6)

        currentTime += noteDur
      }
    }

    if (pitchFrames.length > 0) {
      ctx.beginPath()
      ctx.strokeStyle = '#5BC0BE'
      ctx.lineWidth = 2
      let started = false
      for (const frame of pitchFrames) {
        if (frame.frequency <= 0 || frame.confidence < 0.3) {
          started = false
          continue
        }
        const x = timeToX(frame.time)
        const y = freqToY(frame.frequency)
        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      ctx.beginPath()
      ctx.strokeStyle = '#5BC0BE33'
      ctx.lineWidth = 6
      started = false
      for (const frame of pitchFrames) {
        if (frame.frequency <= 0 || frame.confidence < 0.3) {
          started = false
          continue
        }
        const x = timeToX(frame.time)
        const y = freqToY(frame.frequency)
        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
    }

    ctx.strokeStyle = '#E8A83866'
    ctx.lineWidth = 1
    ctx.strokeRect(padding.left, padding.top, chartW, chartH)
  }, [pitchFrames, targetNotes, duration, marks, width, height, zoomLevel])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onMarkAdd) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const padding = { left: 60, right: 20 }
    const chartW = width - padding.left - padding.right
    const time = ((x - padding.left) / chartW / zoomLevel) * duration
    isDraggingRef.current = true
    dragStartRef.current = time
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !onMarkAdd) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const padding = { left: 60, right: 20 }
    const chartW = width - padding.left - padding.right
    const time = ((x - padding.left) / chartW / zoomLevel) * duration
    isDraggingRef.current = false
    if (Math.abs(time - dragStartRef.current) > 0.1) {
      onMarkAdd(Math.min(dragStartRef.current, time), Math.max(dragStartRef.current, time))
    } else if (onSegmentClick) {
      onSegmentClick(time)
    }
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-lg cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    />
  )
}
