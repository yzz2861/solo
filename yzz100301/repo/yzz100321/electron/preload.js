const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
});
