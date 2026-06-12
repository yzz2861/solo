import { contextBridge, ipcRenderer } from 'electron'

const api = {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data: unknown) => ipcRenderer.invoke('data:save', data),
  exportFile: (data: unknown) => ipcRenderer.invoke('data:export-file', data),
  importFile: () => ipcRenderer.invoke('data:import-file'),
  printPairings: (html: string) => ipcRenderer.invoke('print:pairings', html),
  printStandings: (html: string) => ipcRenderer.invoke('print:standings', html),
  onRequestSave: (cb: () => void) => {
    ipcRenderer.on('app:request-save', cb)
    return () => ipcRenderer.removeListener('app:request-save', cb)
  },
  onMenuExport: (cb: () => void) => {
    ipcRenderer.on('menu:export', cb)
    return () => ipcRenderer.removeListener('menu:export', cb)
  },
  onMenuImport: (cb: () => void) => {
    ipcRenderer.on('menu:import', cb)
    return () => ipcRenderer.removeListener('menu:import', cb)
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ChessAPI = typeof api
