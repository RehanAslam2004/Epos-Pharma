const express = require('express');
const { dbRun, dbGet, dbAll } = require('../database');

const router = express.Router();

// GET /api/suppliers
router.get('/', (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT * FROM suppliers WHERE 1=1';
        const params = [];
        if (search) { query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR company LIKE ?)'; const s = `%${search}%`; params.push(s, s, s, s); }
        query += ' ORDER BY name ASC';
        res.json(dbAll(query, params));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/suppliers/:id
router.get('/:id', (req, res) => {
    try {
        const supplier = dbGet('SELECT * FROM suppliers WHERE id = ?', [parseInt(req.params.id)]);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        res.json(supplier);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/suppliers/:id/products
router.get('/:id/products', (req, res) => {
    try {
        res.json(dbAll('SELECT * FROM products WHERE supplier_id = ? ORDER BY name ASC', [parseInt(req.params.id)]));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/suppliers
router.post('/', (req, res) => {
    try {
        const { name, phone, email, address, company, notes } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        const result = dbRun('INSERT INTO suppliers (name, phone, email, address, company, notes) VALUES (?, ?, ?, ?, ?, ?)', [name, phone || '', email || '', address || '', company || '', notes || '']);
        const supplier = dbGet('SELECT * FROM suppliers WHERE id = ?', [result.lastInsertRowid]);
        res.json(supplier);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/suppliers/:id
router.put('/:id', (req, res) => {
    try {
        const { name, phone, email, address, company, notes } = req.body;
        dbRun('UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, company = ?, notes = ? WHERE id = ?', [name, phone || '', email || '', address || '', company || '', notes || '', parseInt(req.params.id)]);
        const supplier = dbGet('SELECT * FROM suppliers WHERE id = ?', [parseInt(req.params.id)]);
        res.json(supplier);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/suppliers/:id
router.delete('/:id', (req, res) => {
    try {
        dbRun('UPDATE products SET supplier_id = NULL WHERE supplier_id = ?', [parseInt(req.params.id)]);
        dbRun('DELETE FROM suppliers WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ message: 'Supplier deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
