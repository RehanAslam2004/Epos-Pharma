const crypto = require('crypto');
const os = require('os');

function getMachineId() {
    const cpus = os.cpus();
    const networkInterfaces = os.networkInterfaces();
    const raw = JSON.stringify({ cpus: cpus[0]?.model, hostname: os.hostname(), platform: os.platform(), arch: os.arch() });
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16).toUpperCase();
}

function generateLicenseKey(machineId) {
    const hash = crypto.createHash('md5').update(`EPOS-${machineId}-PHARMA`).digest('hex').toUpperCase();
    return `EPOS-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`;
}

function validateLicenseKey(licenseKey) {
    const pattern = /^EPOS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return pattern.test(licenseKey);
}

module.exports = { getMachineId, generateLicenseKey, validateLicenseKey };
