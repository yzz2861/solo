"use strict";
const electron = require("electron");
const api = {
  loadData: () => electron.ipcRenderer.invoke("data:load"),
  saveData: (data) => electron.ipcRenderer.invoke("data:save", data),
  exportFile: (data) => electron.ipcRenderer.invoke("data:export-file", data),
  importFile: () => electron.ipcRenderer.invoke("data:import-file"),
  printPairings: (html) => electron.ipcRenderer.invoke("print:pairings", html),
  printStandings: (html) => electron.ipcRenderer.invoke("print:standings", html),
  onRequestSave: (cb) => {
    electron.ipcRenderer.on("app:request-save", cb);
    return () => electron.ipcRenderer.removeListener("app:request-save", cb);
  },
  onMenuExport: (cb) => {
    electron.ipcRenderer.on("menu:export", cb);
    return () => electron.ipcRenderer.removeListener("menu:export", cb);
  },
  onMenuImport: (cb) => {
    electron.ipcRenderer.on("menu:import", cb);
    return () => electron.ipcRenderer.removeListener("menu:import", cb);
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
