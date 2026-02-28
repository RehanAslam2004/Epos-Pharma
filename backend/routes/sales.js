const express = require('express');
const { dbRun, dbGet, dbAll, saveDb } = require('../database');

const router = express.Router();

// POST /api/sales
router.post('/', (req, res) => {
    try {
        const { customer_id, items, discount, tax, payment_method, payment_details, notes } = req.body;
        if (!items || items.length === 0) return res.status(400).json({ error: 'At least one item is required' });

        let subtotal = 0;
        for (const item of items) subtotal += item.price * item.quantity;
        const discountAmount = discount || 0;
        const taxAmount = tax || 0;
        const total = subtotal - discountAmount + taxAmount;

        // Create sale
        const saleResult = dbRun(
            `INSERT INTO sales (customer_id, subtotal, discount, tax, total, payment_method, payment_details, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [customer_id || null, subtotal, discountAmount, taxAmount, total, payment_method || 'cash', payment_details || '', notes || '']
        );
        const saleId = saleResult.lastInsertRowid;

        // Insert items and update stock
        for (const item of items) {
            dbRun(
                `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)`,
                [saleId, item.product_id, item.product_name, item.quantity, item.price, item.price * item.quantity]
            );
            const stockResult = dbRun('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?', [item.quantity, item.product_id, item.quantity]);
            if (stockResult.changes === 0) {
                return res.status(400).json({ error: `Insufficient stock for product: ${item.product_name}` });
            }
        }

        saveDb();

        const sale = dbGet(`SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ?`, [saleId]);
        const saleItems = dbAll('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);
        res.json({ ...sale, items: saleItems });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/sales
router.get('/', (req, res) => {
    try {
        const { from, to, payment_method, customer_id } = req.query;
        let query = `SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE 1=1`;
        const params = [];

        if (from) { query += ` AND s.date >= ?`; params.push(from); }
        if (to) { query += ` AND s.date <= ?`; params.push(to); }
        if (payment_method) { query += ` AND s.payment_method = ?`; params.push(payment_method); }
        if (customer_id) { query += ` AND s.customer_id = ?`; params.push(parseInt(customer_id)); }
        query += ` ORDER BY s.date DESC`;

        const sales = dbAll(query, params);
        res.json(sales);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/sales/today
router.get('/today', (req, res) => {
    try {
        const today = dbGet(`SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM sales WHERE date(date) = date('now')`);
        res.json(today);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/sales/monthly
router.get('/monthly', (req, res) => {
    try {
        const monthly = dbGet(`SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM sales WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')`);
        res.json(monthly);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/sales/:id
router.get('/:id', (req, res) => {
    try {
        const sale = dbGet(`SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ?`, [parseInt(req.params.id)]);
        if (!sale) return res.status(404).json({ error: 'Sale not found' });
        const items = dbAll('SELECT * FROM sale_items WHERE sale_id = ?', [parseInt(req.params.id)]);
        res.json({ ...sale, items });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
