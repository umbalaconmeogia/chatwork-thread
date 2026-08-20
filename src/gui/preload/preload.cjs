const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    database: {
        getThreads: () => ipcRenderer.invoke('db:get-threads'),
        getThread: (threadId) => ipcRenderer.invoke('db:get-thread', threadId),
        saveThread: (thread) => ipcRenderer.invoke('db:save-thread', thread),
        deleteThread: (threadId) => ipcRenderer.invoke('db:delete-thread', threadId),
    },

    app: {
        getVersion: () => ipcRenderer.invoke('app:get-version'),
        getPath: (name) => ipcRenderer.invoke('app:get-path', name),
        getCliDbInfo: () => ipcRenderer.invoke('app:get-cli-db-info'),
    },

    onMenuAction: (callback) => {
        ipcRenderer.on('menu-new-thread', callback);
        ipcRenderer.on('menu-preferences', callback);
        ipcRenderer.on('menu-help', callback);
        ipcRenderer.on('import-threads', callback);
    },

    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    },

    platform: process.platform,
    versions: process.versions,
});

console.log('Preload (CJS) loaded; electronAPI exposed');
