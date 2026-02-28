const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { startServer } = require('./backend/server');

let mainWindow;
let splashWindow;
let serverInstance;
let canCloseApp = true;

const isDev = !app.isPackaged;

// Helper to handle close request
ipcMain.on('set-can-close', (event, canClose) => {
    canCloseApp = canClose;
});

async function createWindow() {
    // Show splash screen immediately
    splashWindow = new BrowserWindow({
        width: 400,
        height: 350,
        transparent: false,
        frame: false,
        alwaysOnTop: true,
        icon: path.join(__dirname, 'assets', 'icon.png'),
    });
    splashWindow.loadFile(path.join(__dirname, 'splash.html'));

    // Start the Express backend
    try {
        serverInstance = await startServer();
    } catch (e) {
        console.error("Backend Server failed to start:", e);
    }

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
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }
        mainWindow.show();
    });

    mainWindow.on('close', (e) => {
        if (!canCloseApp) {
            e.preventDefault();
            const { dialog } = require('electron');
            const choice = dialog.showMessageBoxSync(mainWindow, {
                type: 'warning',
                buttons: ['Yes, Close', 'Cancel'],
                title: 'Confirm Exit',
                message: 'You have an active sale in progress. Are you sure you want to exit and lose this sale?'
            });
            if (choice === 0) {
                // User chose to close anyway
                canCloseApp = true;
                mainWindow.close();
            }
        }
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
