import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { TradeInOrder, Technician, OrderStatus, WorkflowStage } from "@/types"
import { MOCK_ORDERS, MOCK_TECHNICIANS } from "./mockData"

interface TradeInStore {
  orders: TradeInOrder[]
  technicians: Technician[]
  currentRole: "clerk" | "reviewer" | "technician" | "finance"

  setCurrentRole: (role: "clerk" | "reviewer" | "technician" | "finance") => void
  addOrder: (order: TradeInOrder) => void
  updateOrder: (id: string, updates: Partial<TradeInOrder>) => void
  getOrderById: (id: string) => TradeInOrder | undefined
  getOrdersByStatus: (status: OrderStatus) => TradeInOrder[]
  advanceWorkflow: (id: string, remark: string, operator: string) => void
  rejectOrder: (id: string, remark: string, operator: string) => void
  confirmRecycling: (id: string, code: string, operator: string) => boolean
  checkPhotoDuplicate: (hash: string, excludeOrderId?: string) => TradeInOrder | null
  resetToMock: () => void
}

export const useStore = create<TradeInStore>()(
  persist(
    (set, get) => ({
      orders: MOCK_ORDERS,
      technicians: MOCK_TECHNICIANS,
      currentRole: "clerk",

      setCurrentRole: (role) => set({ currentRole: role }),

      addOrder: (order) =>
        set((state) => ({ orders: [...state.orders, order] })),

      updateOrder: (id, updates) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
          ),
        })),

      getOrderById: (id) => get().orders.find((o) => o.id === id),

      getOrdersByStatus: (status) => get().orders.filter((o) => o.status === status),

      advanceWorkflow: (id, remark, operator) => {
        const order = get().getOrderById(id)
        if (!order) return

        const statusFlow: Record<string, OrderStatus> = {
          draft: "assessing",
          assessing: "reviewing",
          reviewing: "approved",
          approved: "recycling",
          recycling: "completed",
        }

        const stageMap: Record<string, WorkflowStage> = {
          assessing: "assessing",
          reviewing: "reviewing",
          approved: "recycling",
          recycling: "completed",
        }

        const newStatus = statusFlow[order.status]
        if (!newStatus) return

        const now = new Date().toISOString()
        const newWorkflow = order.workflow.map((step) => {
          if (step.stage === stageMap[order.status] && step.status !== "done") {
            return { ...step, status: "done" as const, operator, operatedAt: now, remark }
          }
          if (step.stage === stageMap[newStatus] && step.status === "pending") {
            return { ...step, status: "in_progress" as const }
          }
          return step
        })

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id
              ? { ...o, status: newStatus, workflow: newWorkflow, updatedAt: now }
              : o
          ),
        }))
      },

      rejectOrder: (id, remark, operator) => {
        const order = get().getOrderById(id)
        if (!order) return

        const now = new Date().toISOString()
        const newWorkflow = order.workflow.map((step) => {
          if (step.status === "in_progress") {
            return { ...step, status: "rejected" as const, operator, operatedAt: now, remark }
          }
          return step
        })

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id
              ? { ...o, status: "rejected", workflow: newWorkflow, updatedAt: now }
              : o
          ),
        }))
      },

      confirmRecycling: (id, code, operator) => {
        const order = get().getOrderById(id)
        if (!order) return false
        if (code !== order.recycling.confirmationCode) return false

        const now = new Date().toISOString()
        const newWorkflow = order.workflow.map((step) => {
          if (step.stage === "recycling") {
            return { ...step, status: "done" as const, operator, operatedAt: now, remark: "回收已确认" }
          }
          if (step.stage === "completed" && step.status === "pending") {
            return { ...step, status: "in_progress" as const }
          }
          return step
        })

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id
              ? { ...o, recycling: { ...o.recycling, confirmedAt: now }, workflow: newWorkflow, updatedAt: now }
              : o
          ),
        }))

        get().advanceWorkflow(id, "回收确认完成，系统自动结案", "系统")
        return true
      },

      checkPhotoDuplicate: (hash, excludeOrderId) => {
        const orders = get().orders
        for (const order of orders) {
          if (excludeOrderId && order.id === excludeOrderId) continue
          for (const photo of order.oldAppliance.photos) {
            if (photo.hash === hash) return order
          }
          const docs = order.subsidyDocs
          const allDocs = [docs.idCard, docs.purchaseProof, docs.subsidyQualification].filter(Boolean)
          for (const doc of allDocs) {
            if (doc && doc.hash === hash) return order
          }
        }
        return null
      },

      resetToMock: () => set({ orders: MOCK_ORDERS, technicians: MOCK_TECHNICIANS }),
    }),
    {
      name: "trade-in-storage",
    }
  )
)
