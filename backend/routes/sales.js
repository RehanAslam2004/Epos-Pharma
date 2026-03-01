const express = require('express');
const { dbRun, dbGet, dbAll, saveDb } = require('../database');

const router = express.Router();

router.post('/', (req, res) => {
    let transactionActive = false;
    try {
        const { customer_id, items, discount, tax, payment_method, payment_details, notes } = req.body;
        if (!items || items.length === 0) return res.status(400).json({ error: 'At least one item is required' });

        let subtotal = 0;
        for (const item of items) subtotal += item.price * item.quantity;
        const discountAmount = discount || 0;
        const taxAmount = tax || 0;
        const total = subtotal - discountAmount + taxAmount;

        const { dbExec, dbAll } = require('../database');

        dbExec('BEGIN TRANSACTION');
        transactionActive = true;

        // Create sale
        const saleResult = dbRun(
            `INSERT INTO sales (customer_id, subtotal, discount, tax, total, payment_method, payment_details, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [customer_id || null, subtotal, discountAmount, taxAmount, total, payment_method || 'cash', payment_details || '', notes || ''],
            true // skipSave
        );
        const saleId = saleResult.lastInsertRowid;

        // Process each item using FEFO (First-Expire-First-Out) logic
        for (const item of items) {
            let remainingToDeduct = item.quantity;

            // 1. Log the generic sale_item
            const saleItemResult = dbRun(
                `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)`,
                [saleId, item.product_id, item.product_name, item.quantity, item.price, item.price * item.quantity],
                true // skipSave
            );
            const saleItemId = saleItemResult.lastInsertRowid;

            // 2. Fetch all raw batches that have stock, prioritizing ones that expire soonest (FEFO), fallback to oldest ID (FIFO)
            const availableBatches = dbAll(
                `SELECT id, remaining_quantity FROM purchase_items WHERE product_id = ? AND remaining_quantity > 0 ORDER BY CASE WHEN expiry IS NULL THEN 1 ELSE 0 END, expiry ASC, id ASC`,
                [item.product_id]
            );

            // 3. Sequentially drain matching batches
            for (const batch of availableBatches) {
                if (remainingToDeduct <= 0) break;

                const deductFromBatch = Math.min(remainingToDeduct, batch.remaining_quantity);

                // Update the batch's personal remaining quantity
                dbRun(`UPDATE purchase_items SET remaining_quantity = remaining_quantity - ? WHERE id = ?`, [deductFromBatch, batch.id], true);

                // Record the hard-link so we know exactly which wholesale item was sold for precise PnL later
                dbRun(`INSERT INTO sale_item_batches (sale_item_id, purchase_item_id, quantity) VALUES (?, ?, ?)`, [saleItemId, batch.id, deductFromBatch], true);

                remainingToDeduct -= deductFromBatch;
            }

            // 4. Update the global aggregated products.stock ledger
            const stockResult = dbRun('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?', [item.quantity, item.product_id, item.quantity], true);
            if (stockResult.changes === 0) {
                // If the global stock blocked it
                try { dbExec('ROLLBACK'); } catch (rbErr) { } // ignore rollback errors
                transactionActive = false;
                return res.status(400).json({ error: `Insufficient stock for product: ${item.product_name}` });
            }
        }

        dbExec('COMMIT');
        transactionActive = false;
        saveDb();

        const sale = dbGet(`SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ?`, [saleId]);
        const saleItems = dbAll('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);
        res.json({ ...sale, items: saleItems });
    } catch (err) {
        if (transactionActive) {
            try {
                const { dbExec } = require('../database');
                dbExec('ROLLBACK');
            } catch (rbErr) { }
        }
        res.status(500).json({ error: err.message });
    }
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
