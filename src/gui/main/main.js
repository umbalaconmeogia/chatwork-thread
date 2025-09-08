const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

class ChatworkThreadApp {
    constructor() {
        this.mainWindow = null;
        this.store = null;
        this.isDevelopment = process.env.NODE_ENV === 'development';
    }

    async init() {
        console.log('Initializing Chatwork Thread Tool...');
        
        // Initialize storage
        this.initStorage();
        
        // Create main window
        this.createMainWindow();
        
        // Setup application menu
        this.createMenu();
        
        // Setup IPC handlers
        this.setupIPC();
        
        console.log('Application initialized successfully');
    }

    initStorage() {
        try {
            this.store = new Store({
                name: 'chatwork-threads',
                defaults: {
                    threads: [],
                    settings: {
                        apiToken: '',
                        theme: 'light',
                        autoSave: true
                    }
                }
            });
            
            console.log('Storage initialized successfully');
            console.log('Storage path:', this.store.path);
        } catch (error) {
            console.error('Failed to initialize storage:', error);
            dialog.showErrorBox('Storage Error', 'Failed to initialize storage: ' + error.message);
        }
    }

    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1000,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, '../preload/preload.js')
            },
            icon: path.join(__dirname, '../renderer/assets/icon.png'),
            show: false, // Don't show until ready
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
        });

        // Load the renderer
        this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
        
        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            
            if (this.isDevelopment) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // Optimize for development
        if (this.isDevelopment) {
            this.mainWindow.webContents.on('did-frame-finish-load', () => {
                this.mainWindow.webContents.once('devtools-opened', () => {
                    this.mainWindow.focus();
                    setImmediate(() => {
                        this.mainWindow.focus();
                    });
                });
            });
        }
    }

    createMenu() {
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'New Thread',
                        accelerator: 'CmdOrCtrl+N',
                        click: () => this.mainWindow?.webContents.send('menu-new-thread')
                    },
                    { type: 'separator' },
                    {
                        label: 'Import Threads',
                        accelerator: 'CmdOrCtrl+I',
                        click: () => this.importThreads()
                    },
                    {
                        label: 'Export Threads',
                        accelerator: 'CmdOrCtrl+E',
                        click: () => this.exportThreads()
                    },
                    { type: 'separator' },
                    {
                        label: 'Preferences',
                        accelerator: 'CmdOrCtrl+,',
                        click: () => this.mainWindow?.webContents.send('menu-preferences')
                    },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectall' }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Window',
                submenu: [
                    { role: 'minimize' },
                    { role: 'close' }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About',
                        click: () => this.showAbout()
                    },
                    {
                        label: 'Documentation',
                        click: () => this.mainWindow?.webContents.send('menu-help')
                    }
                ]
            }
        ];

        // macOS specific menu adjustments
        if (process.platform === 'darwin') {
            template.unshift({
                label: app.getName(),
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideothers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            });
        }

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    setupIPC() {
        // Storage operations
        ipcMain.handle('db:get-threads', async () => {
            try {
                const threads = this.store.get('threads', []);
                // Add message count and format for display
                const threadsWithMeta = threads.map(thread => ({
                    id: thread.id,
                    name: thread.name,
                    created_at: thread.created_at,
                    updated_at: thread.updated_at,
                    message_count: thread.data?.messages?.length || 0
                }));
                return { success: true, data: threadsWithMeta };
            } catch (error) {
                console.error('Error getting threads:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db:get-thread', async (event, threadId) => {
            try {
                const threads = this.store.get('threads', []);
                const thread = threads.find(t => t.id === threadId);
                return { success: true, data: thread };
            } catch (error) {
                console.error('Error getting thread:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db:save-thread', async (event, thread) => {
            try {
                const threads = this.store.get('threads', []);
                const existingIndex = threads.findIndex(t => t.id === thread.id);
                
                // Add timestamp
                thread.updated_at = new Date().toISOString();
                if (!thread.created_at) {
                    thread.created_at = thread.updated_at;
                }
                
                if (existingIndex >= 0) {
                    threads[existingIndex] = thread;
                } else {
                    threads.push(thread);
                }
                
                this.store.set('threads', threads);
                return { success: true };
            } catch (error) {
                console.error('Error saving thread:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db:delete-thread', async (event, threadId) => {
            try {
                const threads = this.store.get('threads', []);
                const filteredThreads = threads.filter(t => t.id !== threadId);
                const deleted = threads.length !== filteredThreads.length;
                
                this.store.set('threads', filteredThreads);
                return { success: true, deleted };
            } catch (error) {
                console.error('Error deleting thread:', error);
                return { success: false, error: error.message };
            }
        });

        // Application operations
        ipcMain.handle('app:get-version', () => {
            return app.getVersion();
        });

        ipcMain.handle('app:get-path', (event, name) => {
            return app.getPath(name);
        });
    }

    async importThreads() {
        try {
            const result = await dialog.showOpenDialog(this.mainWindow, {
                title: 'Import Threads',
                properties: ['openFile'],
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const data = fs.readFileSync(filePath, 'utf8');
                const threads = JSON.parse(data);
                
                // Send to renderer for processing
                this.mainWindow.webContents.send('import-threads', threads);
            }
        } catch (error) {
            console.error('Import error:', error);
            dialog.showErrorBox('Import Error', 'Failed to import threads: ' + error.message);
        }
    }

    async exportThreads() {
        try {
            const threads = this.store.get('threads', []);

            const result = await dialog.showSaveDialog(this.mainWindow, {
                title: 'Export Threads',
                defaultPath: `chatwork-threads-${new Date().toISOString().slice(0, 10)}.json`,
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled) {
                fs.writeFileSync(result.filePath, JSON.stringify(threads, null, 2));
                dialog.showMessageBox(this.mainWindow, {
                    type: 'info',
                    title: 'Export Successful',
                    message: `Exported ${threads.length} threads to ${result.filePath}`
                });
            }
        } catch (error) {
            console.error('Export error:', error);
            dialog.showErrorBox('Export Error', 'Failed to export threads: ' + error.message);
        }
    }

    showAbout() {
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'About Chatwork Thread Tool',
            message: 'Chatwork Thread Tool',
            detail: `Version: ${app.getVersion()}\nA desktop application for managing Chatwork conversation threads.\n\nDeveloped with Electron and Node.js`
        });
    }
}

// App lifecycle
let threadApp;

app.whenReady().then(async () => {
    threadApp = new ChatworkThreadApp();
    await threadApp.init();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        if (threadApp) {
            threadApp.createMainWindow();
        }
    }
});

app.on('before-quit', () => {
    if (threadApp && threadApp.store) {
        // electron-store auto-saves, no need to manually close
        console.log('Application shutting down...');
    }
});
