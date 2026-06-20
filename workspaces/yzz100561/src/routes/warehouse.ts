import { Router, Request, Response } from 'express'
import { DeliveryService } from '../services/deliveryService'

const router = Router()
const deliveryService = new DeliveryService()

router.post('/deliveries', async (req: Request, res: Response) => {
  try {
    const data = await deliveryService.createDelivery(req.body)
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/deliveries', async (req: Request, res: Response) => {
  try {
    const { supplierId, startDate, endDate } = req.query
    const where: any = {}
    if (supplierId) where.supplierId = supplierId
    if (startDate || endDate) {
      where.deliveryDate = {}
      if (startDate) where.deliveryDate.gte = new Date(startDate as string)
      if (endDate) where.deliveryDate.lte = new Date(endDate as string)
    }

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        supplier: true,
        items: {
          include: {
            textbook: { include: { course: true } },
            order: { include: { class: { include: { grade: true } } } },
          },
        },
      },
      orderBy: { deliveryDate: 'desc' },
    })
    await prisma.$disconnect()
    res.json({ code: 0, data: deliveries })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/pending-deliveries', async (req: Request, res: Response) => {
  try {
    const data = await deliveryService.getPendingDeliveries()
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/to-ship', async (req: Request, res: Response) => {
  try {
    const data = await deliveryService.getWarehouseToShip()
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/shortage-print', async (req: Request, res: Response) => {
  try {
    const { date } = req.query
    const d = date ? (date as string) : new Date().toISOString().split('T')[0]
    const data = await deliveryService.printShortageList(d)
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/supplier-diff', async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.query
    const data = await deliveryService.getSupplierDeliveryDiff(
      supplierId as string | undefined
    )
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

export default router
