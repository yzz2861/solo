import { Router, Request, Response } from 'express'
import { ExportService } from '../services/exportService'

const router = Router()
const exportService = new ExportService()

function setDownloadHeader(res: Response, filename: string, term: string) {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  const name = `${filename}_${term}.xlsx`
  const encoded = encodeURIComponent(name)
  res.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encoded}`
  )
}

router.get('/export/shortage.xlsx', async (req: Request, res: Response) => {
  try {
    const { term } = req.query
    if (!term) throw new Error('缺少学期参数 term')
    const buffer = await exportService.exportShortage(term as string)
    setDownloadHeader(res, 'shortage-list', term as string)
    res.send(buffer)
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/export/returns.xlsx', async (req: Request, res: Response) => {
  try {
    const { term } = req.query
    if (!term) throw new Error('缺少学期参数 term')
    const buffer = await exportService.exportReturns(term as string)
    setDownloadHeader(res, 'returns-detail', term as string)
    res.send(buffer)
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/export/supplier-diff.xlsx', async (req: Request, res: Response) => {
  try {
    const { term } = req.query
    if (!term) throw new Error('缺少学期参数 term')
    const buffer = await exportService.exportSupplierDiff(term as string)
    setDownloadHeader(res, 'supplier-diff', term as string)
    res.send(buffer)
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/export/transfers.xlsx', async (req: Request, res: Response) => {
  try {
    const { term } = req.query
    if (!term) throw new Error('缺少学期参数 term')
    const buffer = await exportService.exportTransfers(term as string)
    setDownloadHeader(res, 'transfer-students', term as string)
    res.send(buffer)
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/dashboard/summary', async (req: Request, res: Response) => {
  try {
    const { term } = req.query
    const where: any = {}
    if (term) where.term = term

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const orders = await prisma.order.findMany({ where })
    const totalOrders = orders.length
    const totalFinalQty = orders.reduce((s, o) => s + o.finalQty, 0)
    const totalSupplementQty = orders.reduce((s, o) => s + o.supplementQty, 0)
    const totalReturnQty = orders.reduce((s, o) => s + o.returnQty, 0)
    const totalDelivered = orders.reduce((s, o) => s + o.deliveredQty, 0)
    const totalReceived = orders.reduce((s, o) => s + o.receivedQty, 0)
    const totalShortage = orders.reduce(
      (s, o) => s + Math.max(0, o.finalQty - o.deliveredQty),
      0
    )

    const deliveries = await prisma.delivery.findMany()
    const totalDeliveries = deliveries.length

    const receipts = await prisma.receipt.findMany()
    const totalReceipts = receipts.length

    const transfersIn = await prisma.transferStudent.count({
      where: { transferType: 'IN' },
    })
    const transfersOut = await prisma.transferStudent.count({
      where: { transferType: 'OUT' },
    })

    await prisma.$disconnect()

    res.json({
      code: 0,
      data: {
        term: term || '全部学期',
        orders: {
          total: totalOrders,
          finalQty: totalFinalQty,
          supplementQty: totalSupplementQty,
          returnQty: totalReturnQty,
          deliveredQty: totalDelivered,
          receivedQty: totalReceived,
          shortageQty: totalShortage,
        },
        deliveries: { total: totalDeliveries },
        receipts: { total: totalReceipts },
        transfers: { in: transfersIn, out: transfersOut },
      },
    })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/dashboard/by-course', async (req: Request, res: Response) => {
  try {
    const { term } = req.query
    const where: any = {}
    if (term) where.term = term

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const orders = await prisma.order.findMany({
      where,
      include: { textbook: { include: { course: true } } },
    })

    const courseMap: Record<string, any> = {}
    for (const o of orders) {
      const cName = o.textbook.course.name
      if (!courseMap[cName]) {
        courseMap[cName] = {
          course: cName,
          classes: new Set<string>(),
          finalQty: 0,
          supplementQty: 0,
          returnQty: 0,
          deliveredQty: 0,
          shortageQty: 0,
        }
      }
      courseMap[cName].classes.add(o.classId)
      courseMap[cName].finalQty += o.finalQty
      courseMap[cName].supplementQty += o.supplementQty
      courseMap[cName].returnQty += o.returnQty
      courseMap[cName].deliveredQty += o.deliveredQty
      courseMap[cName].shortageQty += Math.max(0, o.finalQty - o.deliveredQty)
    }

    const result = Object.values(courseMap).map((c) => ({
      course: c.course,
      classCount: c.classes.size,
      finalQty: c.finalQty,
      supplementQty: c.supplementQty,
      returnQty: c.returnQty,
      deliveredQty: c.deliveredQty,
      shortageQty: c.shortageQty,
    }))

    await prisma.$disconnect()
    res.json({ code: 0, data: result })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

export default router
