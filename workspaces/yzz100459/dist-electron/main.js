"use strict";
const electron = require("electron");
const path = require("node:path");
const fs = require("node:fs");
process.env.DIST_ELECTRON = path.join(__dirname, "..");
process.env.DIST = path.join(process.env.DIST_ELECTRON, "../dist");
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL ? path.join(process.env.DIST_ELECTRON, "../public") : process.env.DIST;
const getAppDataPath = () => {
  return electron.app.getPath("userData");
};
const getDataFilePath = () => {
  return path.join(getAppDataPath(), "tournament-data.json");
};
const ensureDataDir = () => {
  const dir = getAppDataPath();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};
let win = null;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  win = new electron.BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: "棋社比赛编排台",
    icon: path.join(process.env.PUBLIC, "favicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });
  const template = [
    {
      label: "文件",
      submenu: [
        {
          label: "导出对阵档案",
          click: async () => {
            win == null ? void 0 : win.webContents.send("menu:export");
          },
          accelerator: "CmdOrCtrl+E"
        },
        {
          label: "导入对阵档案",
          click: async () => {
            win == null ? void 0 : win.webContents.send("menu:import");
          },
          accelerator: "CmdOrCtrl+I"
        },
        { type: "separator" },
        { role: "quit", label: "退出" }
      ]
    },
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "刷新" },
        { role: "toggleDevTools", label: "开发者工具" },
        { type: "separator" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { role: "resetZoom", label: "重置缩放" },
        { type: "separator" },
        { role: "togglefullscreen", label: "全屏" }
      ]
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "使用说明",
          click: () => {
            electron.shell.openExternal("https://www.fide.com/docs/regulations/FIDE%20Tournament%20Rules.pdf");
          }
        },
        { role: "about", label: "关于" }
      ]
    }
  ];
  electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(template));
  win.on("close", async (e) => {
    e.preventDefault();
    win == null ? void 0 : win.webContents.send("app:request-save");
    setTimeout(() => {
      win == null ? void 0 : win.destroy();
    }, 300);
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.whenReady().then(() => {
  ensureDataDir();
  createWindow();
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
electron.ipcMain.handle("data:load", async () => {
  ensureDataDir();
  const filePath = getDataFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return { success: true, data: JSON.parse(raw) };
    }
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
electron.ipcMain.handle("data:save", async (_e, payload) => {
  ensureDataDir();
  const filePath = getDataFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
electron.ipcMain.handle("data:export-file", async (_e, payload) => {
  const result = await electron.dialog.showSaveDialog({
    title: "导出对阵档案",
    defaultPath: `棋社对阵档案_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.ctm`,
    filters: [
      { name: "棋社对阵档案", extensions: ["ctm", "json"] },
      { name: "所有文件", extensions: ["*"] }
    ]
  });
  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }
  try {
    fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2), "utf-8");
    return { success: true, path: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
electron.ipcMain.handle("data:import-file", async () => {
  const result = await electron.dialog.showOpenDialog({
    title: "导入对阵档案",
    filters: [
      { name: "棋社对阵档案", extensions: ["ctm", "json"] },
      { name: "所有文件", extensions: ["*"] }
    ],
    properties: ["openFile"]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true };
  }
  try {
    const raw = fs.readFileSync(result.filePaths[0], "utf-8");
    return { success: true, data: JSON.parse(raw), path: result.filePaths[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
electron.ipcMain.handle("print:pairings", async (_e, html) => {
  const printWin = new electron.BrowserWindow({
    show: false,
    width: 900,
    height: 1200,
    webPreferences: {
      offscreen: false
    }
  });
  await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await electron.dialog.showMessageBox({
    type: "info",
    title: "打印对阵表",
    message: "准备打印对阵表",
    buttons: ["确定"]
  });
  printWin.webContents.print({}, (success) => {
    printWin.close();
  });
  return { success: true };
});
electron.ipcMain.handle("print:standings", async (_e, html) => {
  const printWin = new electron.BrowserWindow({
    show: false,
    width: 900,
    height: 1200,
    webPreferences: {
      offscreen: false
    }
  });
  await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await electron.dialog.showMessageBox({
    type: "info",
    title: "打印名次表",
    message: "准备打印名次表",
    buttons: ["确定"]
  });
  printWin.webContents.print({}, (success) => {
    printWin.close();
  });
  return { success: true };
});
