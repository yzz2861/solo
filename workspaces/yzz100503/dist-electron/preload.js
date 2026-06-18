"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  getDataDir: () => electron.ipcRenderer.invoke("getDataDir"),
  readJsonFile: (filename) => electron.ipcRenderer.invoke("readJsonFile", filename),
  writeJsonFile: (filename, data) => electron.ipcRenderer.invoke("writeJsonFile", filename, data),
  checkFileExists: (filePath) => electron.ipcRenderer.invoke("checkFileExists", filePath),
  selectVideoFile: () => electron.ipcRenderer.invoke("selectVideoFile"),
  selectDirectory: () => electron.ipcRenderer.invoke("selectDirectory"),
  showSaveDialog: (options) => electron.ipcRenderer.invoke("showSaveDialog", options),
  writeFile: (filePath, content) => electron.ipcRenderer.invoke("writeFile", filePath, content),
  writeBuffer: (filePath, buffer) => electron.ipcRenderer.invoke("writeBuffer", filePath, buffer),
  openInFolder: (filePath) => electron.ipcRenderer.invoke("openInFolder", filePath),
  getFileInfo: (filePath) => electron.ipcRenderer.invoke("getFileInfo", filePath)
});
