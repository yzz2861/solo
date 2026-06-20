import { Router, Request, Response } from 'express'
import { ReceiptService } from '../services/receiptService'
import { TransferStudentService } from '../services/transferService'

const router = Router()
const receiptService = new ReceiptService()
const transferService = new TransferStudentService()

router.post('/receipts', async (req: Request, res: Response) => {
  try {
    const data = await receiptService.createReceipt(req.body)
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.post('/receipts/:receiptId/sign', async (req: Request, res: Response) => {
  try {
    const data = await receiptService.signReceipt({
      receiptId: req.params.receiptId,
      ...req.body,
    })
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/receipts/:receiptId', async (req: Request, res: Response) => {
  try {
    const data = await receiptService.getReceipt(req.params.receiptId)
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/receipts', async (req: Request, res: Response) => {
  try {
    const { classId, startDate, endDate } = req.query
    const data = await receiptService.listReceipts(
      classId as string | undefined,
      startDate as string | undefined,
      endDate as string | undefined
    )
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.post('/transfers', async (req: Request, res: Response) => {
  try {
    const data = await transferService.addTransfer(req.body)
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/transfers', async (req: Request, res: Response) => {
  try {
    const { classId, type } = req.query
    const data = await transferService.listTransfers(
      classId as string | undefined,
      type as 'IN' | 'OUT' | undefined
    )
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.delete('/transfers/:id', async (req: Request, res: Response) => {
  try {
    const data = await transferService.deleteTransfer(req.params.id)
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/classes/:classId/transfers-with-orders', async (req: Request, res: Response) => {
  try {
    const data = await transferService.getTransfersWithOrders(req.params.classId)
    res.json({ code: 0, data })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

export default router
