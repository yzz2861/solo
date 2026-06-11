import type {
  WorkOrder,
  Staff,
  CreateTicketRequest,
  UpdateTicketRequest,
  AssignTicketRequest,
  LoginRequest,
  LoginResponse,
  WorkOrderStatus,
} from '@/shared/types'

const BASE_URL = '/api'

interface ApiResp<T> {
  success: boolean
  data?: T
  error?: string
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = (await res.json().catch(() => ({}))) as ApiResp<T>

  if (!res.ok) {
    throw new Error(data.error || '请求失败')
  }

  if (!data.success) {
    throw new Error(data.error || '请求失败')
  }

  return data.data as T
}

export const api = {
  request,

  createTicket(sourceText: string) {
    return request<WorkOrder>('POST', '/tickets', {
      sourceText,
    } as CreateTicketRequest)
  },

  getTickets(params?: { status?: WorkOrderStatus; assigneeId?: string }) {
    const queryParts: string[] = []
    if (params?.status) queryParts.push(`status=${params.status}`)
    if (params?.assigneeId) queryParts.push(`assigneeId=${params.assigneeId}`)
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
    return request<WorkOrder[]>('GET', `/tickets${query}`)
  },

  getTicket(id: string) {
    return request<WorkOrder>('GET', `/tickets/${id}`)
  },

  updateTicket(id: string, data: UpdateTicketRequest) {
    return request<WorkOrder>('PUT', `/tickets/${id}`, data)
  },

  assignTicket(id: string, data: AssignTicketRequest) {
    return request<WorkOrder>('POST', `/tickets/${id}/assign`, data)
  },

  updateTicketStatus(
    id: string,
    status: WorkOrderStatus,
    editorId: string,
    editorName: string
  ) {
    return request<WorkOrder>('PUT', `/tickets/${id}/status`, {
      status,
      editorId,
      editorName,
    })
  },

  exportTicket(id: string) {
    const token = localStorage.getItem('auth_token')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return fetch(`${BASE_URL}/tickets/${id}/export`, {
      method: 'GET',
      headers,
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error('导出失败')
      }
      const data = (await res.json()) as ApiResp<WorkOrder>
      if (!data.success) {
        throw new Error(data.error || '导出失败')
      }
      return data.data as WorkOrder
    })
  },

  exportAllTickets() {
    return request<WorkOrder[]>('GET', '/tickets/export')
  },

  getTechTickets(techId: string) {
    return request<WorkOrder[]>('GET', `/tech/tickets?techId=${techId}`)
  },

  getTechs() {
    return request<Staff[]>('GET', '/staff/techs')
  },

  getStaff(id: string) {
    return request<Staff>('GET', `/staff/${id}`)
  },

  login(staffId: string) {
    return request<LoginResponse['staff']>('POST', '/auth/login', {
      staffId,
    } as LoginRequest).then((staff) => ({ staff }))
  },
}
