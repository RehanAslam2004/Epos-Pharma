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
    req.user = user;
    next();
}

module.exports = { authMiddleware };
