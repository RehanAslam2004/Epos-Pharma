const { dbGet, dbAll } = require('../database');

function authMiddleware(req, res, next) {
    const token = req.headers['x-session-token'];
    if (!token) {
        return res.status(401).json({ error: 'No session token provided' });
    }
    const user = dbGet('SELECT id, username, full_name, role FROM users WHERE session_token = ?', [token]);
    if (!user) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Strict 15-Day Trial Enforcement Shield
    const trial = dbGet('SELECT * FROM trial_license LIMIT 1');
    if (trial && !trial.is_licensed) {
        const now = new Date();
        const end = new Date(trial.trial_end);
        const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

        if (daysRemaining <= 0) {
            // Allow only paths required for License Activation & Logout
            const path = req.originalUrl || req.url;
            const allowedUrls = ['/api/settings/trial', '/api/settings/license', '/api/auth/logout'];
            const isAllowed = allowedUrls.some(uri => path.includes(uri));

            if (!isAllowed) {
                return res.status(402).json({
                    error: 'Trial period has expired. Please activate your lifetime license to continue using EPOS Pharma.',
                    code: 'TRIAL_EXPIRED'
                });
            }
        }
    }

    req.user = user;
    next();
}

module.exports = { authMiddleware };
