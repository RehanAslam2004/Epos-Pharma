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
        const { name, phone, email, address, company, ntn, balance, notes } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        const result = dbRun(
            'INSERT INTO suppliers (name, phone, email, address, company, ntn, balance, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, phone || '', email || '', address || '', company || '', ntn || '', parseFloat(balance) || 0, notes || '']
        );
        const supplier = dbGet('SELECT * FROM suppliers WHERE id = ?', [result.lastInsertRowid]);
        res.json(supplier);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/suppliers/:id
router.put('/:id', (req, res) => {
    try {
        const { name, phone, email, address, company, ntn, balance, notes } = req.body;
        dbRun(
            'UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, company = ?, ntn = ?, balance = ?, notes = ? WHERE id = ?',
            [name, phone || '', email || '', address || '', company || '', ntn || '', parseFloat(balance) || 0, notes || '', parseInt(req.params.id)]
        );
        const supplier = dbGet('SELECT * FROM suppliers WHERE id = ?', [parseInt(req.params.id)]);
        res.json(supplier);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/suppliers/:id
router.delete('/:id', (req, res) => {
    try {
        // Only allow deletion if there are no purchase invoices attached to this supplier
        const hasPurchases = dbGet('SELECT id FROM purchases WHERE supplier_id = ? LIMIT 1', [parseInt(req.params.id)]);
        if (hasPurchases) {
            return res.status(400).json({ error: 'Cannot delete supplier: There are purchase invoices linked to this supplier.' });
        }

        dbRun('UPDATE products SET supplier_id = NULL WHERE supplier_id = ?', [parseInt(req.params.id)]);
        dbRun('DELETE FROM supplier_payments WHERE supplier_id = ?', [parseInt(req.params.id)]); // Clean up payments
        dbRun('DELETE FROM suppliers WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ message: 'Supplier deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/suppliers/:id/ledger
// Returns a combined, sorted chronological history of Purchases and Payments
router.get('/:id/ledger', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const supplier = dbGet('SELECT * FROM suppliers WHERE id = ?', [id]);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

        const purchases = dbAll(`SELECT id, invoice_number as reference, total_amount as debit, paid_amount as credit, date, 'purchase' as type FROM purchases WHERE supplier_id = ?`, [id]);
        const payments = dbAll(`SELECT id, reference, 0 as debit, amount as credit, date, 'payment' as type FROM supplier_payments WHERE supplier_id = ?`, [id]);

        // Combine and sort by date ascending
        const ledger = [...purchases, ...payments].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate running balance
        let currentBalance = 0;
        const ledgerWithBalance = ledger.map(entry => {
            currentBalance += entry.debit - entry.credit;
            return { ...entry, running_balance: currentBalance };
        });

        res.json({ supplier, ledger: ledgerWithBalance.reverse() /* Send newest first for UI */ });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/suppliers/:id/payment
// Record a manual payment to settle outstanding balance
router.post('/:id/payment', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { amount, method, reference, date } = req.body;
        const paymentAmount = parseFloat(amount);

        if (!paymentAmount || paymentAmount <= 0) return res.status(400).json({ error: 'Valid payment amount required' });

        dbRun('BEGIN TRANSACTION');

        const insert = dbRun(`
            INSERT INTO supplier_payments (supplier_id, amount, method, reference, date) 
            VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')))
        `, [id, paymentAmount, method || 'cash', reference || 'Manual Payment', date], true);

        // FIFO Payment Allocation
        let remainingPayment = paymentAmount;

        // Fetch unpaid purchases ordered by date ASC (FIFO)
        const unpaidPurchases = dbAll(`
            SELECT id, total_amount, paid_amount 
            FROM purchases 
            WHERE supplier_id = ? AND status != 'paid' 
            ORDER BY date ASC, id ASC
        `, [id]);

        for (const purchase of unpaidPurchases) {
            if (remainingPayment <= 0) break;

            const amountNeeded = purchase.total_amount - purchase.paid_amount;
            if (amountNeeded <= 0) continue;

            const amountToApply = Math.min(amountNeeded, remainingPayment);

            if (amountToApply > 0) {
                const newPaidAmount = purchase.paid_amount + amountToApply;
                const newStatus = newPaidAmount >= purchase.total_amount ? 'paid' : 'partially_paid';

                dbRun(`
                    UPDATE purchases 
                    SET paid_amount = ?, status = ? 
                    WHERE id = ?
                `, [newPaidAmount, newStatus, purchase.id], true);

                remainingPayment -= amountToApply;
            }
        }

        // Decrease the supplier's outstanding liability balance
        dbRun(`UPDATE suppliers SET balance = balance - ? WHERE id = ?`, [paymentAmount, id]);

        const { saveDb } = require('../database');
        saveDb();
        dbRun('COMMIT');

        const supplier = dbGet('SELECT * FROM suppliers WHERE id = ?', [id]);
        res.json({ success: true, payment_id: insert.lastInsertRowid, new_balance: supplier.balance });
    } catch (err) {
        dbRun('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
