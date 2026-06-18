import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getDataDir: () => ipcRenderer.invoke('getDataDir'),
  readJsonFile: (filename: string) => ipcRenderer.invoke('readJsonFile', filename),
  writeJsonFile: (filename: string, data: unknown) => ipcRenderer.invoke('writeJsonFile', filename, data),
  checkFileExists: (filePath: string) => ipcRenderer.invoke('checkFileExists', filePath),
  selectVideoFile: () => ipcRenderer.invoke('selectVideoFile'),
  selectDirectory: () => ipcRenderer.invoke('selectDirectory'),
  showSaveDialog: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('showSaveDialog', options),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('writeFile', filePath, content),
  writeBuffer: (filePath: string, buffer: Uint8Array) => ipcRenderer.invoke('writeBuffer', filePath, buffer),
  openInFolder: (filePath: string) => ipcRenderer.invoke('openInFolder', filePath),
  getFileInfo: (filePath: string) => ipcRenderer.invoke('getFileInfo', filePath)
})

declare global {
  interface Window {
    electronAPI: {
      getDataDir: () => Promise<string>
      readJsonFile: (filename: string) => Promise<unknown>
      writeJsonFile: (filename: string, data: unknown) => Promise<{ success: boolean; path?: string; error?: string }>
      checkFileExists: (filePath: string) => Promise<boolean>
      selectVideoFile: () => Promise<string | null>
      selectDirectory: () => Promise<string | null>
      showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<string | null>
      writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
      writeBuffer: (filePath: string, buffer: Uint8Array) => Promise<{ success: boolean; error?: string }>
      openInFolder: (filePath: string) => Promise<boolean>
      getFileInfo: (filePath: string) => Promise<{
        exists: boolean
        size?: number
        sizeMB?: string
        modified?: string
        created?: string
      }>
    }
  }
}
