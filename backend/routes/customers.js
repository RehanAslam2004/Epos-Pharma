const express = require('express');
const { dbRun, dbGet, dbAll } = require('../database');

const router = express.Router();

// GET /api/customers
router.get('/', (req, res) => {
    try {
        const { search, type } = req.query;
        let query = 'SELECT * FROM customers WHERE 1=1';
        const params = [];
        if (search) { query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }
        if (type) { query += ' AND type = ?'; params.push(type); }
        query += ' ORDER BY name ASC';
        res.json(dbAll(query, params));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/customers/stats
router.get('/stats', (req, res) => {
    try {
        const total = dbGet('SELECT COUNT(*) as count FROM customers');
        const newThisMonth = dbGet("SELECT COUNT(*) as count FROM customers WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')");
        const topCustomers = dbAll(`SELECT c.id, c.name, c.phone, c.type, COALESCE(SUM(s.total), 0) as total_spent, COUNT(s.id) as purchase_count FROM customers c LEFT JOIN sales s ON c.id = s.customer_id GROUP BY c.id ORDER BY total_spent DESC LIMIT 5`);
        res.json({ total: total.count, newThisMonth: newThisMonth.count, topCustomers });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/customers/:id
router.get('/:id', (req, res) => {
    try {
        const customer = dbGet('SELECT * FROM customers WHERE id = ?', [parseInt(req.params.id)]);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        res.json(customer);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/customers/:id/purchases
router.get('/:id/purchases', (req, res) => {
    try {
        const purchases = dbAll(`SELECT s.*, GROUP_CONCAT(si.product_name, ', ') as products FROM sales s LEFT JOIN sale_items si ON s.id = si.sale_id WHERE s.customer_id = ? GROUP BY s.id ORDER BY s.date DESC`, [parseInt(req.params.id)]);
        res.json(purchases);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/customers
router.post('/', (req, res) => {
    try {
        const { name, phone, email, address, type, notes } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        const result = dbRun('INSERT INTO customers (name, phone, email, address, type, notes) VALUES (?, ?, ?, ?, ?, ?)', [name, phone || '', email || '', address || '', type || 'walk-in', notes || '']);
        const customer = dbGet('SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid]);
        res.json(customer);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/customers/:id
router.put('/:id', (req, res) => {
    try {
        const { name, phone, email, address, type, notes } = req.body;
        dbRun('UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, type = ?, notes = ? WHERE id = ?', [name, phone || '', email || '', address || '', type || 'walk-in', notes || '', parseInt(req.params.id)]);
        const customer = dbGet('SELECT * FROM customers WHERE id = ?', [parseInt(req.params.id)]);
        res.json(customer);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/customers/:id
router.delete('/:id', (req, res) => {
    try {
        dbRun('DELETE FROM customers WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ message: 'Customer deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
