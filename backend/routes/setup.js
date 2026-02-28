const express = require('express');
const bcrypt = require('bcryptjs');
const { dbGet, dbRun, saveDb } = require('../database');
const { getMachineId, validateLicenseKey } = require('../../utils/license');

const router = express.Router();

// GET /api/setup/status
// Determines if the setup wizard needs to be shown
router.get('/status', (req, res) => {
    try {
        const userCount = dbGet('SELECT COUNT(*) as count FROM users');
        const needsSetup = userCount.count === 0;
        res.json({ needsSetup });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/setup/machine-id
// Returns the unique hardware-bound machine ID
router.get('/machine-id', (req, res) => {
    try {
        const machineId = getMachineId();
        res.json({ machineId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/setup/complete
// Finalizes the first-boot installation process
router.post('/complete', (req, res) => {
    try {
        const userCount = dbGet('SELECT COUNT(*) as count FROM users');
        if (userCount.count > 0) {
            return res.status(403).json({ error: 'Setup has already been completed.' });
        }

        const { pharmacyName, ownerName, phone, address, currUsername, currPassword, licenseKey } = req.body;

        if (!pharmacyName || !currUsername || !currPassword) {
            return res.status(400).json({ error: 'Pharmacy name, Admin username, and password are required.' });
        }

        // 1. Save Settings
        dbRun('INSERT INTO settings (pharmacy_name, phone, address) VALUES (?, ?, ?)',
            [pharmacyName, phone || '', address || '']);

        // 2. Create Admin Account
        const hash = bcrypt.hashSync(currPassword, 10);
        dbRun('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
            [currUsername, hash, ownerName || 'Administrator', 'admin']);

        // 3. Create Trial / License
        const machineId = getMachineId();
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

        let isLicensed = 0;
        let actDate = null;
        let storedLicenseKey = null;

        if (licenseKey && validateLicenseKey(machineId, licenseKey)) {
            isLicensed = 1;
            actDate = now.toISOString();
            storedLicenseKey = licenseKey;
        }

        dbRun('INSERT INTO trial_license (trial_start, trial_end, license_key, activation_date, machine_id, is_licensed) VALUES (?, ?, ?, ?, ?, ?)',
            [now.toISOString(), trialEnd.toISOString(), storedLicenseKey, actDate, machineId, isLicensed]);

        // Ensure database saves forcefully after setup
        saveDb();

        res.json({ success: true, message: 'Setup completed successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
