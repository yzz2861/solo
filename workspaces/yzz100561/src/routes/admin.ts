import { Router, Request, Response } from 'express'
import { OrderService } from '../services/orderService'

const router = Router()
const orderService = new OrderService()

router.post('/orders', async (req: Request, res: Response) => {
  try {
    const data = await orderService.createOrders(req.body)
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.post('/orders/supplement', async (req: Request, res: Response) => {
  try {
    const data = await orderService.supplementOrder(req.body)
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.post('/orders/return', async (req: Request, res: Response) => {
  try {
    const data = await orderService.returnOrder(req.body)
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.post('/orders/change-edition', async (req: Request, res: Response) => {
  try {
    const data = await orderService.changeEdition(req.body)
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/orders/:orderId/trace', async (req: Request, res: Response) => {
  try {
    const data = await orderService.getEditionTrace(req.params.orderId)
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/classes/:classId/progress', async (req: Request, res: Response) => {
  try {
    const { term } = req.query
    const data = await orderService.getClassProgress(
      req.params.classId,
      term as string
    )
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/progress/summary', async (req: Request, res: Response) => {
  try {
    const { term, gradeId } = req.query
    const where: any = {}
    if (term) where.term = term
    if (gradeId) where.gradeId = gradeId

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const orders = await prisma.order.findMany({
      where,
      include: { class: { include: { grade: true } } },
    })

    const byGrade: Record<string, any> = {}
    for (const o of orders) {
      const gName = o.class.grade.name
      if (!byGrade[gName]) {
        byGrade[gName] = { total: 0, delivered: 0, partial: 0, pending: 0, classes: new Set<string>() }
      }
      byGrade[gName].total++
      byGrade[gName].classes.add(o.classId)
      if (o.deliveredQty >= o.finalQty) byGrade[gName].delivered++
      else if (o.deliveredQty > 0) byGrade[gName].partial++
      else byGrade[gName].pending++
    }

    const summary = Object.entries(byGrade).map(([grade, v]) => ({
      grade,
      classCount: v.classes.size,
      total: v.total,
      delivered: v.delivered,
      partial: v.partial,
      pending: v.pending,
    }))

    await prisma.$disconnect()
    res.json({ code: 0, data: summary })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { term, classId, gradeId, textbookId, status } = req.query
    const where: any = {}
    if (term) where.term = term
    if (classId) where.classId = classId
    if (gradeId) where.gradeId = gradeId
    if (textbookId) where.textbookId = textbookId
    if (status) where.status = status

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const orders = await prisma.order.findMany({
      where,
      include: {
        textbook: { include: { course: true, supplier: true } },
        class: { include: { grade: true } },
        changes: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: [{ term: 'desc' }, { gradeId: 'asc' }, { classId: 'asc' }],
    })

    await prisma.$disconnect()
    res.json({ code: 0, data: orders })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

export default router
