import { Router } from 'express'
import type { Request, Response } from 'express'
import { getTechs, getStaffById } from '../services/ticketService'
import type { Staff } from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

const router = Router()

router.get(
  '/techs',
  async (_req: Request, res: Response<ApiResponse<Staff[]>>) => {
    try {
      const techs = await getTechs()
      res.json({ success: true, data: techs })
    } catch (err) {
      console.error(err)
      res.status(500).json({ success: false, error: '获取维修师傅列表失败' })
    }
  }
)

router.get(
  '/:id',
  async (req: Request, res: Response<ApiResponse<Staff>>) => {
    try {
      const { id } = req.params
      const staff = await getStaffById(id)

      if (!staff) {
        res.status(404).json({ success: false, error: '员工不存在' })
        return
      }

      res.json({ success: true, data: staff })
    } catch (err) {
      console.error(err)
      res.status(500).json({ success: false, error: '获取员工信息失败' })
    }
  }
)

export default router
