const { autoUpdater } = require('electron-updater');

function setupAutoUpdater(mainWindow) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info) => {
        mainWindow.webContents.send('update-available', info);
    });

    autoUpdater.on('update-downloaded', (info) => {
        mainWindow.webContents.send('update-downloaded', info);
    });

    autoUpdater.on('error', (err) => {
        console.error('Auto-updater error:', err);
    });

    // Check for updates
    autoUpdater.checkForUpdates().catch((err) => {
        console.log('Update check failed (offline?):', err.message);
    });
}

module.exports = { setupAutoUpdater };
