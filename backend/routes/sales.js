const { dbRun, dbGet, dbAll, saveDb } = require('../database');
const express = require('express');
const { requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.post('/', (req, res) => {
    let transactionActive = false;
    try {
        const { customer_id, items, discount, tax, payment_method, payment_details, notes, prescription_image, doctor_name, patient_name, patient_contact, points_redeemed } = req.body;
        if (!items || items.length === 0) return res.status(400).json({ error: 'At least one item is required' });

        const settings = dbGet('SELECT * FROM settings LIMIT 1') || {};
        const loyalty_discount_per_point = settings.loyalty_discount_per_point || 0;
        const amount_for_one_point = settings.amount_for_one_point || 0;

        let customer = null;
        if (customer_id) {
            customer = dbGet('SELECT * FROM customers WHERE id = ?', [customer_id]);
        }

        let parsedPointsRedeemed = parseInt(points_redeemed) || 0;
        let pointsDiscount = 0;

        if (parsedPointsRedeemed > 0) {
            if (!customer) return res.status(400).json({ error: 'Customer is required to redeem points' });
            if (customer.loyalty_points < parsedPointsRedeemed) return res.status(400).json({ error: 'Insufficient loyalty points to redeem' });
            pointsDiscount = parsedPointsRedeemed * loyalty_discount_per_point;
        }

        let subtotal = 0;
        for (const item of items) subtotal += item.price * item.quantity;
        const discountAmount = (discount || 0) + pointsDiscount;
        const taxAmount = tax || 0;
        const total = subtotal - discountAmount + taxAmount;

        let earnedPoints = 0;
        if (customer_id && total > 0 && amount_for_one_point > 0) {
            earnedPoints = Math.floor(total / amount_for_one_point);
        }

        const { dbExec, dbAll } = require('../database');

        dbExec('BEGIN TRANSACTION');
        transactionActive = true;

        // Create sale
        const isCredit = payment_method === 'credit' || payment_method === 'unpaid';
        const initialStatus = isCredit ? 'unpaid' : 'paid';
        const paidAmount = isCredit ? 0 : total;

        const saleResult = dbRun(
            `INSERT INTO sales (customer_id, subtotal, discount, tax, total, paid_amount, payment_method, payment_details, status, notes, prescription_image, doctor_name, patient_name, patient_contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [customer_id || null, subtotal, discountAmount, taxAmount, total, paidAmount, payment_method || 'cash', payment_details || '', initialStatus, notes || '', prescription_image || '', doctor_name || '', patient_name || '', patient_contact || ''],
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
            // Expired batches are deprioritized but allowed as fallback to avoid blocking sales.
            let availableBatches = dbAll(
                `SELECT id, remaining_quantity FROM batches WHERE product_id = ? AND remaining_quantity > 0 ORDER BY CASE WHEN expiry_date IS NULL OR expiry_date = '' THEN 1 ELSE 0 END, expiry_date ASC, id ASC`,
                [item.product_id]
            );

            // Fallback: If no batch records exist but product has stock (legacy/manual inventory),
            // auto-create a catch-all batch so the FEFO engine can proceed.
            if (availableBatches.length === 0) {
                const prod = dbGet('SELECT stock, purchase_price, selling_price, expiry, batch FROM products WHERE id = ?', [item.product_id]);
                if (prod && prod.stock > 0) {
                    const fallbackResult = dbRun(
                        `INSERT INTO batches (product_id, batch_number, purchase_price, sales_price, expiry_date, quantity_purchased, remaining_quantity, invoice_reference)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [item.product_id, prod.batch || 'LEGACY', prod.purchase_price || 0, prod.selling_price || 0, prod.expiry || null, prod.stock, prod.stock, 'AUTO-MIGRATED'],
                        true
                    );
                    availableBatches = [{ id: fallbackResult.lastInsertRowid, remaining_quantity: prod.stock }];
                }
            }

            // 3. Sequentially drain matching batches
            for (const batch of availableBatches) {
                if (remainingToDeduct <= 0) break;

                const deductFromBatch = Math.min(remainingToDeduct, batch.remaining_quantity);

                // Update the batch's personal remaining quantity
                dbRun(`UPDATE batches SET remaining_quantity = remaining_quantity - ? WHERE id = ?`, [deductFromBatch, batch.id], true);

                // Record the hard-link so we know exactly which wholesale item was sold for precise PnL later
                dbRun(`INSERT INTO sale_item_batches (sale_item_id, batch_id, quantity) VALUES (?, ?, ?)`, [saleItemId, batch.id, deductFromBatch], true);

                // Record the precise stock_movements audit
                dbRun(`INSERT INTO stock_movements (product_id, batch_id, type, quantity, reference_id, notes) VALUES (?, ?, 'sale', ?, ?, 'Sale to customer')`, [item.product_id, batch.id, -deductFromBatch, saleId], true);

                remainingToDeduct -= deductFromBatch;
            }

            if (remainingToDeduct > 0) {
                try { dbExec('ROLLBACK'); } catch (rbErr) { } // ignore rollback errors
                transactionActive = false;
                return res.status(400).json({ error: `Insufficient batch stock for product: ${item.product_name}. Please add stock via a Purchase Invoice.` });
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

        // Log initial payment into ledger if cash/card was handed over and a customer is attached
        if (!isCredit && customer_id && total > 0) {
            dbRun(`
                INSERT INTO customer_payments (customer_id, amount, method, reference, date) 
                VALUES (?, ?, ?, ?, datetime('now'))
            `, [customer_id, total, payment_method || 'cash', `Initial payment for Sale #${saleId}`], true);
        } else if (isCredit && customer_id && total > 0) {
            // Increase the customer's balance for credit sales
            dbRun(`UPDATE customers SET balance = balance + ? WHERE id = ?`, [total, customer_id], true);
        }

        // Apply loyalty points changes
        if (customer_id && (earnedPoints > 0 || parsedPointsRedeemed > 0)) {
            dbRun(`UPDATE customers SET loyalty_points = loyalty_points + ? - ? WHERE id = ?`, [earnedPoints, parsedPointsRedeemed, customer_id], true);
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

// POST /api/sales/:id/return
router.post('/:id/return', requireAdmin, (req, res) => {
    let transactionActive = false;
    const saleId = parseInt(req.params.id);

    try {
        const { dbExec, dbGet, dbAll, dbRun, saveDb } = require('../database');
        dbExec('BEGIN TRANSACTION');
        transactionActive = true;

        // Verify sale exists and isn't already returned
        const sale = dbGet('SELECT * FROM sales WHERE id = ?', [saleId]);
        if (!sale) {
            dbExec('ROLLBACK');
            return res.status(404).json({ error: 'Sale not found' });
        }
        if (sale.status === 'returned') {
            dbExec('ROLLBACK');
            return res.status(400).json({ error: 'Sale is already returned completely' });
        }

        const returnReqs = req.body.items; // [{ id: sale_item_id, quantity: N }]
        const saleItems = dbAll('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);

        let returnMap = new Map();
        if (returnReqs && returnReqs.length > 0) {
            for (const r of returnReqs) returnMap.set(r.id, r.quantity);
        } else {
            for (const item of saleItems) returnMap.set(item.id, item.quantity - item.returned_quantity);
        }

        let totalRefund = 0;
        let itemsReturnedCount = 0;

        for (const item of saleItems) {
            const reqQty = Math.min(returnMap.get(item.id) || 0, item.quantity - item.returned_quantity);
            if (reqQty <= 0) continue;

            itemsReturnedCount++;
            const refundAmount = item.price * reqQty;
            totalRefund += refundAmount;

            // Restore global product stock
            dbRun('UPDATE products SET stock = stock + ? WHERE id = ?', [reqQty, item.product_id], true);

            // Mark returned quantity on sale item
            dbRun('UPDATE sale_items SET returned_quantity = returned_quantity + ? WHERE id = ?', [reqQty, item.id], true);

            // Restore batch stock tracking and log movements
            const linkedBatches = dbAll('SELECT * FROM sale_item_batches WHERE sale_item_id = ? ORDER BY id DESC', [item.id]);
            let remainingToRestock = reqQty;

            for (const b of linkedBatches) {
                if (remainingToRestock <= 0) break;
                const canRestockForThisBatch = b.quantity - b.returned_quantity;
                const restockAmt = Math.min(remainingToRestock, canRestockForThisBatch);

                if (restockAmt > 0) {
                    dbRun('UPDATE batches SET remaining_quantity = remaining_quantity + ? WHERE id = ?', [restockAmt, b.batch_id], true);
                    dbRun('UPDATE sale_item_batches SET returned_quantity = returned_quantity + ? WHERE id = ?', [restockAmt, b.id], true);
                    dbRun(`INSERT INTO stock_movements (product_id, batch_id, type, quantity, reference_id, notes) VALUES (?, ?, 'return', ?, ?, 'Sale Returned (Batch Restock)')`, [item.product_id, b.batch_id, restockAmt, saleId], true);
                    remainingToRestock -= restockAmt;
                }
            }

            // If any leftover (legacy items without batch records), log it as generic return
            if (remainingToRestock > 0) {
                dbRun(`INSERT INTO stock_movements (product_id, batch_id, type, quantity, reference_id, notes) VALUES (?, NULL, 'return', ?, ?, 'Sale Returned (Generic legacy stock)')`, [item.product_id, remainingToRestock, saleId], true);
            }
        }

        if (itemsReturnedCount === 0) {
            dbExec('ROLLBACK');
            return res.status(400).json({ error: 'No items eligible for return based on quantities provided' });
        }

        // Handle Ledger Reversals
        const effectiveRatio = sale.subtotal > 0 ? (sale.total / sale.subtotal) : 1;
        const actualRefund = Math.round(totalRefund * effectiveRatio * 100) / 100;

        if (sale.payment_method === 'credit' || sale.payment_method === 'unpaid') {
            if (sale.customer_id) {
                dbRun('UPDATE customers SET balance = balance - ? WHERE id = ?', [actualRefund, sale.customer_id], true);
            }
        } else {
            if (sale.customer_id) {
                dbRun(`INSERT INTO customer_payments (customer_id, amount, method, reference, date) VALUES (?, ?, ?, ?, datetime('now'))`, [sale.customer_id, -actualRefund, 'refund', `Refund for Return #${saleId}`], true);
            }
        }

        // Check if fully returned
        const updatedItems = dbAll('SELECT quantity, returned_quantity FROM sale_items WHERE sale_id = ?', [saleId]);
        const isFullyReturned = updatedItems.every(i => i.quantity <= i.returned_quantity);
        if (isFullyReturned) {
            dbRun('UPDATE sales SET status = ? WHERE id = ?', ['returned', saleId], true);
        } else {
            dbRun('UPDATE sales SET status = ? WHERE id = ?', ['partial_return', saleId], true);
        }

        dbExec('COMMIT');
        transactionActive = false;
        saveDb();

        res.json({ message: 'Sale successfully returned', sale_id: saleId, refund_amount: actualRefund, is_fully_returned: isFullyReturned });
    } catch (err) {
        if (transactionActive) {
            try { require('../database').dbExec('ROLLBACK'); } catch (e) { }
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
