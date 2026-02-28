const { contextBridge, ipcRenderer } = require('electron');

// Expose a secure API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    getDbPath: () => ipcRenderer.invoke('get-db-path'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
    installUpdate: () => ipcRenderer.send('install-update'),
});
