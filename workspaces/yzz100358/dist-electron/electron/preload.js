import { contextBridge, ipcRenderer } from 'electron';
const electronAPI = {
    clients: {
        list: (filters) => ipcRenderer.invoke('clients:list', filters),
        get: (id) => ipcRenderer.invoke('clients:get', id),
        save: (client) => ipcRenderer.invoke('clients:save', client),
        delete: (id) => ipcRenderer.invoke('clients:delete', id),
    },
    artists: {
        list: (activeOnly = true) => ipcRenderer.invoke('artists:list', activeOnly),
        save: (artist) => ipcRenderer.invoke('artists:save', artist),
    },
    bodyParts: {
        list: () => ipcRenderer.invoke('bodyParts:list'),
    },
    bookings: {
        list: (filters) => ipcRenderer.invoke('bookings:list', filters),
        get: (id) => ipcRenderer.invoke('bookings:get', id),
        checkConflict: (artistId, startTime, endTime, excludeBookingId) => ipcRenderer.invoke('bookings:checkConflict', artistId, startTime, endTime, excludeBookingId),
        save: (booking) => ipcRenderer.invoke('bookings:save', booking),
        cancel: (id) => ipcRenderer.invoke('bookings:cancel', id),
        today: (artistId) => ipcRenderer.invoke('bookings:today', artistId),
    },
    designs: {
        list: (filters) => ipcRenderer.invoke('designs:list', filters),
        get: (id) => ipcRenderer.invoke('designs:get', id),
        save: (design) => ipcRenderer.invoke('designs:save', design),
        delete: (id) => ipcRenderer.invoke('designs:delete', id),
        checkImages: () => ipcRenderer.invoke('designs:checkImages'),
        uploadImage: (sourcePath, designId) => ipcRenderer.invoke('designs:uploadImage', sourcePath, designId),
    },
    deposits: {
        list: (bookingId) => ipcRenderer.invoke('deposits:list', bookingId),
        save: (deposit) => ipcRenderer.invoke('deposits:save', deposit),
        uploadImage: (sourcePath, bookingId) => ipcRenderer.invoke('deposits:uploadImage', sourcePath, bookingId),
    },
    alerts: {
        generate: () => ipcRenderer.invoke('alerts:generate'),
    },
    export: {
        confirmation: (bookingId, version) => ipcRenderer.invoke('export:confirmation', bookingId, version),
    },
    dialog: {
        openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
        openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    },
    fs: {
        fileExists: (filePath) => ipcRenderer.invoke('fs:fileExists', filePath),
        readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    },
    app: {
        getDbPath: () => ipcRenderer.invoke('app:getDbPath'),
        backupDb: () => ipcRenderer.invoke('app:backupDb'),
        restoreDb: () => ipcRenderer.invoke('app:restoreDb'),
    },
};
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
