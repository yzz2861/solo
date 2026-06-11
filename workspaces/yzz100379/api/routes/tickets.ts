import { Router } from 'express'
import type { Request, Response } from 'express'
import {
  createTicket,
  getTicketList,
  getTicketById,
  updateTicket,
  assignTicket,
  updateTicketStatus,
  exportTicket,
  exportAllTickets,
  type TicketFilters
} from '../services/ticketService'
import type {
  WorkOrder,
  CreateTicketRequest,
  UpdateTicketRequest,
  AssignTicketRequest,
  WorkOrderStatus
} from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

const router = Router()

router.post(
  '/',
  async (req: Request, res: Response<ApiResponse<WorkOrder>>) => {
    try {
      const { sourceText } = req.body as CreateTicketRequest

      if (!sourceText?.trim()) {
        res.status(400).json({ success: false, error: '请输入报修内容' })
        return
      }

      const ticket = await createTicket(sourceText.trim())
      res.status(201).json({ success: true, data: ticket })
    } catch (err) {
      console.error(err)
      res.status(500).json({ success: false, error: '创建工单失败' })
    }
  }
)

router.get(
  '/',
  async (req: Request, res: Response<ApiResponse<WorkOrder[]>>) => {
    try {
      const { status, assigneeId } = req.query
      const filters: TicketFilters = {}
      if (status) filters.status = status as WorkOrderStatus
      if (assigneeId) filters.assigneeId = assigneeId as string

      const tickets = await getTicketList(filters)
      res.json({ success: true, data: tickets })
    } catch (err) {
      console.error(err)
      res.status(500).json({ success: false, error: '获取工单列表失败' })
    }
  }
)

router.get(
  '/export',
  async (req: Request, res: Response<ApiResponse<WorkOrder[]>>) => {
    try {
      const tickets = await exportAllTickets()
      res.json({ success: true, data: tickets })
    } catch (err) {
      console.error(err)
      res.status(500).json({ success: false, error: '导出失败' })
    }
  }
)

router.get(
  '/:id',
  async (req: Request, res: Response<ApiResponse<WorkOrder>>) => {
    try {
      const { id } = req.params
      const ticket = await getTicketById(id)
      res.json({ success: true, data: ticket })
    } catch (err) {
      console.error(err)
      if (err instanceof Error && err.message === '工单不存在') {
        res.status(404).json({ success: false, error: err.message })
      } else {
        res.status(500).json({ success: false, error: '获取工单详情失败' })
      }
    }
  }
)

router.put(
  '/:id',
  async (req: Request, res: Response<ApiResponse<WorkOrder>>) => {
    try {
      const { id } = req.params
      const updates = req.body as UpdateTicketRequest

      const ticket = await updateTicket(id, updates)
      res.json({ success: true, data: ticket })
    } catch (err) {
      console.error(err)
      if (err instanceof Error && err.message === '工单不存在') {
        res.status(404).json({ success: false, error: err.message })
      } else {
        res.status(500).json({ success: false, error: '更新工单失败' })
      }
    }
  }
)

router.post(
  '/:id/assign',
  async (req: Request, res: Response<ApiResponse<WorkOrder>>) => {
    try {
      const { id } = req.params
      const assignment = req.body as AssignTicketRequest

      if (!assignment.assigneeId) {
        res.status(400).json({ success: false, error: '请选择维修师傅' })
        return
      }

      if (!assignment.shortMessage?.trim()) {
        res.status(400).json({ success: false, error: '请输入短派单语' })
        return
      }

      const ticket = await assignTicket(id, assignment)
      res.json({ success: true, data: ticket })
    } catch (err) {
      console.error(err)
      res.status(500).json({ success: false, error: '派单失败' })
    }
  }
)

router.put(
  '/:id/status',
  async (req: Request, res: Response<ApiResponse<WorkOrder>>) => {
    try {
      const { id } = req.params
      const { status, editorId, editorName } = req.body as {
        status: WorkOrderStatus
        editorId: string
        editorName: string
      }

      if (!status) {
        res.status(400).json({ success: false, error: '请提供状态' })
        return
      }
      if (!editorId || !editorName) {
        res.status(400).json({ success: false, error: '请提供操作人信息' })
        return
      }

      const ticket = await updateTicketStatus(id, status, editorId, editorName)
      res.json({ success: true, data: ticket })
    } catch (err) {
      console.error(err)
      res.status(500).json({ success: false, error: '更新状态失败' })
    }
  }
)

router.get(
  '/:id/export',
  async (req: Request, res: Response<ApiResponse<WorkOrder>>) => {
    try {
      const { id } = req.params
      const ticket = await exportTicket(id)
      res.json({ success: true, data: ticket })
    } catch (err) {
      console.error(err)
      if (err instanceof Error && err.message === '工单不存在') {
        res.status(404).json({ success: false, error: err.message })
      } else {
        res.status(500).json({ success: false, error: '导出失败' })
      }
    }
  }
)

export default router
