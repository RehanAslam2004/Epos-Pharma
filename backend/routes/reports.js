const express = require('express');
const { dbGet, dbAll } = require('../database');

const router = express.Router();

// GET /api/reports/sales
router.get('/sales', (req, res) => {
    try {
        const { period, from, to } = req.query;
        let dateFilter = '';
        const params = [];

        if (from && to) { dateFilter = `AND date(s.date) BETWEEN ? AND ?`; params.push(from, to); }
        else if (period === 'today') dateFilter = `AND date(s.date) = date('now')`;
        else if (period === 'week') dateFilter = `AND date(s.date) >= date('now', '-7 days')`;
        else if (period === 'month') dateFilter = `AND strftime('%Y-%m', s.date) = strftime('%Y-%m', 'now')`;
        else if (period === 'year') dateFilter = `AND strftime('%Y', s.date) = strftime('%Y', 'now')`;

        const summary = dbGet(`SELECT COUNT(*) as total_sales, COALESCE(SUM(total), 0) as total_revenue, COALESCE(AVG(total), 0) as avg_sale, COALESCE(SUM(discount), 0) as total_discount FROM sales s WHERE 1=1 ${dateFilter}`, params);
        const dailyData = dbAll(`SELECT date(s.date) as day, COUNT(*) as sales, COALESCE(SUM(s.total), 0) as revenue FROM sales s WHERE 1=1 ${dateFilter} GROUP BY date(s.date) ORDER BY day ASC`, params);
        const topProducts = dbAll(`SELECT si.product_name, SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_revenue FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE 1=1 ${dateFilter} GROUP BY si.product_id ORDER BY total_revenue DESC LIMIT 10`, params);

        res.json({ summary, dailyData, topProducts });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/inventory
router.get('/inventory', (req, res) => {
    try {
        const lowStock = dbAll('SELECT * FROM products WHERE stock <= 10 ORDER BY stock ASC');
        const expired = dbAll("SELECT * FROM products WHERE expiry IS NOT NULL AND expiry < date('now') ORDER BY expiry ASC");
        const expiringSoon = dbAll("SELECT * FROM products WHERE expiry IS NOT NULL AND expiry BETWEEN date('now') AND date('now', '+30 days') ORDER BY expiry ASC");
        const totalValue = dbGet('SELECT COALESCE(SUM(stock * purchase_price), 0) as cost_value, COALESCE(SUM(stock * selling_price), 0) as sell_value FROM products');
        const categoryBreakdown = dbAll('SELECT category, COUNT(*) as count, SUM(stock) as total_stock FROM products GROUP BY category ORDER BY count DESC');
        res.json({ lowStock, expired, expiringSoon, totalValue, categoryBreakdown });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/customers
router.get('/customers', (req, res) => {
    try {
        const topCustomers = dbAll(`SELECT c.id, c.name, c.phone, c.type, COUNT(s.id) as purchase_count, COALESCE(SUM(s.total), 0) as total_spent FROM customers c LEFT JOIN sales s ON c.id = s.customer_id GROUP BY c.id ORDER BY total_spent DESC LIMIT 20`);
        const typeBreakdown = dbAll('SELECT type, COUNT(*) as count FROM customers GROUP BY type');
        res.json({ topCustomers, typeBreakdown });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/suppliers
router.get('/suppliers', (req, res) => {
    try {
        const supplierStats = dbAll(`SELECT s.id, s.name, s.company, s.phone, COUNT(p.id) as product_count, COALESCE(SUM(p.stock * p.purchase_price), 0) as total_investment FROM suppliers s LEFT JOIN products p ON s.id = p.supplier_id GROUP BY s.id ORDER BY total_investment DESC`);
        res.json({ supplierStats });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/payments
router.get('/payments', (req, res) => {
    try {
        const { from, to } = req.query;
        let dateFilter = '';
        const params = [];
        if (from && to) { dateFilter = `AND date(date) BETWEEN ? AND ?`; params.push(from, to); }
        const paymentBreakdown = dbAll(`SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE 1=1 ${dateFilter} GROUP BY payment_method ORDER BY total DESC`, params);
        res.json({ paymentBreakdown });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/dashboard
router.get('/dashboard', (req, res) => {
    try {
        const todaySales = dbGet(`SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM sales WHERE date(date) = date('now')`);
        const monthRevenue = dbGet(`SELECT COALESCE(SUM(total), 0) as revenue FROM sales WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')`);
        const lowStockCount = dbGet('SELECT COUNT(*) as count FROM products WHERE stock <= 10');
        const newCustomers = dbGet("SELECT COUNT(*) as count FROM customers WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')");
        const totalProducts = dbGet('SELECT COUNT(*) as count FROM products');
        const totalCustomers = dbGet('SELECT COUNT(*) as count FROM customers');
        const weeklySales = dbAll(`SELECT date(date) as day, COUNT(*) as sales, COALESCE(SUM(total), 0) as revenue FROM sales WHERE date(date) >= date('now', '-7 days') GROUP BY date(date) ORDER BY day ASC`);
        const topProducts = dbAll(`SELECT si.product_name, SUM(si.quantity) as qty FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE date(s.date) >= date('now', '-30 days') GROUP BY si.product_id ORDER BY qty DESC LIMIT 5`);
        const recentSales = dbAll(`SELECT s.id, s.total, s.payment_method, s.date, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id ORDER BY s.date DESC LIMIT 5`);

        res.json({
            todaySales: todaySales.count, todayRevenue: todaySales.revenue,
            monthRevenue: monthRevenue.revenue, lowStockCount: lowStockCount.count,
            newCustomers: newCustomers.count, totalProducts: totalProducts.count,
            totalCustomers: totalCustomers.count, weeklySales, topProducts, recentSales,
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
