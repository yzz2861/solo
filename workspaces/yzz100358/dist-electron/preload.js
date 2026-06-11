import { contextBridge as t, ipcRenderer as i } from "electron";
const a = {
  clients: {
    list: (e) => i.invoke("clients:list", e),
    get: (e) => i.invoke("clients:get", e),
    save: (e) => i.invoke("clients:save", e),
    delete: (e) => i.invoke("clients:delete", e)
  },
  artists: {
    list: (e = !0) => i.invoke("artists:list", e),
    save: (e) => i.invoke("artists:save", e)
  },
  bodyParts: {
    list: () => i.invoke("bodyParts:list")
  },
  bookings: {
    list: (e) => i.invoke("bookings:list", e),
    get: (e) => i.invoke("bookings:get", e),
    checkConflict: (e, o, s, n) => i.invoke("bookings:checkConflict", e, o, s, n),
    save: (e) => i.invoke("bookings:save", e),
    cancel: (e) => i.invoke("bookings:cancel", e),
    today: (e) => i.invoke("bookings:today", e)
  },
  designs: {
    list: (e) => i.invoke("designs:list", e),
    get: (e) => i.invoke("designs:get", e),
    save: (e) => i.invoke("designs:save", e),
    delete: (e) => i.invoke("designs:delete", e),
    checkImages: () => i.invoke("designs:checkImages"),
    uploadImage: (e, o) => i.invoke("designs:uploadImage", e, o)
  },
  deposits: {
    list: (e) => i.invoke("deposits:list", e),
    save: (e) => i.invoke("deposits:save", e),
    uploadImage: (e, o) => i.invoke("deposits:uploadImage", e, o)
  },
  alerts: {
    generate: () => i.invoke("alerts:generate")
  },
  export: {
    confirmation: (e, o) => i.invoke("export:confirmation", e, o)
  },
  dialog: {
    openFile: (e) => i.invoke("dialog:openFile", e),
    openDirectory: () => i.invoke("dialog:openDirectory")
  },
  fs: {
    fileExists: (e) => i.invoke("fs:fileExists", e),
    readFile: (e) => i.invoke("fs:readFile", e)
  },
  app: {
    getDbPath: () => i.invoke("app:getDbPath"),
    backupDb: () => i.invoke("app:backupDb"),
    restoreDb: () => i.invoke("app:restoreDb")
  }
};
t.exposeInMainWorld("electronAPI", a);
