import { Router, type Request, type Response } from 'express'
import { tables } from '../db.js'

const router = Router()

function enrichRide(t: any) {
  const c = tables.customers.get(t.customer_id)
  const v = tables.vehicles.get(t.vehicle_id)
  return {
    ...t,
    customer_name: c?.name,
    customer_phone: c?.phone,
    vehicle_model: v?.model,
    vehicle_frame: v?.frame_number,
  }
}

router.get('/', (req: Request, res: Response) => {
  const { status, date } = req.query
  let list = tables.test_rides.all()

  if (status === 'active') {
    list = list.filter((t) => t.deposit_status === 'collected')
  }
  if (date) {
    const d = String(date)
    list = list.filter((t) => t.start_time?.startsWith(d))
  }

  list = list.map(enrichRide).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

  res.json({ success: true, data: list.slice(0, 200) })
})

router.get('/active', (req: Request, res: Response) => {
  const list = tables.test_rides
    .all((t) => t.deposit_status === 'collected')
    .map(enrichRide)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
  res.json({ success: true, data: list })
})

router.get('/unreturned-deposits', (req: Request, res: Response) => {
  const list = tables.test_rides
    .all((t) => t.deposit_status === 'collected')
    .map(enrichRide)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  res.json({ success: true, data: list })
})

router.post('/', (req: Request, res: Response) => {
  const {
    customer_id,
    vehicle_id,
    deposit_amount,
    deposit_payment_method,
    route,
    planned_duration,
    start_time,
    insurance_confirmed,
  } = req.body

  if (!customer_id || !vehicle_id || !deposit_amount || !start_time) {
    res.status(400).json({ success: false, error: '客户、车辆、押金、开始时间必填' })
    return
  }

  const vehicle = tables.vehicles.get(Number(vehicle_id))
  if (!vehicle) {
    res.status(400).json({ success: false, error: '车辆不存在' })
    return
  }

  if (vehicle.battery_level < 20) {
    res.status(400).json({ success: false, error: '车辆电量不足（低于20%），无法安排试骑' })
    return
  }

  const duration = planned_duration || 30
  const startTime = new Date(start_time)
  if (isNaN(startTime.getTime())) {
    res.status(400).json({ success: false, error: '开始时间格式错误' })
    return
  }
  const expectedReturn = new Date(startTime.getTime() + duration * 60000)

  const buffer = 30 * 60000
  const conflicts = tables.test_rides.count(
    (t) =>
      t.vehicle_id === Number(vehicle_id) &&
      t.deposit_status !== 'refunded' &&
      new Date(t.start_time).getTime() < expectedReturn.getTime() + buffer &&
      new Date(t.expected_return_time).getTime() > startTime.getTime() - buffer
  )

  if (conflicts > 0) {
    res.status(400).json({ success: false, error: '该车辆在此时段已被安排试骑，请选择其他时段或车辆' })
    return
  }

  const receiptNo = `TR${Date.now()}`
  const startTimeStr = startTime.toISOString()
  const expectedReturnStr = expectedReturn.toISOString()

  const result = tables.test_rides.insert({
    customer_id: Number(customer_id),
    vehicle_id: Number(vehicle_id),
    deposit_amount: Number(deposit_amount),
    deposit_payment_method: deposit_payment_method || 'cash',
    route: route || '',
    planned_duration: Number(duration),
    start_time: startTimeStr,
    expected_return_time: expectedReturnStr,
    insurance_confirmed: insurance_confirmed ? 1 : 0,
    deposit_receipt_no: receiptNo,
    deposit_status: 'collected',
    return_condition: 'normal',
    return_notes: '',
    deduction_amount: 0,
    deduction_reason: '',
  })

  tables.vehicles.update(Number(vehicle_id), { status: 'in_use' })

  const ride = tables.test_rides.get(result.lastInsertRowid)

  res.json({ success: true, data: ride })
})

router.put('/:id/return', (req: Request, res: Response) => {
  const { id } = req.params
  const {
    return_condition,
    return_notes,
    deduction_amount,
    deduction_reason,
    issues,
  } = req.body

  const ride = tables.test_rides.get(Number(id))
  if (!ride) {
    res.status(404).json({ success: false, error: '试骑记录不存在' })
    return
  }

  const deduction = Number(deduction_amount) || 0

  tables.test_rides.update(Number(id), {
    actual_return_time: new Date().toISOString(),
    deposit_status: 'refunded',
    return_condition: return_condition || 'normal',
    return_notes: return_notes || '',
    deduction_amount: deduction,
    deduction_reason: deduction_reason || '',
  })

  let newVehicleStatus: string = 'available'
  if (return_condition === 'damaged' || (issues && issues.length > 0)) {
    newVehicleStatus = 'inspection'
  }
  tables.vehicles.update(ride.vehicle_id, { status: newVehicleStatus })

  if (issues && issues.length > 0) {
    for (const issue of issues) {
      tables.vehicle_issues.insert({
        vehicle_id: ride.vehicle_id,
        test_ride_id: ride.id,
        issue_type: issue.type,
        description: issue.description || '',
        severity: issue.severity || 'minor',
        resolved: 0,
      })
    }
  }

  res.json({ success: true })
})

export default router
