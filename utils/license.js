const crypto = require('crypto');
const os = require('os');

// Unique secret to bind keys
const SECRET = 'EPOS_PHARMA_OFFLINE_SECRET_2026';

function getMachineId() {
    const cpus = os.cpus();
    const networkInterfaces = os.networkInterfaces();

    // Attempt to safely grab a MAC address
    let mac = 'UNKNOWN_MAC';
    for (const key in networkInterfaces) {
        const iface = networkInterfaces[key].find(i => !i.internal && i.mac && i.mac !== '00:00:00:00:00:00');
        if (iface) {
            mac = iface.mac;
            break;
        }
    }

    const raw = JSON.stringify({
        cpus: cpus[0]?.model,
        mac,
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch()
    });

    const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
    // Format: EPOS-XXXX-XXXX-XXXX-XXXX
    return `EPOS-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;
}

function generateLicenseKey(machineId) {
    // Generate the license key based on the machine ID + SECRET
    const hash = crypto.createHash('sha256').update(machineId + SECRET).digest('hex').toUpperCase();
    return `XJ29-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`;
}

function validateLicenseKey(machineId, licenseKey) {
    if (!licenseKey) return false;
    const expected = generateLicenseKey(machineId);
    return licenseKey === expected;
}

module.exports = { getMachineId, generateLicenseKey, validateLicenseKey };
