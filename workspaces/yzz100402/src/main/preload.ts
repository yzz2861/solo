import { contextBridge, ipcRenderer } from 'electron';

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

async function invoke<T>(channel: string, ...args: unknown[]): Promise<ApiResult<T>> {
  return ipcRenderer.invoke(channel, ...args);
}

export const api = {
  getDepartments: () => invoke('departments:list'),
  getDoctors: (depId?: number) => invoke('doctors:list', depId),
  setDoctorActive: (id: number, active: boolean) => invoke('doctors:setActive', id, active),
  findPatient: (name: string, phone?: string, idCard?: string) =>
    invoke('patients:find', name, phone, idCard),
  createPatient: (data: any) => invoke('patients:create', data),
  updatePatient: (id: number, data: any) => invoke('patients:update', id, data),
  checkDuplicate: (patientId: number, doctorId: number) =>
    invoke('queue:checkDuplicate', patientId, doctorId),
  addToQueue: (data: any) => invoke('queue:add', data),
  getTodayQueue: (doctorId?: number) => invoke('queue:today', doctorId),
  getQueueDetail: (id: number) => invoke('queue:detail', id),
  callNext: (doctorId: number) => invoke('queue:callNext', doctorId),
  callNumber: (id: number) => invoke('queue:callNumber', id),
  passNumber: (id: number) => invoke('queue:passNumber', id),
  recoverNumber: (id: number) => invoke('queue:recoverNumber', id),
  changeDoctor: (id: number, newDocId: number, note?: string) =>
    invoke('queue:changeDoctor', id, newDocId, note),
  cancelNumber: (id: number, note?: string) => invoke('queue:cancelNumber', id, note),
  finishCall: (id: number) => invoke('queue:finishCall', id),
  getCallRecords: (date?: string) => invoke('records:list', date),
  getDailyStats: (start?: string, end?: string) => invoke('stats:daily', start, end),
  getAppState: (key: string) => invoke('appState:get', key),
  setAppState: (key: string, value: string) => invoke('appState:set', key, value),
  deleteAppState: (key: string) => invoke('appState:delete', key),
  exportWaitingList: () => invoke('export:waitingList'),
  printReceipt: (queueId: number) => invoke('print:receipt', queueId),
  showConfirm: (message: string) => invoke('dialog:showConfirm', message),
  openPath: (filePath: string) => invoke('shell:openPath', filePath),
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
