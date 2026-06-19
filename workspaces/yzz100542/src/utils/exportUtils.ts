import * as THREE from 'three'
import type { SceneLayout } from '@/store/useStore'
import { calculateAllBlindZones, TRUCK_LENGTH, TRUCK_WIDTH, CAB_LENGTH } from './blindZoneCalc'

export function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function captureCurrentCanvas(): Promise<string> {
  const canvas = document.querySelector('canvas')
  if (!canvas) throw new Error('Canvas not found')
  await sleep(200)
  return canvas.toDataURL('image/png')
}

export async function captureWithMode(
  mode: 'overview' | 'driver',
  setCameraMode: (mode: 'overview' | 'driver') => void,
  currentMode: 'overview' | 'driver'
): Promise<{ dataUrl: string; restore: () => void }> {
  const restore = () => setCameraMode(currentMode)
  setCameraMode(mode)
  await sleep(800)
  const canvas = document.querySelector('canvas')
  if (!canvas) throw new Error('Canvas not found')
  const dataUrl = canvas.toDataURL('image/png')
  return { dataUrl, restore }
}

export interface ExportAnnotationData {
  layout: SceneLayout
  turnAngle: number
}

const MAP_BOUNDS = {
  minX: -15,
  maxX: 25,
  minZ: -18,
  maxZ: 20,
}

const EXPORT_SIZE = {
  width: 1280,
  height: 960,
}

function worldToScreen(
  x: number,
  z: number,
  bounds = MAP_BOUNDS,
  size = EXPORT_SIZE
): { sx: number; sy: number } {
  const scaleX = size.width / (bounds.maxX - bounds.minX)
  const scaleY = size.height / (bounds.maxZ - bounds.minZ)
  const scale = Math.min(scaleX, scaleY)
  const offsetX = (size.width - (bounds.maxX - bounds.minX) * scale) / 2
  const offsetY = (size.height - (bounds.maxZ - bounds.minZ) * scale) / 2
  return {
    sx: (x - bounds.minX) * scale + offsetX,
    sy: (z - bounds.minZ) * scale + offsetY,
  }
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  fillStyle: string,
  strokeStyle?: string,
  lineWidth = 2
) {
  if (points.length < 3) return
  ctx.beginPath()
  const first = worldToScreen(points[0][0], points[0][1])
  ctx.moveTo(first.sx, first.sy)
  for (let i = 1; i < points.length; i++) {
    const p = worldToScreen(points[i][0], points[i][1])
    ctx.lineTo(p.sx, p.sy)
  }
  ctx.closePath()
  ctx.fillStyle = fillStyle
  ctx.fill()
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = lineWidth
    ctx.stroke()
  }
}

function drawTruck(
  ctx: CanvasRenderingContext2D,
  x: number,
  z: number,
  rotation: number
) {
  ctx.save()
  const center = worldToScreen(x, z)
  ctx.translate(center.sx, center.sy)
  ctx.rotate(rotation)

  const scale = Math.min(
    EXPORT_SIZE.width / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX),
    EXPORT_SIZE.height / (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ)
  )
  const w = TRUCK_WIDTH * scale
  const l = TRUCK_LENGTH * scale
  const cl = CAB_LENGTH * scale

  ctx.fillStyle = '#D4881C'
  ctx.strokeStyle = '#8B4513'
  ctx.lineWidth = 2

  ctx.fillRect(-w / 2, -l / 2, w, l - cl)
  ctx.strokeRect(-w / 2, -l / 2, w, l - cl)

  ctx.fillStyle = '#E8A02A'
  ctx.fillRect(-w / 2 + 2, l / 2 - cl, w - 4, cl - 4)
  ctx.strokeRect(-w / 2 + 2, l / 2 - cl, w - 4, cl - 4)

  ctx.fillStyle = '#88ccee'
  ctx.fillRect(-w / 2 + 6, l / 2 - cl + 4, w - 12, cl * 0.4)

  ctx.restore()
}

function drawGate(ctx: CanvasRenderingContext2D, x: number, z: number) {
  const center = worldToScreen(x, z)
  const scale = Math.min(
    EXPORT_SIZE.width / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX),
    EXPORT_SIZE.height / (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ)
  )
  const w = 10 * scale
  const h = 3.5 * scale

  ctx.fillStyle = '#888899'
  ctx.fillRect(center.sx - w / 2 - 4, center.sy - h / 2, 8, h)
  ctx.fillRect(center.sx + w / 2 - 4, center.sy - h / 2, 8, h)

  ctx.fillStyle = '#FF6B35'
  ctx.fillRect(center.sx - w / 2, center.sy - h / 2 + 8, w, 4)

  ctx.fillStyle = 'rgba(255, 107, 53, 0.8)'
  ctx.fillRect(center.sx - w / 4, center.sy - 8, w / 2, 16)
  ctx.strokeStyle = '#FF6B35'
  ctx.lineWidth = 1
  ctx.strokeRect(center.sx - w / 4, center.sy - 8, w / 2, 16)
}

function drawBarrier(
  ctx: CanvasRenderingContext2D,
  x: number,
  z: number,
  rotation: number,
  length: number,
  isTemp = false
) {
  const center = worldToScreen(x, z)
  const scale = Math.min(
    EXPORT_SIZE.width / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX),
    EXPORT_SIZE.height / (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ)
  )
  const len = length * scale

  ctx.save()
  ctx.translate(center.sx, center.sy)
  ctx.rotate(rotation)

  ctx.fillStyle = isTemp ? '#FF6B35' : '#778899'
  ctx.fillRect(-3, -len / 2, 6, len)

  const postCount = Math.max(2, Math.ceil(length / 2) + 1)
  for (let i = 0; i < postCount; i++) {
    const t = i / (postCount - 1)
    const py = -len / 2 + t * len
    ctx.fillStyle = isTemp ? '#FF6B35' : '#8899AA'
    ctx.fillRect(-5, py - 4, 10, 8)
  }

  ctx.restore()
}

function drawWalkway(
  ctx: CanvasRenderingContext2D,
  x: number,
  z: number,
  rotation: number,
  width: number,
  length: number
) {
  const center = worldToScreen(x, z)
  const scale = Math.min(
    EXPORT_SIZE.width / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX),
    EXPORT_SIZE.height / (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ)
  )
  const w = width * scale
  const l = length * scale

  ctx.save()
  ctx.translate(center.sx, center.sy)
  ctx.rotate(rotation)

  ctx.fillStyle = '#4a4a7e'
  ctx.fillRect(-w / 2, -l / 2, w, l)

  ctx.fillStyle = '#3a3a5e'
  ctx.fillRect(-w / 2 + 4, -l / 2 + 4, w - 8, l - 8)

  const stripeCount = Math.floor(length / 1.2)
  for (let i = 0; i < stripeCount; i++) {
    const sz = -l / 2 + (0.6 + i * 1.2) * scale
    ctx.fillStyle = '#FFD166'
    ctx.fillRect(-w / 2 + 10, sz, w - 20, 0.3 * scale)
  }

  ctx.strokeStyle = '#2EC4B6'
  ctx.lineWidth = 3
  ctx.strokeRect(-w / 2, -l / 2, w, l)

  ctx.restore()
}

function drawCommander(ctx: CanvasRenderingContext2D, x: number, z: number) {
  const pos = worldToScreen(x, z)
  const scale = Math.min(
    EXPORT_SIZE.width / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX),
    EXPORT_SIZE.height / (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ)
  )
  const r = 1.2 * scale

  ctx.fillStyle = 'rgba(255, 107, 53, 0.6)'
  ctx.beginPath()
  ctx.arc(pos.sx, pos.sy, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#FF6B35'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#FF6B35'
  ctx.font = `bold ${Math.max(10, r * 0.8)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('指', pos.sx, pos.sy)
}

function drawTurnPath(ctx: CanvasRenderingContext2D, gateZ: number, startZ: number) {
  const R = 8
  ctx.strokeStyle = '#FFD166'
  ctx.lineWidth = 3
  ctx.setLineDash([12, 6])

  ctx.beginPath()

  const p1 = worldToScreen(0, startZ)
  ctx.moveTo(p1.sx, p1.sy)

  const p2 = worldToScreen(0, gateZ + 1)
  ctx.lineTo(p2.sx, p2.sy)

  const arcSteps = 32
  for (let i = 1; i <= arcSteps; i++) {
    const t = i / arcSteps
    const angle = t * (Math.PI / 2)
    const x = R * (1 - Math.cos(angle))
    const z = gateZ - R * Math.sin(angle)
    const p = worldToScreen(x, z)
    ctx.lineTo(p.sx, p.sy)
  }

  const p3 = worldToScreen(R + 10, gateZ - R)
  ctx.lineTo(p3.sx, p3.sy)
  ctx.stroke()
  ctx.setLineDash([])

  const arrowPos = worldToScreen(R + 6, gateZ - R)
  ctx.fillStyle = '#FFD166'
  ctx.beginPath()
  ctx.moveTo(arrowPos.sx + 12, arrowPos.sy)
  ctx.lineTo(arrowPos.sx - 4, arrowPos.sy - 8)
  ctx.lineTo(arrowPos.sx - 4, arrowPos.sy + 8)
  ctx.closePath()
  ctx.fill()
}

function drawSafeZoneMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  z: number,
  label: string
) {
  const pos = worldToScreen(x, z)
  const r = 14

  ctx.fillStyle = 'rgba(46, 196, 182, 0.35)'
  ctx.beginPath()
  ctx.arc(pos.sx, pos.sy, r + 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#2EC4B6'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(pos.sx, pos.sy, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = '#2EC4B6'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, pos.sx, pos.sy)
}

function drawDangerZoneMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  z: number,
  label: string
) {
  const pos = worldToScreen(x, z)
  const r = 16

  ctx.fillStyle = 'rgba(230, 57, 70, 0.35)'
  ctx.beginPath()
  ctx.arc(pos.sx, pos.sy, r + 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#E63946'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(pos.sx, pos.sy, r, 0, Math.PI * 2)
  ctx.stroke()

  const s = 7
  ctx.strokeStyle = '#E63946'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(pos.sx - s, pos.sy - s)
  ctx.lineTo(pos.sx + s, pos.sy + s)
  ctx.moveTo(pos.sx + s, pos.sy - s)
  ctx.lineTo(pos.sx - s, pos.sy + s)
  ctx.stroke()

  ctx.fillStyle = '#E63946'
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label, pos.sx, pos.sy + r + 12)
}

function drawLegend(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const legendH = 56
  ctx.fillStyle = 'rgba(18, 18, 42, 0.92)'
  ctx.fillRect(0, height - legendH, width, legendH)

  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, height - legendH)
  ctx.lineTo(width, height - legendH)
  ctx.stroke()

  let x = 24
  const cy = height - legendH / 2

  ctx.fillStyle = '#2EC4B6'
  ctx.beginPath()
  ctx.arc(x, cy, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('安全站位', x + 16, cy)

  x += 120
  ctx.fillStyle = '#E63946'
  ctx.beginPath()
  ctx.arc(x, cy, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText('禁止停留区', x + 16, cy)

  x += 130
  ctx.setLineDash([8, 4])
  ctx.strokeStyle = '#FFD166'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x - 10, cy)
  ctx.lineTo(x + 20, cy)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#ffffff'
  ctx.fillText('转弯路径', x + 32, cy)

  x += 120
  ctx.fillStyle = 'rgba(230, 57, 70, 0.4)'
  ctx.fillRect(x - 10, cy - 8, 30, 16)
  ctx.strokeStyle = '#E63946'
  ctx.lineWidth = 1.5
  ctx.strokeRect(x - 10, cy - 8, 30, 16)
  ctx.fillStyle = '#ffffff'
  ctx.fillText('盲区范围', x + 28, cy)
}

export function generateAnnotatedTopView(data: ExportAnnotationData): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = EXPORT_SIZE.width
    canvas.height = EXPORT_SIZE.height
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#0d0d1a'
    ctx.fillRect(0, 0, EXPORT_SIZE.width, EXPORT_SIZE.height)

    const scale = Math.min(
      EXPORT_SIZE.width / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX),
      EXPORT_SIZE.height / (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ)
    )
    const gridSize = 2 * scale
    const offsetX = (EXPORT_SIZE.width - (MAP_BOUNDS.maxX - MAP_BOUNDS.minX) * scale) / 2
    const offsetY = (EXPORT_SIZE.height - (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ) * scale) / 2

    ctx.strokeStyle = 'rgba(51, 51, 85, 0.6)'
    ctx.lineWidth = 1
    for (let gx = 0; gx <= (MAP_BOUNDS.maxX - MAP_BOUNDS.minX); gx += 2) {
      const x = offsetX + gx * scale
      ctx.beginPath()
      ctx.moveTo(x, offsetY)
      ctx.lineTo(x, EXPORT_SIZE.height - 56 - offsetY)
      ctx.stroke()
    }
    for (let gz = 0; gz <= (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ); gz += 2) {
      const y = offsetY + gz * scale
      ctx.beginPath()
      ctx.moveTo(offsetX, y)
      ctx.lineTo(EXPORT_SIZE.width - offsetX, y)
      ctx.stroke()
    }

    drawTurnPath(ctx, data.layout.gate.z, Math.max(data.layout.gate.z + 14, data.layout.truck.z))

    const blindZones = calculateAllBlindZones(
      data.layout.truck.x,
      data.layout.truck.z,
      data.layout.truck.rotation,
      data.turnAngle
    )

    drawPolygon(ctx, blindZones.sideZone, 'rgba(230, 57, 70, 0.25)', 'rgba(230, 57, 70, 0.5)', 1.5)
    drawPolygon(ctx, blindZones.apillarZone, 'rgba(230, 57, 70, 0.3)', 'rgba(230, 57, 70, 0.55)', 1.5)
    if (blindZones.innerWheelZone.length > 0) {
      drawPolygon(ctx, blindZones.innerWheelZone, 'rgba(255, 34, 68, 0.3)', 'rgba(255, 34, 68, 0.6)', 1.5)
    }

    data.layout.barriers.forEach((b) => {
      drawBarrier(ctx, b.x, b.z, b.rotation, b.length, false)
    })

    drawWalkway(
      ctx,
      data.layout.walkway.x,
      data.layout.walkway.z,
      data.layout.walkway.rotation,
      data.layout.walkway.width,
      data.layout.walkway.length
    )

    drawGate(ctx, data.layout.gate.x, data.layout.gate.z)

    drawTruck(ctx, data.layout.truck.x, data.layout.truck.z, data.layout.truck.rotation)

    drawCommander(ctx, data.layout.commander.x, data.layout.commander.z)

    data.layout.tempBarriers.forEach((b) => {
      drawBarrier(ctx, b.x, b.z, b.rotation, 3, true)
    })

    drawSafeZoneMarker(ctx, -4, -6, '安全')
    drawSafeZoneMarker(ctx, -4, 8, '安全')
    drawDangerZoneMarker(ctx, 3, -2, '危险')
    drawDangerZoneMarker(ctx, 1, 0, '盲区')

    drawLegend(ctx, EXPORT_SIZE.width, EXPORT_SIZE.height)

    ctx.fillStyle = 'rgba(18, 18, 42, 0.85)'
    ctx.fillRect(0, 0, EXPORT_SIZE.width, 52)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.moveTo(0, 52)
    ctx.lineTo(EXPORT_SIZE.width, 52)
    ctx.stroke()

    ctx.fillStyle = '#FF6B35'
    ctx.font = 'bold 18px "Noto Sans SC", sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('🚧 土方车盲区安全交底图', 24, 26)

    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`生成时间: ${new Date().toLocaleString('zh-CN')}`, EXPORT_SIZE.width - 24, 26)

    resolve(canvas.toDataURL('image/png'))
  })
}

export function generateDriverViewEducation(baseImage: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!

      ctx.drawImage(img, 0, 0)

      const W = img.width
      const H = img.height

      const blindAreas = [
        {
          points: [
            { x: W * 0.62, y: H * 0.35 },
            { x: W * 0.95, y: H * 0.3 },
            { x: W * 1.0, y: H * 0.6 },
            { x: W * 0.98, y: H * 1.0 },
            { x: W * 0.85, y: H * 1.0 },
            { x: W * 0.55, y: H * 0.65 },
          ],
          label: '右侧盲区',
          labelX: W * 0.8,
          labelY: H * 0.72,
        },
        {
          points: [
            { x: W * 0.45, y: H * 0.32 },
            { x: W * 0.6, y: H * 0.3 },
            { x: W * 0.6, y: H * 0.5 },
            { x: W * 0.42, y: H * 0.48 },
          ],
          label: 'A柱盲区',
          labelX: W * 0.51,
          labelY: H * 0.4,
        },
      ]

      blindAreas.forEach((area) => {
        ctx.beginPath()
        ctx.moveTo(area.points[0].x, area.points[0].y)
        for (let i = 1; i < area.points.length; i++) {
          ctx.lineTo(area.points[i].x, area.points[i].y)
        }
        ctx.closePath()
        const gradient = ctx.createLinearGradient(0, 0, W, H)
        gradient.addColorStop(0, 'rgba(230, 57, 70, 0.35)')
        gradient.addColorStop(1, 'rgba(230, 57, 70, 0.18)')
        ctx.fillStyle = gradient
        ctx.fill()
        ctx.strokeStyle = 'rgba(230, 57, 70, 0.8)'
        ctx.lineWidth = 2.5
        ctx.setLineDash([8, 4])
        ctx.stroke()
        ctx.setLineDash([])

        ctx.fillStyle = 'rgba(230, 57, 70, 0.9)'
        const padding = 8
        const textW = ctx.measureText(area.label).width + 8
        ctx.font = 'bold 14px sans-serif'
        const tw = ctx.measureText(area.label).width
        ctx.fillRect(area.labelX - tw / 2 - padding, area.labelY - 12, tw + padding * 2, 24)
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(area.label, area.labelX, area.labelY)
      })

      const headerH = 56
      ctx.fillStyle = 'rgba(230, 57, 70, 0.92)'
      ctx.fillRect(0, 0, W, headerH)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px "Noto Sans SC", sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('⚠️ 班前教育：司机第一人称视角 - 你看不到的危险区域', 24, headerH / 2)

      const footerH = 90
      ctx.fillStyle = 'rgba(18, 18, 42, 0.94)'
      ctx.fillRect(0, H - footerH, W, footerH)

      ctx.fillStyle = '#FFD166'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('✅ 新工人必知：', 24, H - footerH + 24)

      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = '12px sans-serif'
      const lines = [
        '1. 车辆右前方45°和右侧3米范围是司机最容易忽视的盲区',
        '2. 指挥员必须站在车辆左前方，确保司机能从左侧车窗看到你',
        '3. 右转弯内轮差区域最危险，前轮通过不代表后轮安全',
      ]
      lines.forEach((line, i) => {
        ctx.fillText(line, 28, H - footerH + 48 + i * 18)
      })

      resolve(canvas.toDataURL('image/png'))
    }
    img.src = baseImage
  })
}

export function generateTempBarrierSetup(data: ExportAnnotationData): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = EXPORT_SIZE.width
    canvas.height = EXPORT_SIZE.height
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#0d0d1a'
    ctx.fillRect(0, 0, EXPORT_SIZE.width, EXPORT_SIZE.height)

    const scale = Math.min(
      EXPORT_SIZE.width / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX),
      EXPORT_SIZE.height / (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ)
    )
    const offsetX = (EXPORT_SIZE.width - (MAP_BOUNDS.maxX - MAP_BOUNDS.minX) * scale) / 2
    const offsetY = (EXPORT_SIZE.height - (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ) * scale) / 2

    ctx.strokeStyle = 'rgba(51, 51, 85, 0.4)'
    ctx.lineWidth = 1
    for (let gx = 0; gx <= (MAP_BOUNDS.maxX - MAP_BOUNDS.minX); gx += 1) {
      const x = offsetX + gx * scale
      ctx.beginPath()
      ctx.moveTo(x, offsetY)
      ctx.lineTo(x, EXPORT_SIZE.height - 56 - offsetY)
      ctx.stroke()
    }
    for (let gz = 0; gz <= (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ); gz += 1) {
      const y = offsetY + gz * scale
      ctx.beginPath()
      ctx.moveTo(offsetX, y)
      ctx.lineTo(EXPORT_SIZE.width - offsetX, y)
      ctx.stroke()
    }

    const blindZones = calculateAllBlindZones(
      data.layout.truck.x,
      data.layout.truck.z,
      data.layout.truck.rotation,
      data.turnAngle
    )
    drawPolygon(ctx, blindZones.sideZone, 'rgba(230, 57, 70, 0.12)', undefined)
    drawPolygon(ctx, blindZones.apillarZone, 'rgba(230, 57, 70, 0.15)', undefined)
    if (blindZones.innerWheelZone.length > 0) {
      drawPolygon(ctx, blindZones.innerWheelZone, 'rgba(255, 34, 68, 0.15)', undefined)
    }

    data.layout.barriers.forEach((b) => {
      drawBarrier(ctx, b.x, b.z, b.rotation, b.length, false)
    })

    drawGate(ctx, data.layout.gate.x, data.layout.gate.z)
    drawTruck(ctx, data.layout.truck.x, data.layout.truck.z, data.layout.truck.rotation)
    drawCommander(ctx, data.layout.commander.x, data.layout.commander.z)

    const tempCount = data.layout.tempBarriers.length
    if (tempCount === 0) {
      const recTB = [
        { x: 5.5, z: 0, rotation: 0, length: 4 },
        { x: 8, z: -2, rotation: Math.PI / 2, length: 3 },
      ]
      recTB.forEach((b, idx) => {
        drawBarrier(ctx, b.x, b.z, b.rotation, b.length, true)
        const pos = worldToScreen(b.x, b.z)
        ctx.fillStyle = '#FF6B35'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`推荐围栏 ${idx + 1}`, pos.sx, pos.sy - 30)

        ctx.setLineDash([4, 3])
        ctx.strokeStyle = 'rgba(255, 107, 53, 0.6)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(pos.sx, pos.sy - 18, 4, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      })
    } else {
      data.layout.tempBarriers.forEach((b, idx) => {
        drawBarrier(ctx, b.x, b.z, b.rotation, 3, true)
        const pos = worldToScreen(b.x, b.z)
        ctx.fillStyle = '#FF6B35'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`临时围栏 ${idx + 1}`, pos.sx, pos.sy - 30)
      })
    }

    ctx.fillStyle = 'rgba(18, 18, 42, 0.9)'
    ctx.fillRect(0, 0, EXPORT_SIZE.width, 52)
    ctx.fillStyle = '#FF6B35'
    ctx.font = 'bold 18px "Noto Sans SC", sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('🚧 门岗临时围栏设置参考图', 24, 26)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`橙色 = 需设置的临时围栏位置`, EXPORT_SIZE.width - 24, 26)

    ctx.fillStyle = 'rgba(18, 18, 42, 0.92)'
    ctx.fillRect(0, EXPORT_SIZE.height - 56, EXPORT_SIZE.width, 56)
    ctx.fillStyle = '#2EC4B6'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('💡 设置原则：', 24, EXPORT_SIZE.height - 28)
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.font = '11px sans-serif'
    ctx.fillText(
      '1. 盲区边界外1米处设置橙色临时围栏  2. 行人通道口必须有隔离  3. 保证司机视线不被遮挡',
      130,
      EXPORT_SIZE.height - 28
    )

    resolve(canvas.toDataURL('image/png'))
  })
}

export {
  captureCurrentCanvas,
  captureWithMode,
  EXPORT_SIZE,
  MAP_BOUNDS,
}
