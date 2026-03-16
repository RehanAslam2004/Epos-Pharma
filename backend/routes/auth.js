const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, dbAll } = require('../database');
const { authMiddleware, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

        const user = dbGet('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) return res.status(401).json({ error: 'Invalid username or password' });

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

        const sessionToken = uuidv4();
        dbRun('UPDATE users SET session_token = ?, last_login = datetime("now") WHERE id = ?', [sessionToken, user.id]);

        res.json({
            token: sessionToken,
            user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    try {
        const token = req.headers['x-session-token'];
        if (token) dbRun('UPDATE users SET session_token = NULL WHERE session_token = ?', [token]);
        res.json({ message: 'Logged out successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/auth/session
router.get('/session', (req, res) => {
    try {
        const token = req.headers['x-session-token'];
        if (!token) return res.status(401).json({ error: 'No session token' });
        const user = dbGet('SELECT id, username, full_name, role FROM users WHERE session_token = ?', [token]);
        if (!user) return res.status(401).json({ error: 'Invalid session' });
        res.json({ user });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// User Management - All require authentication
router.use('/users', authMiddleware);

// GET /api/auth/users
router.get('/users', requireAdmin, (req, res) => {
    try {
        const users = dbAll('SELECT id, username, full_name, role, last_login, created_at FROM users ORDER BY created_at DESC');
        res.json(users);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/users
router.post('/users', requireAdmin, (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
        const exists = dbGet('SELECT id FROM users WHERE username = ?', [username]);
        if (exists) return res.status(409).json({ error: 'Username already exists' });
        const hash = bcrypt.hashSync(password, 10);
        const result = dbRun('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)', [username, hash, full_name || '', role || 'staff']);
        res.json({ id: result.lastInsertRowid, username, full_name, role: role || 'staff' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/auth/users/:id
router.put('/users/:id', requireAdmin, (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;
        if (password) {
            const hash = bcrypt.hashSync(password, 10);
            dbRun('UPDATE users SET username = ?, password_hash = ?, full_name = ?, role = ? WHERE id = ?', [username, hash, full_name || '', role || 'staff', parseInt(req.params.id)]);
        } else {
            dbRun('UPDATE users SET username = ?, full_name = ?, role = ? WHERE id = ?', [username, full_name || '', role || 'staff', parseInt(req.params.id)]);
        }
        res.json({ message: 'User updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', requireAdmin, (req, res) => {
    try {
        const user = dbGet('SELECT role FROM users WHERE id = ?', [parseInt(req.params.id)]);
        if (user && user.role === 'admin') {
            const adminCount = dbGet('SELECT COUNT(*) as c FROM users WHERE role = ?', ['admin']);
            if (adminCount.c <= 1) return res.status(400).json({ error: 'Cannot delete the last admin user' });
        }
        dbRun('DELETE FROM users WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ message: 'User deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
