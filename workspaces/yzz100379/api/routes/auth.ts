import { Router } from 'express'
import type { Request, Response } from 'express'
import { getStaffByCredentials } from '../services/ticketService'
import type { Staff } from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface LoginRequest {
  staffId: string
}

const router = Router()

router.post(
  '/login',
  async (req: Request, res: Response<ApiResponse<Staff>>) => {
    try {
      const { staffId } = req.body as LoginRequest

      if (!staffId) {
        res.status(400).json({ success: false, error: '请输入工号' })
        return
      }

      const staff = await getStaffByCredentials(staffId)
      if (!staff) {
        res.status(401).json({ success: false, error: '工号不存在' })
        return
      }

      res.json({ success: true, data: staff })
    } catch (err) {
      console.error(err)
      res.status(500).json({ success: false, error: '登录失败' })
    }
  }
)

export default router
