const fs = require('fs');
const path = require('path');
const { getDbPath, saveDb, dbRun, dbAll } = require('./database');

function getBackupDir() {
    let backupDir;
    try {
        const { app } = require('electron');
        backupDir = path.join(app.getPath('documents'), 'EPOS Pharma Backups');
    } catch {
        backupDir = path.join(__dirname, '..', 'backups');
    }
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
}

function performBackup() {
    try {
        console.log('Starting automated backup...');
        saveDb(); // flush memory to disk
        const dbPath = getDbPath();
        const backupDir = getBackupDir();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `backup_${timestamp}.sqlite`);
        fs.copyFileSync(dbPath, backupFile);

        const stats = fs.statSync(backupFile);
        dbRun('INSERT INTO backups (backup_file, size) VALUES (?, ?)', [backupFile, stats.size]);
        console.log(`Backup completed successfully: ${backupFile}`);

        // Cleanup old backups (keep last 7 days)
        cleanupOldBackups(backupDir);
    } catch (err) {
        console.error('Automated backup failed:', err);
    }
}

function cleanupOldBackups(backupDir) {
    try {
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const files = fs.readdirSync(backupDir);

        for (const file of files) {
            if (!file.endsWith('.sqlite')) continue;

            const filePath = path.join(backupDir, file);
            const stats = fs.statSync(filePath);

            if (stats.mtimeMs < sevenDaysAgo) {
                fs.unlinkSync(filePath);
                try {
                    dbRun('DELETE FROM backups WHERE backup_file = ?', [filePath]);
                } catch (e) { }
                console.log(`Deleted old backup: ${filePath}`);
            }
        }
    } catch (err) {
        console.error('Failed to cleanup old backups:', err);
    }
}

function startAutomatedBackups() {
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // Calculate time until next midnight
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const timeUntilMidnight = nextMidnight.getTime() - now.getTime();

    console.log(`Automated backup scheduled in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes.`);

    // Wait until midnight, then start daily interval
    setTimeout(() => {
        performBackup();
        setInterval(performBackup, ONE_DAY);
    }, timeUntilMidnight);

    // Also do an initial backup right now if there hasn't been one today
    try {
        const result = dbAll('SELECT date FROM backups ORDER BY date DESC LIMIT 1');
        const lastBackup = result ? result[0] : null;

        if (!lastBackup || (now.getTime() - new Date(lastBackup.date).getTime()) > ONE_DAY) {
            console.log('No recent backup found, performing initial backup...');
            performBackup();
        }
    } catch (e) {
        console.log('Could not perform initial backup check', e.message);
    }
}

module.exports = {
    performBackup,
    startAutomatedBackups,
    getBackupDir
};
