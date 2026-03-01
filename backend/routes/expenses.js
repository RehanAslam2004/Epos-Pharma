const express = require('express');
const { dbRun, dbGet, dbAll } = require('../database');

const router = express.Router();

// GET /api/expenses (with optional filtering)
router.get('/', (req, res) => {
    try {
        const { from, to, category } = req.query;
        let query = `SELECT * FROM expenses WHERE 1=1`;
        const params = [];

        if (from) { query += ` AND date >= ?`; params.push(from); }
        if (to) { query += ` AND date <= ?`; params.push(to); }
        if (category) { query += ` AND category = ?`; params.push(category); }
        query += ` ORDER BY date DESC`;

        const expenses = dbAll(query, params);
        res.json(expenses);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/expenses/summary
router.get('/summary', (req, res) => {
    try {
        const thisMonth = dbGet(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')`);
        const today = dbGet(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date(date) = date('now')`);

        // Group by category for charts
        const byCategory = dbAll(`
            SELECT category, SUM(amount) as value 
            FROM expenses 
            WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
            GROUP BY category
            ORDER BY value DESC
        `);

        res.json({ thisMonth: thisMonth.total, today: today.total, byCategory });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/expenses
router.post('/', (req, res) => {
    try {
        const { date, category, amount, reference, notes } = req.body;
        if (!category || !amount) return res.status(400).json({ error: 'Category and Amount are required' });

        const result = dbRun(
            `INSERT INTO expenses (date, category, amount, reference, notes) VALUES (?, ?, ?, ?, ?)`,
            [date || new Date().toISOString(), category, amount, reference || '', notes || '']
        );
        const expense = dbGet('SELECT * FROM expenses WHERE id = ?', [result.lastInsertRowid]);
        res.json(expense);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/expenses/:id
router.delete('/:id', (req, res) => {
    try {
        dbRun('DELETE FROM expenses WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ message: 'Expense deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
