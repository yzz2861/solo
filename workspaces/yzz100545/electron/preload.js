const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getElderly: () => ipcRenderer.invoke('elderly:list'),
  addElderly: (data) => ipcRenderer.invoke('elderly:add', data),
  updateElderly: (id, data) => ipcRenderer.invoke('elderly:update', id, data),
  deleteElderly: (id) => ipcRenderer.invoke('elderly:delete', id),
  getElderlyById: (id) => ipcRenderer.invoke('elderly:get', id),
  searchElderly: (keyword) => ipcRenderer.invoke('elderly:search', keyword),

  getTicketTypes: () => ipcRenderer.invoke('ticket:types'),
  addTicketType: (data) => ipcRenderer.invoke('ticket:type:add', data),
  updateTicketType: (id, data) => ipcRenderer.invoke('ticket:type:update', id, data),
  deleteTicketType: (id) => ipcRenderer.invoke('ticket:type:delete', id),

  getSubsidy: (elderlyId) => ipcRenderer.invoke('subsidy:list', elderlyId),
  addSubsidy: (data) => ipcRenderer.invoke('subsidy:add', data),
  checkSubsidyConflict: (elderlyId, ticketTypeId, validFrom, validTo) => 
    ipcRenderer.invoke('subsidy:check-conflict', elderlyId, ticketTypeId, validFrom, validTo),
  getExpiredSubsidyCount: () => ipcRenderer.invoke('subsidy:expired-count'),

  purchaseTicket: (data) => ipcRenderer.invoke('transaction:purchase', data),
  getTransactions: (filters) => ipcRenderer.invoke('transaction:list', filters),
  getElderlyBalance: (elderlyId) => ipcRenderer.invoke('elderly:balance', elderlyId),

  redeemTicket: (data) => ipcRenderer.invoke('transaction:redeem', data),
  refundTicket: (transactionId, reason) => ipcRenderer.invoke('transaction:refund', transactionId, reason),
  getUnredeemedTickets: (elderlyId) => ipcRenderer.invoke('transaction:unredeemed', elderlyId),

  getCredit: (elderlyId) => ipcRenderer.invoke('credit:list', elderlyId),
  addCredit: (data) => ipcRenderer.invoke('credit:add', data),
  repayCredit: (data) => ipcRenderer.invoke('credit:repay', data),
  getCreditLimit: () => ipcRenderer.invoke('credit:limit'),
  setCreditLimit: (limit) => ipcRenderer.invoke('credit:set-limit', limit),
  getOverCreditCount: () => ipcRenderer.invoke('credit:over-limit-count'),

  getDailyReport: (date) => ipcRenderer.invoke('report:daily', date),
  getElderlyUsageReport: (startDate, endDate) => ipcRenderer.invoke('report:elderly-usage', startDate, endDate),
  exportDailyReport: (date, filePath) => ipcRenderer.invoke('report:export-daily', date, filePath),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:save', options),

  getDashboardStats: () => ipcRenderer.invoke('dashboard:stats')
})
