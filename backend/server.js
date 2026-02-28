const express = require('express');
const cors = require('cors');
const { getDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const customerRoutes = require('./routes/customers');
const supplierRoutes = require('./routes/suppliers');
const reportRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');
const setupRoutes = require('./routes/setup');
const { authMiddleware } = require('./middlewares/auth');

function createApp() {
    const app = express();

    app.use(cors());
    app.use(express.json({ limit: '10mb' }));

    // Public routes
    app.use('/api/auth', authRoutes);
    app.use('/api/setup', setupRoutes);

    // Protected routes
    app.use('/api/products', authMiddleware, productRoutes);
    app.use('/api/sales', authMiddleware, salesRoutes);
    app.use('/api/customers', authMiddleware, customerRoutes);
    app.use('/api/suppliers', authMiddleware, supplierRoutes);
    app.use('/api/purchases', authMiddleware, require('./routes/purchases'));
    app.use('/api/reports', authMiddleware, reportRoutes);
    app.use('/api/settings', authMiddleware, settingsRoutes);
    // Notifications endpoint
    app.get('/api/notifications', authMiddleware, async (req, res) => {
        try {
            const db = await getDatabase();
            const alerts = [];
            // Low stock
            const lowStock = db.exec("SELECT COUNT(*) as c FROM products WHERE stock > 0 AND stock <= 10");
            if (lowStock.length && lowStock[0].values[0][0] > 0) alerts.push({ type: 'warning', msg: `${lowStock[0].values[0][0]} product(s) low on stock` });
            // Expired
            const expired = db.exec("SELECT COUNT(*) as c FROM products WHERE expiry IS NOT NULL AND expiry < date('now')");
            if (expired.length && expired[0].values[0][0] > 0) alerts.push({ type: 'error', msg: `${expired[0].values[0][0]} product(s) expired` });
            // Expiring soon (30 days)
            const expiring = db.exec("SELECT COUNT(*) as c FROM products WHERE expiry IS NOT NULL AND expiry >= date('now') AND expiry <= date('now', '+30 days')");
            if (expiring.length && expiring[0].values[0][0] > 0) alerts.push({ type: 'warning', msg: `${expiring[0].values[0][0]} product(s) expiring in 30 days` });
            res.json(alerts);
        } catch (e) { res.json([]); }
    });

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    return app;
}

async function startServer(port = 3456) {
    // Initialize the database (async for sql.js)
    await getDatabase();
    console.log('Database initialized successfully');

    return new Promise((resolve) => {
        const app = createApp();
        const server = app.listen(port, '127.0.0.1', () => {
            console.log(`EPOS Pharma backend running on http://127.0.0.1:${port}`);
            resolve(server);
        });
    });
}

module.exports = { createApp, startServer };
