const express = require('express');
const { dbGet, dbRun, dbAll } = require('../database');

const router = express.Router();

// GET /api/purchases
// Returns all purchases with supplier info
router.get('/', (req, res) => {
    try {
        const purchases = dbAll(`
            SELECT p.*, s.name as supplier_name, s.company as supplier_company 
            FROM purchases p 
            LEFT JOIN suppliers s ON p.supplier_id = s.id 
            ORDER BY p.date DESC
        `);
        res.json({ purchases });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/purchases/:id
// Returns a single purchase and its line items
router.get('/:id', (req, res) => {
    try {
        const purchase = dbGet(`
            SELECT p.*, s.name as supplier_name, s.company as supplier_company, s.phone as supplier_phone, s.address as supplier_address, s.ntn as supplier_ntn 
            FROM purchases p 
            LEFT JOIN suppliers s ON p.supplier_id = s.id 
            WHERE p.id = ?
        `, [req.params.id]);

        if (!purchase) return res.status(404).json({ error: 'Purchase invoice not found' });

        const items = dbAll(`
            SELECT pi.*, prod.name as product_name, prod.barcode 
            FROM purchase_items pi 
            JOIN products prod ON pi.product_id = prod.id 
            WHERE pi.purchase_id = ?
        `, [req.params.id]);

        res.json({ purchase, items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/purchases
// CRITICAL TRANSACTION: Create invoice, log items, update inventory, update supplier balance
router.post('/', (req, res) => {
    const { supplier_id, invoice_number, total_amount, paid_amount, status, payment_method, date, items } = req.body;

    if (!supplier_id || !items || items.length === 0) {
        return res.status(400).json({ error: 'Supplier and at least one item are required' });
    }

    try {
        // Enforce Transaction for exact data integrity
        dbRun('BEGIN TRANSACTION');

        // 1. Insert Purchase Record
        const insertPurchase = dbRun(`
            INSERT INTO purchases (invoice_number, supplier_id, total_amount, paid_amount, status, payment_method, date) 
            VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
        `, [invoice_number || `INV-${Date.now()}`, supplier_id, total_amount, paid_amount, status || 'unpaid', payment_method || 'credit', date], true);

        const purchaseId = insertPurchase.lastInsertRowid;

        // 2. Insert Items & Update Inventory
        for (const item of items) {
            // Log line item
            dbRun(`
                INSERT INTO purchase_items (purchase_id, product_id, quantity, purchase_price, batch, expiry) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [purchaseId, item.product_id, item.quantity, item.purchase_price, item.batch || '', item.expiry], true);

            // Auto-receive inventory stock & update the vendor price
            dbRun(`
                UPDATE products 
                SET stock = stock + ?, purchase_price = ? 
                WHERE id = ?
            `, [item.quantity, item.purchase_price, item.product_id], true);
        }

        // 3. Update Supplier Ledger
        // Balance increases by the unpaid amount (Total - Paid).
        // If they paid in full, liability doesn't increase.
        const liabilityIncrease = total_amount - paid_amount;
        if (liabilityIncrease !== 0) {
            dbRun(`
                UPDATE suppliers 
                SET balance = balance + ? 
                WHERE id = ?
            `, [liabilityIncrease, supplier_id], true);
        }

        // 4. Log initial payment into ledger if cash was handed over
        if (paid_amount > 0) {
            dbRun(`
                INSERT INTO supplier_payments (supplier_id, amount, method, reference, date) 
                VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')))
            `, [supplier_id, paid_amount, payment_method, `Initial payment for ${invoice_number || `INV-${Date.now()}`}`, date], true);
        }

        const { dbExec, saveDb } = require('../database');
        dbExec('COMMIT');
        saveDb(); // Physically write the final committed file once

        res.status(201).json({ success: true, purchase_id: purchaseId });
    } catch (err) {
        try { dbRun('ROLLBACK'); } catch (rbErr) { } // ignore rollback errors
        console.error("Purchase Transaction Failed:", err);
        // Special warning for UNIQUE constraint on invoice_number
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Invoice number already exists in the system.' });
        }
        res.status(500).json({ error: 'Failed to save purchase invoice. Entire transaction rolled back.' });
    }
});

module.exports = router;
