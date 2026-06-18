const API_BASE = '/api'

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || '请求失败')
  }

  return data
}

export const api = {
  getConfig: () => request('/config'),
  updateConfig: (data) => request('/config', { method: 'PUT', body: data }),

  getCourses: () => request('/courses'),
  addCourse: (name) => request('/courses', { method: 'POST', body: { name } }),

  getSellers: () => request('/sellers'),
  addSeller: (data) => request('/sellers', { method: 'POST', body: data }),

  getTextbooks: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/textbooks${query ? `?${query}` : ''}`)
  },
  getTextbookStats: () => request('/textbooks/stats'),
  getTextbook: (id) => request(`/textbooks/${id}`),
  addTextbook: (data) => request('/textbooks', { method: 'POST', body: data }),
  updateTextbook: (id, data) => request(`/textbooks/${id}`, { method: 'PUT', body: data }),
  lockTextbook: (id, data) => request(`/textbooks/${id}/lock`, { method: 'POST', body: data }),
  releaseTextbook: (id) => request(`/textbooks/${id}/release`, { method: 'POST' }),
  confirmPickup: (id, data) => request(`/textbooks/${id}/confirm-pickup`, { method: 'POST', body: data }),
  cancelTextbook: (id) => request(`/textbooks/${id}/cancel`, { method: 'POST' }),
  refundTextbook: (id, reason) => request(`/textbooks/${id}/refund`, { method: 'POST', body: { reason } }),

  getOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/orders${query ? `?${query}` : ''}`)
  },
  getOrder: (id) => request(`/orders/${id}`),

  getSellerSettlements: () => request('/settlement/sellers'),
  getSellerDetail: (sellerId) => request(`/settlement/sellers/${sellerId}`),
  getCourseSettlements: () => request('/settlement/courses'),
  getStuckTextbooks: () => request('/settlement/stuck-textbooks'),
  getSettlementSummary: () => request('/settlement/summary'),

  getExpiringReminders: () => request('/reminders/expiring-pickups', { method: 'POST' }),

  exportSellerSettlement: () => request('/export/seller-settlement'),
  exportPendingPickup: () => request('/export/pending-pickup'),
  exportStuckTextbooks: () => request('/export/stuck-textbooks'),
  exportSellerDetail: (sellerId) => request(`/export/seller/${sellerId}`),
}

export const statusLabels = {
  on_shelf: '在售',
  locked: '已预订',
  sold: '已售出',
  picked_up: '已取书',
  cancelled: '已取消',
  refunded: '已退款',
  pending: '待取书',
  completed: '已完成',
  expired: '已过期',
  pickup_expired: '取书超时',
}

export const conditionLabels = {
  new: '全新',
  like_new: '几乎全新',
  good: '良好',
  fair: '一般',
  poor: '较差',
}

export function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function downloadCSV(data, filename) {
  if (!data || data.length === 0) {
    alert('没有数据可导出')
    return
  }

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const value = String(row[h] || '')
        return value.includes(',') || value.includes('\n') ? `"${value}"` : value
      }).join(',')
    )
  ].join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
