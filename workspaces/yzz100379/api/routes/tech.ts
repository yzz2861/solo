import { Router } from 'express'
import type { Request, Response } from 'express'
import { getTechTickets } from '../services/ticketService'
import type { WorkOrder } from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

const router = Router()

router.get(
  '/tickets',
  async (req: Request, res: Response<ApiResponse<WorkOrder[]>>) => {
    try {
      const { techId } = req.query

      if (!techId) {
        res.status(400).json({ success: false, error: '请提供techId' })
        return
      }

      const tickets = await getTechTickets(techId as string)
      res.json({ success: true, data: tickets })
    } catch (err) {
      console.error(err)
      res.status(500).json({ success: false, error: '获取派单列表失败' })
    }
  }
)

export default router
