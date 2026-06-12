import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  order: {
    create: (data: any) => ipcRenderer.invoke('order:create', data),
    list: () => ipcRenderer.invoke('order:list'),
    get: (id: number) => ipcRenderer.invoke('order:get', id),
    update: (id: number, updates: any, operator?: string) => 
      ipcRenderer.invoke('order:update', id, updates, operator),
    delete: (id: number) => ipcRenderer.invoke('order:delete', id),
    pending: () => ipcRenderer.invoke('orders:pending'),
  },
  version: {
    add: (orderId: number, data: any) => ipcRenderer.invoke('version:add', orderId, data),
    setFinal: (orderId: number, versionId: number, isFinal: boolean) => 
      ipcRenderer.invoke('version:setFinal', orderId, versionId, isFinal),
    delete: (id: number) => ipcRenderer.invoke('version:delete', id),
  },
  warnings: {
    check: () => ipcRenderer.invoke('warnings:check'),
    list: () => ipcRenderer.invoke('warnings:list'),
    markRead: (id: number) => ipcRenderer.invoke('warnings:markRead', id),
  },
  export: {
    deliveryList: (startDate: string, endDate: string) => 
      ipcRenderer.invoke('export:deliveryList', startDate, endDate),
    excel: (data: any[], fileName: string) => ipcRenderer.invoke('export:excel', data, fileName),
  },
  file: {
    check: (path: string) => ipcRenderer.invoke('file:check', path),
  },
})
