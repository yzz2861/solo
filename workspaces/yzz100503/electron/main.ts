import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'

const DIST = path.join(__dirname, '../dist')
const PUBLIC = app.isPackaged ? DIST : path.join(DIST, '../public')

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: '家庭影像转录柜',
    icon: path.join(PUBLIC, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(DIST, 'index.html'))
  }

  win.on('closed', () => {
    win = null
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

function getDataDir(): string {
  const dataDir = path.join(app.getPath('userData'), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return dataDir
}

ipcMain.handle('getDataDir', () => {
  return getDataDir()
})

ipcMain.handle('readJsonFile', (_event, filename: string) => {
  const filePath = path.join(getDataDir(), filename)
  if (!fs.existsSync(filePath)) {
    return null
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (e) {
    console.error('读取文件失败:', e)
    return null
  }
})

ipcMain.handle('writeJsonFile', (_event, filename: string, data: unknown) => {
  const filePath = path.join(getDataDir(), filename)
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true, path: filePath }
  } catch (e) {
    console.error('写入文件失败:', e)
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('checkFileExists', (_event, filePath: string) => {
  try {
    return fs.existsSync(filePath)
  } catch (e) {
    return false
  }
})

ipcMain.handle('selectVideoFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'mpeg', 'mpg'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('selectDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('showSaveDialog', async (_event, options) => {
  const result = await dialog.showSaveDialog(options)
  if (result.canceled) return null
  return result.filePath
})

ipcMain.handle('writeFile', (_event, filePath: string, content: string) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('writeBuffer', (_event, filePath: string, buffer: Uint8Array) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(buffer))
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('openInFolder', (_event, filePath: string) => {
  shell.showItemInFolder(filePath)
  return true
})

ipcMain.handle('getFileInfo', (_event, filePath: string) => {
  try {
    const stat = fs.statSync(filePath)
    return {
      exists: true,
      size: stat.size,
      sizeMB: (stat.size / 1024 / 1024).toFixed(2),
      modified: stat.mtime.toISOString(),
      created: stat.birthtime.toISOString()
    }
  } catch (e) {
    return { exists: false }
  }
})
