"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const DIST = path.join(__dirname, "../dist");
const PUBLIC = electron.app.isPackaged ? DIST : path.join(DIST, "../public");
let win;
function createWindow() {
  win = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: "家庭影像转录柜",
    icon: path.join(PUBLIC, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(DIST, "index.html"));
  }
  win.on("closed", () => {
    win = null;
  });
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
electron.app.whenReady().then(() => {
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
function getDataDir() {
  const dataDir = path.join(electron.app.getPath("userData"), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}
electron.ipcMain.handle("getDataDir", () => {
  return getDataDir();
});
electron.ipcMain.handle("readJsonFile", (_event, filename) => {
  const filePath = path.join(getDataDir(), filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    console.error("读取文件失败:", e);
    return null;
  }
});
electron.ipcMain.handle("writeJsonFile", (_event, filename, data) => {
  const filePath = path.join(getDataDir(), filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return { success: true, path: filePath };
  } catch (e) {
    console.error("写入文件失败:", e);
    return { success: false, error: String(e) };
  }
});
electron.ipcMain.handle("checkFileExists", (_event, filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (e) {
    return false;
  }
});
electron.ipcMain.handle("selectVideoFile", async () => {
  const result = await electron.dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "视频文件", extensions: ["mp4", "avi", "mov", "mkv", "wmv", "flv", "mpeg", "mpg"] },
      { name: "所有文件", extensions: ["*"] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});
electron.ipcMain.handle("selectDirectory", async () => {
  const result = await electron.dialog.showOpenDialog({
    properties: ["openDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});
electron.ipcMain.handle("showSaveDialog", async (_event, options) => {
  const result = await electron.dialog.showSaveDialog(options);
  if (result.canceled) return null;
  return result.filePath;
});
electron.ipcMain.handle("writeFile", (_event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, "utf-8");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});
electron.ipcMain.handle("writeBuffer", (_event, filePath, buffer) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});
electron.ipcMain.handle("openInFolder", (_event, filePath) => {
  electron.shell.showItemInFolder(filePath);
  return true;
});
electron.ipcMain.handle("getFileInfo", (_event, filePath) => {
  try {
    const stat = fs.statSync(filePath);
    return {
      exists: true,
      size: stat.size,
      sizeMB: (stat.size / 1024 / 1024).toFixed(2),
      modified: stat.mtime.toISOString(),
      created: stat.birthtime.toISOString()
    };
  } catch (e) {
    return { exists: false };
  }
});
