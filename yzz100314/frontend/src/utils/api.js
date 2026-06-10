const BASE_URL = '/api'

async function request(url, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })
    
    const contentType = response.headers.get('content-type')
    
    if (!response.ok) {
      let errorMsg = '请求失败'
      try {
        const errData = await response.json()
        errorMsg = errData.error || errorMsg
      } catch (e) {}
      throw new Error(errorMsg)
    }
    
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }
    
    return response
  } catch (error) {
    console.error('API请求错误:', error)
    throw error
  }
}

export const api = {
  getTickets(params = {}) {
    const query = new URLSearchParams(params).toString()
    return request(`/tickets?${query}`)
  },

  getTicket(ticketNo) {
    return request(`/tickets/${ticketNo}`)
  },

  getAnomalySummary() {
    return request('/tickets/anomalies/summary')
  },

  importTicketsCsv(file) {
    const formData = new FormData()
    formData.append('file', file)
    return request('/import/tickets/csv', {
      method: 'POST',
      body: formData,
      headers: {},
    })
  },

  importEscalationsJson(file) {
    const formData = new FormData()
    formData.append('file', file)
    return request('/import/escalations/json', {
      method: 'POST',
      body: formData,
      headers: {},
    })
  },

  importSupplements(file) {
    const formData = new FormData()
    formData.append('file', file)
    return request('/import/supplements', {
      method: 'POST',
      body: formData,
      headers: {},
    })
  },

  getBatches() {
    return request('/import/batches')
  },

  getReview(ticketNo) {
    return request(`/reviews/${ticketNo}`)
  },

  updateReview(ticketNo, data) {
    return request(`/reviews/${ticketNo}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  getReportSummary() {
    return request('/reports/summary')
  },

  exportReport(anomalyOnly = false) {
    const url = `/reports/export${anomalyOnly ? '?anomaly_only=true' : ''}`
    return request(url)
  },

  exportTicketDetail(ticketNo) {
    return request(`/reports/details/${ticketNo}/export`)
  },

  downloadFile(url, filename) {
    return fetch(`${BASE_URL}${url}`)
      .then(response => response.blob())
      .then(blob => {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename
        link.click()
        URL.revokeObjectURL(link.href)
      })
  },
}
