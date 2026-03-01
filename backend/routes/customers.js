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

// GET /api/customers/:id/ledger
// Returns a combined, sorted chronological history of Sales and Payments
router.get('/:id/ledger', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const customer = dbGet('SELECT * FROM customers WHERE id = ?', [id]);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const sales = dbAll(`SELECT id, 'Sale #' || id as reference, total as debit, paid_amount as credit, date, 'sale' as type FROM sales WHERE customer_id = ?`, [id]);
        const payments = dbAll(`SELECT id, reference, 0 as debit, amount as credit, date, 'payment' as type FROM customer_payments WHERE customer_id = ?`, [id]);

        // Combine and sort by date ascending
        const ledger = [...sales, ...payments].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate running balance
        let currentBalance = 0;
        const ledgerWithBalance = ledger.map(entry => {
            currentBalance += entry.debit - entry.credit;
            return { ...entry, running_balance: currentBalance };
        });

        res.json({ customer, ledger: ledgerWithBalance.reverse() /* Send newest first for UI */ });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/customers/:id/payment
// Record a manual payment to settle outstanding balance
router.post('/:id/payment', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { amount, method, reference, date } = req.body;
        const paymentAmount = parseFloat(amount);

        if (!paymentAmount || paymentAmount <= 0) return res.status(400).json({ error: 'Valid payment amount required' });

        dbRun('BEGIN TRANSACTION');

        const insert = dbRun(`
            INSERT INTO customer_payments (customer_id, amount, method, reference, date) 
            VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')))
        `, [id, paymentAmount, method || 'cash', reference || 'Manual Payment', date], true);

        // FIFO Payment Allocation
        let remainingPayment = paymentAmount;

        // Fetch unpaid sales ordered by date ASC (FIFO)
        const unpaidSales = dbAll(`
            SELECT id, total, paid_amount 
            FROM sales 
            WHERE customer_id = ? AND status != 'paid' 
            ORDER BY date ASC, id ASC
        `, [id]);

        for (const sale of unpaidSales) {
            if (remainingPayment <= 0) break;

            const amountNeeded = sale.total - sale.paid_amount;
            if (amountNeeded <= 0) continue;

            const amountToApply = Math.min(amountNeeded, remainingPayment);

            if (amountToApply > 0) {
                const newPaidAmount = sale.paid_amount + amountToApply;
                const newStatus = newPaidAmount >= sale.total ? 'paid' : 'partially_paid';

                dbRun(`
                    UPDATE sales 
                    SET paid_amount = ?, status = ? 
                    WHERE id = ?
                `, [newPaidAmount, newStatus, sale.id], true);

                remainingPayment -= amountToApply;
            }
        }

        // Decrease the customer's outstanding liability balance
        dbRun(`UPDATE customers SET balance = balance - ? WHERE id = ?`, [paymentAmount, id]);

        const { saveDb } = require('../database');
        saveDb();
        dbRun('COMMIT');

        const customer = dbGet('SELECT * FROM customers WHERE id = ?', [id]);
        res.json({ success: true, payment_id: insert.lastInsertRowid, new_balance: customer.balance });
    } catch (err) {
        dbRun('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
