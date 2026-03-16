const express = require('express');
const router = express.Router();
const { dbGet } = require('../database');
const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

router.post('/receipt', async (req, res) => {
    try {
        const sale = req.body;
        if (!sale) return res.status(400).json({ error: 'No sale data provided' });

        const settings = dbGet('SELECT * FROM settings LIMIT 1');
        const printerInterface = settings?.printer_interface || '';

        if (!printerInterface) {
            return res.status(400).json({ error: 'Printer interface not configured in settings' });
        }

        // Initialize printer
        let printer = new ThermalPrinter({
            type: PrinterTypes.EPSON, // ESC/POS
            interface: printerInterface,
            width: 42, // Typical for 80mm
            characterSet: 'PC858_EURO', // Common character set
            options: {
                timeout: 5000 // 5 seconds
            }
        });

        const pharmName = settings?.pharmacy_name || 'EPOS Pharma';
        const pharmAddr = settings?.address || '';
        const pharmPhone = settings?.phone || '';
        const currency = settings?.currency || 'PKR';

        // --- Build Receipt ---
        printer.alignCenter();
        printer.println(pharmName);
        if (pharmAddr) printer.println(pharmAddr);
        if (pharmPhone) printer.println(pharmPhone);

        // Receipt Header
        printer.drawLine();
        printer.alignLeft();
        printer.println(`Receipt #${sale.id}`);
        printer.println(`Date: ${new Date(sale.date || Date.now()).toLocaleString()}`);
        printer.println(`Customer: ${sale.customer_name || 'Walk-in Customer'}`);
        printer.drawLine();

        // Items Table
        printer.tableCustom([
            { text: "Item", align: "LEFT", width: 0.5 },
            { text: "Qty", align: "CENTER", width: 0.15 },
            { text: "Amount", align: "RIGHT", width: 0.35 }
        ]);

        (sale.items || []).forEach(item => {
            const amount = (item.subtotal || item.price * item.quantity).toLocaleString();
            printer.tableCustom([
                { text: item.product_name.substring(0, 20), align: "LEFT", width: 0.5 },
                { text: `x${item.quantity}`, align: "CENTER", width: 0.15 },
                { text: `${currency} ${amount}`, align: "RIGHT", width: 0.35 }
            ]);
        });

        // Totals
        printer.drawLine();
        printer.tableCustom([
            { text: "Subtotal", align: "LEFT", width: 0.5 },
            { text: `${currency} ${(sale.subtotal || 0).toLocaleString()}`, align: "RIGHT", width: 0.5 }
        ]);

        if ((sale.discount || 0) > 0) {
            printer.tableCustom([
                { text: "Discount", align: "LEFT", width: 0.5 },
                { text: `-${currency} ${(sale.discount || 0).toLocaleString()}`, align: "RIGHT", width: 0.5 }
            ]);
        }

        if ((sale.tax || 0) > 0) {
            printer.tableCustom([
                { text: "Tax", align: "LEFT", width: 0.5 },
                { text: `${currency} ${(sale.tax || 0).toLocaleString()}`, align: "RIGHT", width: 0.5 }
            ]);
        }

        printer.drawLine();
        printer.bold(true);
        printer.tableCustom([
            { text: "TOTAL", align: "LEFT", width: 0.5 },
            { text: `${currency} ${(sale.total || 0).toLocaleString()}`, align: "RIGHT", width: 0.5 }
        ]);
        printer.bold(false);
        printer.drawLine();

        // Payment Info
        printer.println(`Payment: ${sale.payment_method.toUpperCase()}`);
        printer.alignCenter();
        printer.newLine();
        printer.println('Thank you for your purchase!');
        printer.println(pharmName);
        printer.newLine();
        printer.newLine();
        printer.newLine();
        printer.cut();

        // Print!
        await printer.execute();
        res.json({ message: 'Printed successfully' });

    } catch (err) {
        console.error('Print Error:', err);
        res.status(500).json({ error: err.message || 'Failed to print receipt' });
    }
});

module.exports = router;
