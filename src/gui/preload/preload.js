const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Database operations
    database: {
        getThreads: () => ipcRenderer.invoke('db:get-threads'),
        getThread: (threadId) => ipcRenderer.invoke('db:get-thread', threadId),
        saveThread: (thread) => ipcRenderer.invoke('db:save-thread', thread),
        deleteThread: (threadId) => ipcRenderer.invoke('db:delete-thread', threadId)
    },

    // Application operations
    app: {
        getVersion: () => ipcRenderer.invoke('app:get-version'),
        getPath: (name) => ipcRenderer.invoke('app:get-path', name)
    },

    // Menu events
    onMenuAction: (callback) => {
        ipcRenderer.on('menu-new-thread', callback);
        ipcRenderer.on('menu-preferences', callback);
        ipcRenderer.on('menu-help', callback);
        ipcRenderer.on('import-threads', callback);
    },

    // Remove listeners
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    },

    // Utility
    platform: process.platform,
    versions: process.versions
});

// Log that preload script has loaded
console.log('Preload script loaded successfully');
console.log('Electron version:', process.versions.electron);
console.log('Node version:', process.versions.node);
console.log('Chrome version:', process.versions.chrome);
