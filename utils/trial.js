function getTrialInfo(db) {
    const trial = db.prepare('SELECT * FROM trial_license LIMIT 1').get();
    if (!trial) return { isLicensed: false, daysRemaining: 0, trialExpired: true };

    if (trial.is_licensed) {
        return { isLicensed: true, licenseKey: trial.license_key, activationDate: trial.activation_date };
    }

    const now = new Date();
    const end = new Date(trial.trial_end);
    const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

    return {
        isLicensed: false,
        trialStart: trial.trial_start,
        trialEnd: trial.trial_end,
        daysRemaining,
        trialExpired: daysRemaining <= 0,
    };
}

module.exports = { getTrialInfo };
