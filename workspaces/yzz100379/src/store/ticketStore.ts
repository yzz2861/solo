import { create } from 'zustand'
import type { WorkOrder, WorkOrderStatus } from '@/shared/types'
import { api } from '@/api/client'

interface TicketState {
  tickets: WorkOrder[]
  currentTicket: WorkOrder | null
  loading: boolean
  error: string | null
  fetchTickets: (status?: WorkOrderStatus) => Promise<void>
  fetchTicket: (id: string) => Promise<void>
  setCurrentTicket: (ticket: WorkOrder | null) => void
  clearError: () => void
}

export const useTicketStore = create<TicketState>((set) => ({
  tickets: [],
  currentTicket: null,
  loading: false,
  error: null,
  fetchTickets: async (status) => {
    set({ loading: true, error: null })
    try {
      const data = await api.getTickets(status ? { status } : undefined)
      set({ tickets: data, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '获取工单失败', loading: false })
    }
  },
  fetchTicket: async (id) => {
    set({ loading: true, error: null })
    try {
      const data = await api.getTicket(id)
      set({ currentTicket: data, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '获取工单详情失败', loading: false })
    }
  },
  setCurrentTicket: (ticket) => set({ currentTicket: ticket }),
  clearError: () => set({ error: null }),
}))
