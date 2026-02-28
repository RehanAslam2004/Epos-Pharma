const fs = require('fs');
const path = require('path');

function createBackup(dbPath, backupDir) {
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_${timestamp}.sqlite`);
    fs.copyFileSync(dbPath, backupFile);
    return backupFile;
}

function restoreBackup(backupFile, dbPath) {
    if (!fs.existsSync(backupFile)) {
        throw new Error('Backup file not found');
    }
    fs.copyFileSync(backupFile, dbPath);
}

function listBackups(backupDir) {
    if (!fs.existsSync(backupDir)) return [];
    return fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.sqlite'))
        .map(f => {
            const fullPath = path.join(backupDir, f);
            const stats = fs.statSync(fullPath);
            return { file: fullPath, name: f, size: stats.size, date: stats.mtime };
        })
        .sort((a, b) => b.date - a.date);
}

module.exports = { createBackup, restoreBackup, listBackups };
