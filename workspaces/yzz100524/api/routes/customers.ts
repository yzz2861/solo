import { Router, type Request, type Response } from 'express'
import { tables } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { search } = req.query
  let list = tables.customers.all()

  if (search) {
    const q = String(search).toLowerCase()
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    )
  }

  list = list
    .map((c) => ({
      ...c,
      ride_count: tables.test_rides.count((t) => t.customer_id === c.id),
      feedback_count: tables.feedbacks.count((f) => f.customer_id === c.id),
    }))
    .sort((a, b) => b.id - a.id)

  res.json({ success: true, data: list })
})

router.get('/search', (req: Request, res: Response) => {
  const { q } = req.query
  if (!q) {
    res.json({ success: true, data: [] })
    return
  }
  const query = String(q).toLowerCase()
  const customers = tables.customers
    .all()
    .filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query)
    )
    .slice(0, 10)
  res.json({ success: true, data: customers })
})

router.get('/:id', (req: Request, res: Response) => {
  const customer = tables.customers.get(Number(req.params.id))
  if (!customer) {
    res.status(404).json({ success: false, error: '客户不存在' })
    return
  }

  const rides = tables.test_rides
    .all((t) => t.customer_id === customer.id)
    .map((t) => {
      const v = tables.vehicles.get(t.vehicle_id)
      return {
        ...t,
        vehicle_model: v?.model,
        vehicle_frame: v?.frame_number,
      }
    })
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

  const feedbacks = tables.feedbacks
    .all((f) => f.customer_id === customer.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  res.json({
    success: true,
    data: {
      ...customer,
      ride_count: rides.length,
      feedback_count: feedbacks.length,
      rides,
      feedbacks,
    },
  })
})

router.post('/', (req: Request, res: Response) => {
  const { name, phone, id_card, tags } = req.body
  if (!name || !phone) {
    res.status(400).json({ success: false, error: '姓名和手机号必填' })
    return
  }
  const result = tables.customers.insert({
    name,
    phone,
    id_card: id_card || '',
    tags: tags || '',
  })
  res.json({ success: true, data: { id: result.lastInsertRowid } })
})

router.put('/:id', (req: Request, res: Response) => {
  const { name, phone, id_card, tags } = req.body
  tables.customers.update(Number(req.params.id), {
    name,
    phone,
    id_card: id_card || '',
    tags: tags || '',
  })
  res.json({ success: true })
})

router.post('/:id/feedback', (req: Request, res: Response) => {
  const { id } = req.params
  const { test_ride_id, preference, satisfaction, intended_model, notes } = req.body

  tables.feedbacks.insert({
    customer_id: Number(id),
    test_ride_id: test_ride_id ? Number(test_ride_id) : undefined,
    preference: preference || '',
    satisfaction: satisfaction || '',
    intended_model: intended_model || '',
    notes: notes || '',
  })

  if (preference || intended_model) {
    const customer = tables.customers.get(Number(id))
    if (customer) {
      const existingTags = customer.tags
        ? String(customer.tags)
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : []
      const newTags = [preference, intended_model].filter(Boolean) as string[]
      const mergedTags = Array.from(new Set([...existingTags, ...newTags])).join(',')
      tables.customers.update(Number(id), { tags: mergedTags })
    }
  }

  res.json({ success: true })
})

export default router
