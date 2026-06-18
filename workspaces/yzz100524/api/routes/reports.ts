import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/conversion', (req: Request, res: Response) => {
  const { start_date, end_date } = req.query
  const startDate = start_date || new Date(new Date().setDate(1)).toISOString().split('T')[0]
  const endDate = end_date || new Date().toISOString().split('T')[0]

  const totalRides = db.prepare(`
    SELECT COUNT(*) as count FROM test_rides
    WHERE DATE(start_time) BETWEEN ? AND ?
  `).get(startDate, endDate) as { count: number }

  const uniqueCustomers = db.prepare(`
    SELECT COUNT(DISTINCT customer_id) as count FROM test_rides
    WHERE DATE(start_time) BETWEEN ? AND ?
  `).get(startDate, endDate) as { count: number }

  const customersWithFeedback = db.prepare(`
    SELECT COUNT(DISTINCT f.customer_id) as count FROM feedbacks f
    JOIN test_rides tr ON f.test_ride_id = tr.id
    WHERE DATE(tr.start_time) BETWEEN ? AND ?
  `).get(startDate, endDate) as { count: number }

  const dailyStats = db.prepare(`
    SELECT DATE(start_time) as date, COUNT(*) as count
    FROM test_rides
    WHERE DATE(start_time) BETWEEN ? AND ?
    GROUP BY DATE(start_time)
    ORDER BY date
  `).all(startDate, endDate)

  const modelStats = db.prepare(`
    SELECT v.model, COUNT(*) as ride_count
    FROM test_rides tr
    JOIN vehicles v ON tr.vehicle_id = v.id
    WHERE DATE(tr.start_time) BETWEEN ? AND ?
    GROUP BY v.model
    ORDER BY ride_count DESC
  `).all(startDate, endDate)

  res.json({
    success: true,
    data: {
      total_rides: totalRides.count,
      unique_customers: uniqueCustomers.count,
      customers_with_feedback: customersWithFeedback.count,
      daily_stats: dailyStats,
      model_stats: modelStats,
    }
  })
})

router.get('/vehicle-issues', (req: Request, res: Response) => {
  const { resolved, start_date, end_date } = req.query
  const startDate = start_date || new Date(new Date().setDate(1)).toISOString().split('T')[0]
  const endDate = end_date || new Date().toISOString().split('T')[0]

  let sql = `
    SELECT vi.*, v.model, v.frame_number,
      c.name as customer_name
    FROM vehicle_issues vi
    JOIN vehicles v ON vi.vehicle_id = v.id
    LEFT JOIN test_rides tr ON vi.test_ride_id = tr.id
    LEFT JOIN customers c ON tr.customer_id = c.id
    WHERE DATE(vi.created_at) BETWEEN ? AND ?
  `
  const params: any[] = [startDate, endDate]

  if (resolved !== undefined) {
    sql += ' AND vi.resolved = ?'
    params.push(resolved === 'true' ? 1 : 0)
  }

  sql += ' ORDER BY vi.created_at DESC'

  const issues = db.prepare(sql).all(...params)

  const severityStats = db.prepare(`
    SELECT severity, COUNT(*) as count
    FROM vehicle_issues
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY severity
  `).all(startDate, endDate)

  const vehicleIssueCount = db.prepare(`
    SELECT v.model, COUNT(*) as issue_count
    FROM vehicle_issues vi
    JOIN vehicles v ON vi.vehicle_id = v.id
    WHERE DATE(vi.created_at) BETWEEN ? AND ?
    GROUP BY vi.vehicle_id
    ORDER BY issue_count DESC
  `).all(startDate, endDate)

  res.json({
    success: true,
    data: { issues, severity_stats: severityStats, vehicle_issue_count: vehicleIssueCount }
  })
})

router.get('/deposit-flow', (req: Request, res: Response) => {
  const { start_date, end_date } = req.query
  const startDate = start_date || new Date(new Date().setDate(1)).toISOString().split('T')[0]
  const endDate = end_date || new Date().toISOString().split('T')[0]

  const collected = db.prepare(`
    SELECT SUM(deposit_amount) as total FROM test_rides
    WHERE DATE(start_time) BETWEEN ? AND ?
  `).get(startDate, endDate) as { total: number | null }

  const refunded = db.prepare(`
    SELECT SUM(deposit_amount - deduction_amount) as total FROM test_rides
    WHERE DATE(actual_return_time) BETWEEN ? AND ? AND deposit_status = 'refunded'
  `).get(startDate, endDate) as { total: number | null }

  const deductions = db.prepare(`
    SELECT SUM(deduction_amount) as total FROM test_rides
    WHERE DATE(actual_return_time) BETWEEN ? AND ? AND deduction_amount > 0
  `).get(startDate, endDate) as { total: number | null }

  const unreturned = db.prepare(`
    SELECT COUNT(*) as count, SUM(deposit_amount) as total FROM test_rides
    WHERE deposit_status = 'collected'
  `).get() as { count: number, total: number | null }

  const dailyFlow = db.prepare(`
    SELECT DATE(start_time) as date,
      SUM(deposit_amount) as collected_amount,
      SUM(CASE WHEN deposit_status = 'refunded' THEN deposit_amount - deduction_amount ELSE 0 END) as refunded_amount
    FROM test_rides
    WHERE DATE(start_time) BETWEEN ? AND ?
    GROUP BY DATE(start_time)
    ORDER BY date
  `).all(startDate, endDate)

  res.json({
    success: true,
    data: {
      collected_total: collected.total || 0,
      refunded_total: refunded.total || 0,
      deductions_total: deductions.total || 0,
      unreturned: { count: unreturned.count, total: unreturned.total || 0 },
      daily_flow: dailyFlow,
    }
  })
})

router.get('/export/:type', (req: Request, res: Response) => {
  const { type } = req.params
  const { start_date, end_date } = req.query
  const startDate = start_date || new Date(new Date().setDate(1)).toISOString().split('T')[0]
  const endDate = end_date || new Date().toISOString().split('T')[0]

  res.setHeader('Content-Type', 'application/json')

  if (type === 'conversion') {
    const data = db.prepare(`
      SELECT tr.id, c.name as customer_name, c.phone, v.model, v.frame_number,
        tr.deposit_amount, tr.start_time, tr.expected_return_time,
        tr.actual_return_time, tr.return_condition, tr.deposit_status,
        f.preference, f.satisfaction, f.intended_model
      FROM test_rides tr
      LEFT JOIN customers c ON tr.customer_id = c.id
      LEFT JOIN vehicles v ON tr.vehicle_id = v.id
      LEFT JOIN feedbacks f ON f.test_ride_id = tr.id
      WHERE DATE(tr.start_time) BETWEEN ? AND ?
      ORDER BY tr.start_time DESC
    `).all(startDate, endDate)
    res.json({ success: true, data, export_type: 'conversion', start_date: startDate, end_date: endDate })
  } else if (type === 'vehicle-issues') {
    const data = db.prepare(`
      SELECT vi.id, v.model, v.frame_number, vi.issue_type, vi.description,
        vi.severity, vi.resolved, vi.created_at, vi.resolved_at,
        c.name as customer_name
      FROM vehicle_issues vi
      JOIN vehicles v ON vi.vehicle_id = v.id
      LEFT JOIN test_rides tr ON vi.test_ride_id = tr.id
      LEFT JOIN customers c ON tr.customer_id = c.id
      WHERE DATE(vi.created_at) BETWEEN ? AND ?
      ORDER BY vi.created_at DESC
    `).all(startDate, endDate)
    res.json({ success: true, data, export_type: 'vehicle_issues', start_date: startDate, end_date: endDate })
  } else if (type === 'deposit-flow') {
    const data = db.prepare(`
      SELECT tr.id, c.name as customer_name, c.phone, v.model,
        tr.deposit_amount, tr.deposit_payment_method, tr.deposit_status,
        tr.deduction_amount, tr.deduction_reason,
        tr.start_time, tr.actual_return_time, tr.deposit_receipt_no
      FROM test_rides tr
      LEFT JOIN customers c ON tr.customer_id = c.id
      LEFT JOIN vehicles v ON tr.vehicle_id = v.id
      WHERE DATE(tr.start_time) BETWEEN ? AND ?
      ORDER BY tr.start_time DESC
    `).all(startDate, endDate)
    res.json({ success: true, data, export_type: 'deposit_flow', start_date: startDate, end_date: endDate })
  } else {
    res.status(400).json({ success: false, error: '未知导出类型' })
  }
})

export default router
