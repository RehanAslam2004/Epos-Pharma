const express = require('express');
const path = require('path');
const fs = require('fs');
const { dbRun, dbGet, dbAll, getDbPath, closeDatabase, saveDb } = require('../database');

const router = express.Router();

// GET /api/settings
router.get('/', (req, res) => {
    try {
        const settings = dbGet('SELECT * FROM settings LIMIT 1');
        res.json(settings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/settings/network
router.get('/network', (req, res) => {
    try {
        const os = require('os');
        const interfaces = os.networkInterfaces();
        let ip = '127.0.0.1';
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    ip = iface.address;
                    break;
                }
            }
        }
        res.json({ ip });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings
router.put('/', (req, res) => {
    try {
        const { pharmacy_name, phone, address, email, payment_methods, theme, currency, tax_rate, invoice_type, printer_interface, expense_categories, amount_for_one_point, loyalty_discount_per_point } = req.body;
        dbRun(
            `UPDATE settings SET pharmacy_name = ?, phone = ?, address = ?, email = ?, payment_methods = ?, theme = ?, currency = ?, tax_rate = ?, invoice_type = ?, printer_interface = ?, expense_categories = ?, amount_for_one_point = ?, loyalty_discount_per_point = ? WHERE id = 1`,
            [pharmacy_name || 'EPOS Pharma', phone || '', address || '', email || '',
            typeof payment_methods === 'string' ? payment_methods : JSON.stringify(payment_methods || []),
            theme || 'green', currency || 'PKR', tax_rate || 0, invoice_type || 'A6', printer_interface || '',
            typeof expense_categories === 'string' ? expense_categories : JSON.stringify(expense_categories || ["Rent", "Electricity", "Salaries", "Supplies", "Other"]),
            parseFloat(amount_for_one_point) || 0,
            parseFloat(loyalty_discount_per_point) || 0]
        );
        const settings = dbGet('SELECT * FROM settings LIMIT 1');
        res.json(settings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const { getMachineId, validateLicenseKey } = require('../../utils/license');

// GET /api/settings/trial
router.get('/trial', (req, res) => {
    try {
        const trial = dbGet('SELECT * FROM trial_license LIMIT 1');
        const machine_id = trial?.machine_id || getMachineId(); // Fallback if missing

        if (!trial) return res.json({ is_licensed: false, days_remaining: 0, machine_id });
        if (trial.is_licensed) return res.json({ is_licensed: true, license_key: trial.license_key, activation_date: trial.activation_date, machine_id });

        const now = new Date();
        const end = new Date(trial.trial_end);
        const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
        res.json({ is_licensed: false, trial_start: trial.trial_start, trial_end: trial.trial_end, days_remaining: daysRemaining, trial_expired: daysRemaining <= 0, machine_id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/settings/license
router.post('/license', (req, res) => {
    try {
        const { license_key } = req.body;
        if (!license_key) return res.status(400).json({ error: 'License key is required' });

        const trial = dbGet('SELECT * FROM trial_license LIMIT 1');
        if (!trial) return res.status(500).json({ error: 'System not initialized properly' });

        const isValid = validateLicenseKey(trial.machine_id, license_key);
        if (!isValid) return res.status(400).json({ error: 'Invalid license key for this machine' });

        dbRun(`UPDATE trial_license SET license_key = ?, activation_date = datetime('now'), is_licensed = 1 WHERE id = ?`, [license_key, trial.id]);
        res.json({ message: 'License activated successfully', is_licensed: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/settings/backup
router.post('/backup', (req, res) => {
    try {
        saveDb(); // Ensure DB is saved first
        const dbPath = getDbPath();
        let backupDir;
        try {
            const { app } = require('electron');
            backupDir = path.join(app.getPath('documents'), 'EPOS Pharma Backups');
        } catch { backupDir = path.join(__dirname, '..', '..', 'backups'); }

        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `backup_${timestamp}.sqlite`);
        fs.copyFileSync(dbPath, backupFile);

        const stats = fs.statSync(backupFile);
        dbRun('INSERT INTO backups (backup_file, size) VALUES (?, ?)', [backupFile, stats.size]);
        res.json({ message: 'Backup created successfully', file: backupFile, size: stats.size });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/settings/upload-backup
router.post('/upload-backup', (req, res) => {
    try {
        const { fileName, data } = req.body;
        if (!data) return res.status(400).json({ error: 'No data provided' });

        let backupDir;
        try {
            const { app } = require('electron');
            backupDir = path.join(app.getPath('documents'), 'EPOS Pharma Backups');
        } catch { backupDir = path.join(__dirname, '..', '..', 'backups'); }

        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeFileName = fileName ? fileName.replace(/[^a-z0-9.]/gi, '_') : `uploaded_${timestamp}.sqlite`;
        const backupFile = path.join(backupDir, safeFileName);
        
        // Decode base64 and write to file
        const buffer = Buffer.from(data, 'base64');
        fs.writeFileSync(backupFile, buffer);

        const stats = fs.statSync(backupFile);
        dbRun('INSERT INTO backups (backup_file, size) VALUES (?, ?)', [backupFile, stats.size]);
        
        res.json({ message: 'Backup uploaded successfully', file: backupFile, size: stats.size });
    } catch (err) { 
        console.error('Upload backup error:', err);
        res.status(500).json({ error: err.message }); 
    }
});

// POST /api/settings/restore
router.post('/restore', (req, res) => {
    try {
        const { backup_file } = req.body;
        if (!backup_file || !fs.existsSync(backup_file)) return res.status(400).json({ error: 'Backup file not found' });
        const dbPath = getDbPath();
        closeDatabase();
        fs.copyFileSync(backup_file, dbPath);
        res.json({ message: 'Database restored successfully. Please restart the application.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/settings/backups
router.get('/backups', (req, res) => {
    try {
        const backups = dbAll('SELECT * FROM backups ORDER BY date DESC');
        res.json(backups);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
