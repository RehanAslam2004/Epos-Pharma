const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { startServer } = require('./backend/server');

let mainWindow;
let serverInstance;

const isDev = !app.isPackaged;

async function createWindow() {
    // Start the Express backend
    serverInstance = await startServer();

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1100,
        minHeight: 700,
        title: 'EPOS Pharma',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        show: false,
        backgroundColor: '#f4f6f8',
    });

    // Remove default menu bar
    mainWindow.setMenuBarVisibility(false);

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        // Uncomment to open DevTools by default in dev
        // mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Auto-updater (only in production)
    if (!isDev) {
        try {
            const { setupAutoUpdater } = require('./utils/autoUpdater');
            setupAutoUpdater(mainWindow);
        } catch (e) {
            console.log('Auto-updater not available:', e.message);
        }
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (serverInstance) {
        serverInstance.close();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC handlers for backup path
ipcMain.handle('get-app-path', () => {
    return app.getPath('userData');
});

ipcMain.handle('get-db-path', () => {
    return path.join(app.getPath('userData'), 'database.sqlite');
});
