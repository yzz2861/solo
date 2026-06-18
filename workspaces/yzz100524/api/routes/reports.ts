import { Router, type Request, type Response } from 'express'
import { tables } from '../db.js'

const router = Router()

function getDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

router.get('/conversion', (req: Request, res: Response) => {
  const { start_date, end_date } = req.query
  const startDate = (start_date as string) || getDateStr(new Date(new Date().setDate(1)))
  const endDate = (end_date as string) || getDateStr(new Date())

  const rides = tables.test_rides.all(
    (t) => t.start_time >= `${startDate}T00:00:00` && t.start_time <= `${endDate}T23:59:59`
  )

  const totalRides = rides.length
  const uniqueCustomers = new Set(rides.map((r) => r.customer_id)).size

  const feedbacks = tables.feedbacks.all((f) => {
    if (!f.test_ride_id) return false
    const ride = tables.test_rides.get(f.test_ride_id)
    if (!ride) return false
    return ride.start_time >= `${startDate}T00:00:00` && ride.start_time <= `${endDate}T23:59:59`
  })
  const customersWithFeedback = new Set(feedbacks.map((f) => f.customer_id)).size

  const dailyMap = new Map<string, number>()
  for (const r of rides) {
    const d = r.start_time.slice(0, 10)
    dailyMap.set(d, (dailyMap.get(d) || 0) + 1)
  }
  const dailyStats = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const modelMap = new Map<string, number>()
  for (const r of rides) {
    const v = tables.vehicles.get(r.vehicle_id)
    const model = v?.model || '未知'
    modelMap.set(model, (modelMap.get(model) || 0) + 1)
  }
  const modelStats = Array.from(modelMap.entries())
    .map(([model, ride_count]) => ({ model, ride_count }))
    .sort((a, b) => b.ride_count - a.ride_count)

  res.json({
    success: true,
    data: {
      total_rides: totalRides,
      unique_customers: uniqueCustomers,
      customers_with_feedback: customersWithFeedback,
      daily_stats: dailyStats,
      model_stats: modelStats,
    },
  })
})

router.get('/vehicle-issues', (req: Request, res: Response) => {
  const { resolved, start_date, end_date } = req.query
  const startDate = (start_date as string) || getDateStr(new Date(new Date().setDate(1)))
  const endDate = (end_date as string) || getDateStr(new Date())

  let issues = tables.vehicle_issues.all(
    (i) => i.created_at >= `${startDate}T00:00:00` && i.created_at <= `${endDate}T23:59:59`
  )

  if (resolved !== undefined) {
    const isResolved = resolved === 'true'
    issues = issues.filter((i) => !!i.resolved === isResolved)
  }

  issues = issues.map((i) => {
    const v = tables.vehicles.get(i.vehicle_id)
    const ride = i.test_ride_id ? tables.test_rides.get(i.test_ride_id) : undefined
    const customer = ride ? tables.customers.get(ride.customer_id) : undefined
    return {
      ...i,
      model: v?.model,
      frame_number: v?.frame_number,
      customer_name: customer?.name,
    }
  }).sort((a, b) => b.created_at.localeCompare(a.created_at))

  const severityMap = new Map<string, number>()
  for (const i of issues) {
    severityMap.set(i.severity, (severityMap.get(i.severity) || 0) + 1)
  }
  const severityStats = Array.from(severityMap.entries()).map(([severity, count]) => ({
    severity,
    count,
  }))

  const vehicleMap = new Map<string, number>()
  for (const i of issues) {
    const model = i.model || '未知'
    vehicleMap.set(model, (vehicleMap.get(model) || 0) + 1)
  }
  const vehicleIssueCount = Array.from(vehicleMap.entries())
    .map(([model, issue_count]) => ({ model, issue_count }))
    .sort((a, b) => b.issue_count - a.issue_count)

  res.json({
    success: true,
    data: { issues, severity_stats: severityStats, vehicle_issue_count: vehicleIssueCount },
  })
})

router.get('/deposit-flow', (req: Request, res: Response) => {
  const { start_date, end_date } = req.query
  const startDate = (start_date as string) || getDateStr(new Date(new Date().setDate(1)))
  const endDate = (end_date as string) || getDateStr(new Date())

  const rides = tables.test_rides.all(
    (t) => t.start_time >= `${startDate}T00:00:00` && t.start_time <= `${endDate}T23:59:59`
  )

  let collectedTotal = 0
  for (const r of rides) {
    collectedTotal += Number(r.deposit_amount) || 0
  }

  const returnedRides = rides.filter((r) => r.deposit_status === 'refunded' && r.actual_return_time)
  let refundedTotal = 0
  let deductionsTotal = 0
  for (const r of returnedRides) {
    const deduct = Number(r.deduction_amount) || 0
    refundedTotal += Number(r.deposit_amount) - deduct
    deductionsTotal += deduct
  }

  const unreturned = rides.filter((r) => r.deposit_status === 'collected')
  const unreturnedTotal = unreturned.reduce((sum, r) => sum + (Number(r.deposit_amount) || 0), 0)

  const dailyMap = new Map<string, { collected_amount: number; refunded_amount: number }>()
  for (const r of rides) {
    const d = r.start_time.slice(0, 10)
    if (!dailyMap.has(d)) {
      dailyMap.set(d, { collected_amount: 0, refunded_amount: 0 })
    }
    const day = dailyMap.get(d)!
    day.collected_amount += Number(r.deposit_amount) || 0
    if (r.deposit_status === 'refunded') {
      day.refunded_amount += Number(r.deposit_amount) - (Number(r.deduction_amount) || 0)
    }
  }
  const dailyFlow = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

  res.json({
    success: true,
    data: {
      collected_total: collectedTotal,
      refunded_total: refundedTotal,
      deductions_total: deductionsTotal,
      unreturned: { count: unreturned.length, total: unreturnedTotal },
      daily_flow: dailyFlow,
    },
  })
})

router.get('/export/:type', (req: Request, res: Response) => {
  const { type } = req.params
  const { start_date, end_date } = req.query
  const startDate = (start_date as string) || getDateStr(new Date(new Date().setDate(1)))
  const endDate = (end_date as string) || getDateStr(new Date())

  res.setHeader('Content-Type', 'application/json')

  if (type === 'conversion') {
    const rides = tables.test_rides
      .all((t) => t.start_time >= `${startDate}T00:00:00` && t.start_time <= `${endDate}T23:59:59`)
      .map((r) => {
        const c = tables.customers.get(r.customer_id)
        const v = tables.vehicles.get(r.vehicle_id)
        const f = tables.feedbacks.findOne((f) => f.test_ride_id === r.id)
        return {
          id: r.id,
          customer_name: c?.name || '',
          phone: c?.phone || '',
          model: v?.model || '',
          frame_number: v?.frame_number || '',
          deposit_amount: r.deposit_amount,
          start_time: r.start_time,
          expected_return_time: r.expected_return_time,
          actual_return_time: r.actual_return_time || '',
          return_condition: r.return_condition,
          deposit_status: r.deposit_status,
          preference: f?.preference || '',
          satisfaction: f?.satisfaction || '',
          intended_model: f?.intended_model || '',
        }
      })
      .sort((a, b) => b.start_time.localeCompare(a.start_time))

    res.json({
      success: true,
      data: rides,
      export_type: 'conversion',
      start_date: startDate,
      end_date: endDate,
    })
  } else if (type === 'vehicle-issues') {
    const issues = tables.vehicle_issues
      .all((i) => i.created_at >= `${startDate}T00:00:00` && i.created_at <= `${endDate}T23:59:59`)
      .map((i) => {
        const v = tables.vehicles.get(i.vehicle_id)
        const ride = i.test_ride_id ? tables.test_rides.get(i.test_ride_id) : undefined
        const customer = ride ? tables.customers.get(ride.customer_id) : undefined
        return {
          id: i.id,
          model: v?.model || '',
          frame_number: v?.frame_number || '',
          issue_type: i.issue_type,
          description: i.description,
          severity: i.severity,
          resolved: !!i.resolved,
          created_at: i.created_at,
          resolved_at: i.resolved_at || '',
          customer_name: customer?.name || '',
        }
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))

    res.json({
      success: true,
      data: issues,
      export_type: 'vehicle_issues',
      start_date: startDate,
      end_date: endDate,
    })
  } else if (type === 'deposit-flow') {
    const rides = tables.test_rides
      .all((t) => t.start_time >= `${startDate}T00:00:00` && t.start_time <= `${endDate}T23:59:59`)
      .map((r) => {
        const c = tables.customers.get(r.customer_id)
        const v = tables.vehicles.get(r.vehicle_id)
        return {
          id: r.id,
          customer_name: c?.name || '',
          phone: c?.phone || '',
          model: v?.model || '',
          deposit_amount: r.deposit_amount,
          deposit_payment_method: r.deposit_payment_method,
          deposit_status: r.deposit_status,
          deduction_amount: r.deduction_amount || 0,
          deduction_reason: r.deduction_reason || '',
          start_time: r.start_time,
          actual_return_time: r.actual_return_time || '',
          deposit_receipt_no: r.deposit_receipt_no,
        }
      })
      .sort((a, b) => b.start_time.localeCompare(a.start_time))

    res.json({
      success: true,
      data: rides,
      export_type: 'deposit_flow',
      start_date: startDate,
      end_date: endDate,
    })
  } else {
    res.status(400).json({ success: false, error: '未知导出类型' })
  }
})

export default router
