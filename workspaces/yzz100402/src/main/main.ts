import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import {
  getDepartments,
  getDoctors,
  setDoctorActive,
  findPatient,
  createPatient,
  updatePatient,
  checkDuplicateToday,
  addToQueue,
  getTodayQueue,
  callNext,
  callNumber,
  passNumber,
  recoverNumber,
  changeDoctor,
  cancelNumber,
  finishCall,
  getCallRecords,
  getDailyStats,
  exportWaitingList,
  generateReceiptHtml,
  getQueueDetail,
  getAppState,
  setAppState,
  deleteAppState,
} from './services';

let mainWindow: BrowserWindow | null = null;
let printWindow: BrowserWindow | null = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: '小诊所叫号桌面台',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = 'http://localhost:5173';
  const prodUrl = path.join(__dirname, '../renderer/index.html');

  if (app.isPackaged) {
    mainWindow.loadFile(prodUrl);
  } else {
    mainWindow.loadURL(devUrl);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createPrintWindow() {
  printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
}

app.whenReady().then(() => {
  createMainWindow();
  createPrintWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function handle<T extends (...args: any[]) => any>(
  channel: string,
  fn: T
) {
  ipcMain.handle(channel, async (_e, ...args: Parameters<T>) => {
    try {
      const result = await fn(...args);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  });
}

handle('departments:list', getDepartments);
handle('doctors:list', (depId?: number) => getDoctors(depId));
handle('doctors:setActive', (id: number, active: boolean) => setDoctorActive(id, active));
handle(
  'patients:find',
  (name: string, phone?: string, idCard?: string) => findPatient(name, phone, idCard)
);
handle('patients:create', (data: any) => createPatient(data));
handle('patients:update', (id: number, data: any) => updatePatient(id, data));
handle(
  'queue:checkDuplicate',
  (patientId: number, doctorId: number) => checkDuplicateToday(patientId, doctorId)
);
handle('queue:add', (data: any) => addToQueue(data));
handle('queue:today', (doctorId?: number) => getTodayQueue(doctorId));
handle('queue:detail', (id: number) => getQueueDetail(id));
handle('queue:callNext', (doctorId: number) => callNext(doctorId));
handle('queue:callNumber', (id: number) => callNumber(id));
handle('queue:passNumber', (id: number) => passNumber(id));
handle('queue:recoverNumber', (id: number) => recoverNumber(id));
handle('queue:changeDoctor', (id: number, newDocId: number, note?: string) =>
  changeDoctor(id, newDocId, note)
);
handle('queue:cancelNumber', (id: number, note?: string) => cancelNumber(id, note));
handle('queue:finishCall', (id: number) => finishCall(id));
handle('records:list', (date?: string) => getCallRecords(date));
handle('stats:daily', (start?: string, end?: string) => getDailyStats(start, end));
handle('appState:get', (key: string) => getAppState(key));
handle('appState:set', (key: string, value: string) => setAppState(key, value));
handle('appState:delete', (key: string) => deleteAppState(key));

ipcMain.handle('export:waitingList', async () => {
  try {
    const filePath = await exportWaitingList();
    return { success: true, data: filePath };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('print:receipt', async (_e, queueId: number) => {
  try {
    const detail = await getQueueDetail(queueId);
    if (!detail) return { success: false, error: '找不到该号单' };
    const html = generateReceiptHtml(detail);
    if (!printWindow) createPrintWindow();
    await printWindow!.loadURL(
      'data:text/html;charset=utf-8,' + encodeURIComponent(html)
    );
    await new Promise<void>((resolve) => {
      printWindow!.webContents.print(
        { silent: false, printBackground: true, margins: { marginType: 'none' } },
        () => resolve()
      );
    });
    return { success: true, data: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('dialog:saveFile', async (_e, defaultPath: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath,
    filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
  });
  return { success: !result.canceled, data: result.filePath || null };
});

ipcMain.handle('shell:openPath', async (_e, filePath: string) => {
  shell.openPath(filePath);
  return { success: true };
});

ipcMain.handle('dialog:showConfirm', async (_e, message: string) => {
  const result = await dialog.showMessageBox(mainWindow!, {
    type: 'question',
    buttons: ['取消', '确认'],
    defaultId: 1,
    title: '确认',
    message,
  });
  return { success: true, data: result.response === 1 };
});
