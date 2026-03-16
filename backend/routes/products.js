const express = require('express');
const { dbRun, dbGet, dbAll } = require('../database');
const { requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// GET /api/products
router.get('/', (req, res) => {
    try {
        const { search, supplier_id, low_stock, expiring } = req.query;
        let query = `SELECT p.*, s.name as supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE 1=1`;
        const params = [];

        if (search) {
            query += ` AND (p.name LIKE ? OR p.generic_name LIKE ? OR p.brand LIKE ? OR p.batch LIKE ? OR p.barcode LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }
        if (supplier_id) { query += ` AND p.supplier_id = ?`; params.push(parseInt(supplier_id)); }
        if (low_stock === 'true') query += ` AND p.stock <= 10`;
        if (expiring === 'true') query += ` AND p.expiry IS NOT NULL AND p.expiry <= date('now', '+60 days')`;
        query += ` ORDER BY p.name ASC`;

        const products = dbAll(query, params);
        res.json(products);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/products/stats
router.get('/stats', (req, res) => {
    try {
        const total = dbGet('SELECT COUNT(*) as count FROM products');
        const lowStock = dbGet('SELECT COUNT(*) as count FROM products WHERE stock <= 10');
        const expiring = dbGet("SELECT COUNT(*) as count FROM products WHERE expiry IS NOT NULL AND expiry <= date('now', '+30 days')");
        const expired = dbGet("SELECT COUNT(*) as count FROM products WHERE expiry IS NOT NULL AND expiry < date('now')");
        const totalValue = dbGet('SELECT COALESCE(SUM(stock * selling_price), 0) as value FROM products');
        res.json({ total: total.count, lowStock: lowStock.count, expiring: expiring.count, expired: expired.count, totalValue: totalValue.value });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
    try {
        const product = dbGet('SELECT p.*, s.name as supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?', [parseInt(req.params.id)]);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/products
router.post('/', (req, res) => {
    try {
        const { name, brand, batch, expiry, purchase_price, selling_price, stock, barcode, supplier_id, category, description,
            generic_name, strength, form, pack_size, variant, unit, location, is_prescription_required, is_narcotic, tax_percentage, min_selling_price, allow_below_mrp } = req.body;
        if (!name) return res.status(400).json({ error: 'Product name is required' });

        let finalBarcode = barcode;
        if (!finalBarcode) {
            const timestamp = Date.now().toString().slice(-10);
            const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
            finalBarcode = `EP${timestamp}${random}`;
        }

        const barcodeExists = dbGet('SELECT id FROM products WHERE barcode = ?', [finalBarcode]);
        if (barcodeExists) return res.status(409).json({ error: 'Barcode already exists' });

        const result = dbRun(
            `INSERT INTO products (name, brand, batch, expiry, purchase_price, selling_price, stock, barcode, supplier_id, category, description,
                generic_name, strength, form, pack_size, variant, unit, location, is_prescription_required, is_narcotic, tax_percentage, min_selling_price, allow_below_mrp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, brand || '', batch || '', expiry || null, purchase_price || 0, selling_price || 0, stock || 0, finalBarcode, supplier_id || null, category || 'General', description || '',
                generic_name || '', strength || '', form || '', pack_size || '', variant || '', unit || '', location || '', is_prescription_required ? 1 : 0, is_narcotic ? 1 : 0, tax_percentage || 0, min_selling_price || 0, allow_below_mrp === false ? 0 : 1]
        );
        const product = dbGet('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);
        res.json(product);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/products/:id
router.put('/:id', (req, res) => {
    try {
        const { name, brand, batch, expiry, purchase_price, selling_price, stock, barcode, supplier_id, category, description,
            generic_name, strength, form, pack_size, variant, unit, location, is_prescription_required, is_narcotic, tax_percentage, min_selling_price, allow_below_mrp } = req.body;
        const id = parseInt(req.params.id);

        if (barcode) {
            const barcodeExists = dbGet('SELECT id FROM products WHERE barcode = ? AND id != ?', [barcode, id]);
            if (barcodeExists) return res.status(409).json({ error: 'Barcode already exists' });
        }

        dbRun(
            `UPDATE products SET name = ?, brand = ?, batch = ?, expiry = ?, purchase_price = ?, selling_price = ?, stock = ?, barcode = ?, supplier_id = ?, category = ?, description = ?, updated_at = datetime('now'),
             generic_name = ?, strength = ?, form = ?, pack_size = ?, variant = ?, unit = ?, location = ?, is_prescription_required = ?, is_narcotic = ?, tax_percentage = ?, min_selling_price = ?, allow_below_mrp = ?
             WHERE id = ?`,
            [name, brand || '', batch || '', expiry || null, purchase_price || 0, selling_price || 0, stock || 0, barcode, supplier_id || null, category || 'General', description || '',
                generic_name || '', strength || '', form || '', pack_size || '', variant || '', unit || '', location || '', is_prescription_required ? 1 : 0, is_narcotic ? 1 : 0, tax_percentage || 0, min_selling_price || 0, allow_below_mrp === false ? 0 : 1, id]
        );
        const product = dbGet('SELECT * FROM products WHERE id = ?', [id]);
        res.json(product);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/products/:id
router.delete('/:id', requireAdmin, (req, res) => {
    try {
        dbRun('DELETE FROM products WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ message: 'Product deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
