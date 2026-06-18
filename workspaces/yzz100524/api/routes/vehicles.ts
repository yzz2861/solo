import { Router, type Request, type Response } from 'express'
import { tables } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { status, search } = req.query
  let list = tables.vehicles.all()

  if (status) {
    list = list.filter((v) => v.status === status)
  }
  if (search) {
    const q = String(search).toLowerCase()
    list = list.filter(
      (v) =>
        v.model.toLowerCase().includes(q) ||
        v.frame_number.toLowerCase().includes(q)
    )
  }

  list = list
    .map((v) => ({
      ...v,
      ride_count: tables.test_rides.count((t) => t.vehicle_id === v.id),
    }))
    .sort((a, b) => b.id - a.id)

  res.json({ success: true, data: list })
})

router.get('/available', (req: Request, res: Response) => {
  const { start_time, duration } = req.query
  const startTime = start_time as string
  const dur = duration ? parseInt(duration as string) : 30

  let vehicles = tables.vehicles.all().filter(
    (v) => v.status === 'available' && v.battery_level >= 20
  )

  if (startTime) {
    const plannedEnd = new Date(new Date(startTime).getTime() + dur * 60000)
    const plannedEndIso = plannedEnd.toISOString()

    const buffer = 30 * 60000
    vehicles = vehicles.filter((v) => {
      const conflicts = tables.test_rides.count(
        (t) =>
          t.vehicle_id === v.id &&
          t.deposit_status !== 'refunded' &&
          new Date(t.start_time).getTime() < plannedEnd.getTime() + buffer &&
          new Date(t.expected_return_time).getTime() > new Date(startTime).getTime() - buffer
      )
      return conflicts === 0
    })
  }

  vehicles.sort((a, b) => a.model.localeCompare(b.model))

  res.json({ success: true, data: vehicles })
})

router.post('/', (req: Request, res: Response) => {
  const { model, frame_number, battery_level, status, notes } = req.body
  if (!model || !frame_number) {
    res.status(400).json({ success: false, error: '车型和车架号必填' })
    return
  }

  const exists = tables.vehicles.findOne((v) => v.frame_number === frame_number)
  if (exists) {
    res.status(400).json({ success: false, error: '车架号已存在' })
    return
  }

  try {
    const batt = battery_level ?? 100
    const stat = batt < 20 ? 'low_battery' : status ?? 'available'
    const result = tables.vehicles.insert({
      model,
      frame_number,
      battery_level: batt,
      status: stat,
      notes: notes ?? '',
    })
    res.json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: '添加车辆失败' })
  }
})

router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const { model, frame_number, battery_level, status, notes } = req.body

  const vehicle = tables.vehicles.get(Number(id))
  if (!vehicle) {
    res.status(404).json({ success: false, error: '车辆不存在' })
    return
  }

  const newBattery = battery_level ?? vehicle.battery_level
  const newStatus = status ?? vehicle.status
  const effectiveStatus =
    newBattery < 20 && newStatus === 'available' ? 'low_battery' : newStatus

  tables.vehicles.update(Number(id), {
    model: model ?? vehicle.model,
    frame_number: frame_number ?? vehicle.frame_number,
    battery_level: newBattery,
    status: effectiveStatus,
    notes: notes ?? vehicle.notes,
  })

  res.json({ success: true })
})

router.put('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params
  const { status } = req.body
  if (!status) {
    res.status(400).json({ success: false, error: '状态必填' })
    return
  }
  tables.vehicles.update(Number(id), { status })
  res.json({ success: true })
})

export default router
