import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { api } from '../api';
import { AppContext } from '../App';

const CATS = ['All', 'General', 'Tablets', 'Syrup', 'Injection', 'Cream', 'Drops', 'Capsule', 'Surgical', 'Other'];
const CATEGORY_COLORS = {
    All: 'bg-sea-50 text-sea-700 dark:bg-sea-900/20 dark:text-sea-400 border-sea-300 dark:border-sea-700',
    General: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200',
    Tablets: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200',
    Syrup: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200',
    Injection: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-200',
    Cream: 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400 border-pink-200',
    Drops: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400 border-sky-200',
    Capsule: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-200',
    Surgical: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200',
    Other: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200',
};

export default function POS() {
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
    const [activeCat, setActiveCat] = useState('All');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [payMethod, setPayMethod] = useState('cash');
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState('fixed');
    const [pointsRedeemed, setPointsRedeemed] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [doctorName, setDoctorName] = useState('');
    const [patientName, setPatientName] = useState('');
    const [patientContact, setPatientContact] = useState('');
    const [prescriptionImage, setPrescriptionImage] = useState(null);
    const [saleComplete, setSaleComplete] = useState(null);
    const [salesHistory, setSalesHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [returnSale, setReturnSale] = useState(null);
    const [returnForm, setReturnForm] = useState([]);
    const [settings, setSettings] = useState(null);
    const searchRef = useRef(null);
    const barcodeTimer = useRef(null);
    const barcodeBuffer = useRef('');
    const { user, addToast } = useContext(AppContext);

    useEffect(() => {
        Promise.all([api.getProducts(), api.getCustomers(), api.getSettings()])
            .then(([p, c, s]) => { setProducts(p); setCustomers(c); setSettings(s); })
            .catch(console.error);
        searchRef.current?.focus();
    }, []);

    // Prevent window close if cart has items
    useEffect(() => {
        if (window.electronAPI && window.electronAPI.setCanClose) {
            window.electronAPI.setCanClose(cart.length === 0);
        }
    }, [cart]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'F1') { e.preventDefault(); searchRef.current?.focus(); }
            if (e.key === 'F2') { e.preventDefault(); clearCart(); }
            if (e.key === 'F4') { e.preventDefault(); if (cart.length > 0 && !processing) completeSale(); }
            if (e.key === 'F5') { e.preventDefault(); setShowHistory(true); loadHistory(); }
            if (e.key === 'Escape') { setSaleComplete(null); setShowHistory(false); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [cart, saleComplete, processing, showHistory]);

    // Barcode scanner
    useEffect(() => {
        const handler = (e) => {
            if (document.activeElement !== searchRef.current && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                barcodeBuffer.current += e.key;
                clearTimeout(barcodeTimer.current);
                barcodeTimer.current = setTimeout(() => {
                    const code = barcodeBuffer.current;
                    if (code.length >= 6) {
                        const p = products.find(x => x.barcode === code);
                        if (p && p.stock > 0) { addToCart(p); addToast(`${p.name} added via barcode`, 'success'); }
                        else if (p) addToast(`${p.name} is out of stock`, 'warning');
                        else addToast(`No product found for barcode: ${code}`, 'warning');
                    }
                    barcodeBuffer.current = '';
                }, 120);
            }
        };
        window.addEventListener('keypress', handler);
        return () => window.removeEventListener('keypress', handler);
    }, [products, cart]);

    const filtered = products.filter(p => {
        const s = search.toLowerCase();
        const matchSearch = !search || 
            p.name?.toLowerCase().includes(s) || 
            (p.barcode && p.barcode.toLowerCase().includes(s)) || 
            (p.brand && p.brand.toLowerCase().includes(s)) ||
            (p.generic_name && p.generic_name.toLowerCase().includes(s));
        return matchSearch && (activeCat === 'All' || p.category === activeCat);
    });

    function addToCart(p) {
        if (!p || p.stock <= 0) return;
        const idx = cart.findIndex(i => i.product_id === p.id);
        if (idx >= 0) {
            if (cart[idx].quantity >= p.stock) { addToast('Maximum stock reached', 'warning'); return; }
            setCart(cart.map((i, j) => j === idx ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, { product_id: p.id, product_name: p.name, price: p.selling_price || 0, quantity: 1, max_stock: p.stock, batch: p.batch || '', category: p.category || 'General', is_narcotic: !!p.is_narcotic, is_prescription_required: !!p.is_prescription_required }]);
        }
    }

    function updateQty(id, val) {
        const item = cart.find(i => i.product_id === id);
        if (!item) return;
        const newQty = typeof val === 'number' ? val : Math.max(1, item.quantity + val);
        if (newQty > item.max_stock) { addToast('Maximum stock reached', 'warning'); return; }
        if (newQty <= 0) { removeItem(id); return; }
        setCart(cart.map(i => i.product_id === id ? { ...i, quantity: newQty } : i));
    }

    function removeItem(id) { setCart(cart.filter(i => i.product_id !== id)); }
    function clearCart() { setCart([]); setDiscount(0); setDiscountType('fixed'); setSelectedCustomer(null); setPayMethod('cash'); setDoctorName(''); setPatientName(''); setPatientContact(''); setPrescriptionImage(null); setPointsRedeemed(0); }

    const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const taxRate = settings?.tax_rate || 0;
    const taxAmt = subtotal * (taxRate / 100);
    const manualDiscountAmt = discountType === 'percent' ? subtotal * (Math.min(discount, 100) / 100) : Math.min(discount, subtotal);
    const loyaltyDiscountAmt = pointsRedeemed * (settings?.loyalty_discount_per_point || 0);
    const discountAmt = manualDiscountAmt + loyaltyDiscountAmt;
    const total = Math.max(0, subtotal + taxAmt - discountAmt);
    const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
    const currency = settings?.currency || 'PKR';

    async function loadHistory() {
        try { setSalesHistory(await api.getSales('limit=20')); } catch { setSalesHistory([]); }
    }

    async function openReturnSale(id) {
        setProcessing(true);
        try {
            const saleData = await api.getSale(id);
            setReturnSale(saleData);
            setReturnForm(saleData.items.map(i => ({
                id: i.id,
                name: i.product_name,
                price: i.price,
                max: i.quantity,
                returned: i.returned_quantity || 0,
                qty: 0
            })));
        } catch (err) {
            addToast('Failed to load sale for return: ' + err.message, 'error');
        }
        setProcessing(false);
    }

    async function handleConfirmReturn() {
        const returningItems = returnForm.filter(i => i.qty > 0).map(i => ({ id: i.id, quantity: i.qty }));
        if (returningItems.length === 0) {
            addToast('No items selected to return', 'error');
            return;
        }
        setProcessing(true);
        try {
            await api.returnSale(returnSale.id, returningItems);
            addToast(`Sale #${returnSale.id} returned successfully`, 'success');
            setReturnSale(null);
            loadHistory();
        } catch (err) {
            addToast('Return failed: ' + err.message, 'error');
        }
        setProcessing(false);
    }

    async function handleViewSale(id, print = false) {
        setProcessing(true);
        try {
            const saleData = await api.getSale(id);
            setSaleComplete(saleData);
            if (print) {
                // Must let the DOM render the receipt before printing if A6 fallback
                setTimeout(async () => {
                    if (settings?.invoice_type === 'Thermal' && settings?.printer_interface) {
                        try {
                            await api.printReceipt(saleData);
                            addToast('Sent to thermal printer', 'success');
                        } catch (e) {
                            addToast('Print failed: ' + e.message, 'error');
                        }
                    } else {
                        window.print();
                    }
                }, 100);
            }
        } catch (err) {
            addToast('Failed to load sale: ' + err.message, 'error');
        }
        setProcessing(false);
    }

    const requiresPrescription = cart.some(i => i.is_prescription_required || i.is_narcotic);
    const hasNarcotic = cart.some(i => i.is_narcotic);

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => setPrescriptionImage(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const completeSale = useCallback(async () => {
        if (cart.length === 0 || processing) return;
        if (hasNarcotic && (!selectedCustomer || !selectedCustomer.cnic)) {
            addToast('Narcotic sales require a registered customer with a valid CNIC', 'error');
            return;
        }
        if (requiresPrescription && !doctorName) {
            addToast('Doctor Name is required for prescription drugs', 'error');
            return;
        }
        setProcessing(true);
        try {
            const result = await api.createSale({
                customer_id: selectedCustomer?.id || null,
                items: cart.map(i => ({ product_id: i.product_id, product_name: i.product_name, quantity: i.quantity, price: i.price })),
                discount: manualDiscountAmt, tax: taxAmt, payment_method: payMethod,
                doctor_name: doctorName, patient_name: patientName, patient_contact: patientContact, prescription_image: prescriptionImage,
                points_redeemed: pointsRedeemed
            });
            setSaleComplete(result);
            setCart([]); setDiscount(0); setDiscountType('fixed'); setPointsRedeemed(0);
            const prods = await api.getProducts();
            setProducts(prods);
            setCustomers(await api.getCustomers());
            addToast(`Sale #${result.id} completed — ${currency} ${result.total?.toLocaleString()}`, 'success');
        } catch (err) { addToast(err.message || 'Failed to complete sale', 'error'); }
        setProcessing(false);
    }, [cart, processing, selectedCustomer, discountAmt, taxAmt, payMethod, currency, hasNarcotic, requiresPrescription, doctorName, patientName, patientContact, prescriptionImage]);

    const payments = [
        { key: 'cash', label: 'Cash', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
        { key: 'jazzcash', label: 'JazzCash', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
        { key: 'easypaisa', label: 'Easypaisa', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { key: 'card', label: 'Card', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
    ];

    // ══════════════════════════════════════
    // ═══ SALE COMPLETE / RECEIPT VIEW ═══
    // ══════════════════════════════════════
    if (saleComplete) {
        const sale = saleComplete;
        const pharmName = settings?.pharmacy_name || 'EPOS Pharma';
        const pharmAddr = settings?.address || '';
        const pharmPhone = settings?.phone || '';

        return (
            <>
                {/* ══════════════════════════════════════
                    ON-SCREEN SUCCESS VIEW (HIDDEN DURING PRINT)
                    ══════════════════════════════════════ */}
                <div className="flex items-center justify-center h-full p-6 bg-gradient-to-br from-gray-50 via-white to-sea-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 print:hidden">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-2xl shadow-sea-500/5 w-full max-w-[440px] animate-scale-up overflow-hidden">
                        {/* Success Header */}
                        <div className="bg-gradient-to-r from-sea-500 to-sea-700 px-6 py-6 text-center relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.15'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3C/g%3E%3C/svg%3E")` }} />
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-black/10">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h2 className="text-xl font-bold text-white">Sale Complete!</h2>
                                <p className="text-sea-100 text-sm mt-1">Receipt #{sale.id} • {new Date(sale.date || Date.now()).toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Customer */}
                        {sale.customer_name && (
                            <div className="px-6 py-3 bg-sea-50/50 dark:bg-sea-900/10 border-b border-sea-100 dark:border-sea-900/30 flex items-center gap-2">
                                <div className="w-7 h-7 bg-sea-100 dark:bg-sea-900/30 rounded-full flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-sea-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                </div>
                                <span className="text-sm font-semibold text-sea-700 dark:text-sea-400">{sale.customer_name}</span>
                            </div>
                        )}

                        {/* Items */}
                        <div className="px-6 py-4 border-b border-dashed border-gray-200 dark:border-gray-600 max-h-[200px] overflow-y-auto">
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-2">Items</div>
                            {sale.items?.map((item, i) => (
                                <div key={i} className="flex justify-between items-center py-2 text-sm">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-800 dark:text-gray-200">{item.product_name}</div>
                                        <div className="text-[11px] text-gray-400">{currency} {(item.price || 0).toLocaleString()} × {item.quantity}</div>
                                    </div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300 ml-4">{currency} {(item.subtotal || item.price * item.quantity).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="px-6 py-4 space-y-2">
                            <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{currency} {(sale.subtotal || 0).toLocaleString()}</span></div>
                            {(sale.tax || 0) > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Tax</span><span>{currency} {(sale.tax || 0).toLocaleString()}</span></div>}
                            {(sale.discount || 0) > 0 && <div className="flex justify-between text-sm text-red-500"><span>Discount</span><span>-{currency} {(sale.discount || 0).toLocaleString()}</span></div>}
                            <div className="border-t border-dashed border-gray-200 dark:border-gray-600 pt-3 mt-2 flex justify-between items-baseline">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">Total Paid</span>
                                <span className="text-2xl font-extrabold bg-gradient-to-r from-sea-500 to-sea-700 bg-clip-text text-transparent">{currency} {(sale.total || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sea-50 dark:bg-sea-900/20 text-sea-700 dark:text-sea-400 text-xs font-semibold rounded-full border border-sea-200 dark:border-sea-800 capitalize">
                                    <span className="w-1.5 h-1.5 bg-sea-500 rounded-full"></span>{sale.payment_method}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-full">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>Paid
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-5 pt-2 flex gap-3">
                            <button onClick={async () => {
                                if (settings?.invoice_type === 'Thermal' && settings?.printer_interface) {
                                    setProcessing(true);
                                    try {
                                        await api.printReceipt(sale);
                                        addToast('Sent to thermal printer', 'success');
                                    } catch (err) {
                                        addToast('Print failed: ' + err.message, 'error');
                                        console.error(err);
                                    }
                                    setProcessing(false);
                                } else {
                                    window.print();
                                }
                            }} disabled={processing} className="flex-1 py-3 bg-white dark:bg-gray-700 border-2 border-sea-500 text-sea-700 dark:text-sea-400 font-bold rounded-xl text-sm hover:bg-sea-50 dark:hover:bg-sea-900/20 transition-all flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>Print {settings?.invoice_type === 'Thermal' ? '(Thermal)' : '(A6)'}
                            </button>
                            <button onClick={() => { setSaleComplete(null); setSelectedCustomer(null); setPayMethod('cash'); }} className="flex-1 py-3 bg-gradient-to-r from-sea-500 to-sea-700 hover:from-sea-600 hover:to-sea-800 text-white font-bold rounded-xl text-sm shadow-lg shadow-sea-500/25 hover:shadow-sea-500/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>New Sale
                            </button>
                        </div>
                        <p className="text-center text-[10px] text-gray-400 pb-4">Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">Esc</kbd> to continue</p>
                    </div>
                </div>

                {/* ══════════════════════════════════════
                    PRINTABLE RECEIPT VIEW (ONLY VISIBLE DURING PRINT)
                    Note: If 'Thermal' is selected, window.print() is bypassed. This handles 'A6' fallback.
                    ══════════════════════════════════════ */}
                <div id="printable-receipt" className={`hidden bg-white text-black p-4 z-[9999] ${settings?.invoice_type === 'A6' ? 'print-a6' : 'print-thermal'}`}>
                    <div style={settings?.invoice_type === 'A6' ? { fontFamily: "Arial, sans-serif", width: '100%', margin: '0', fontSize: '13px' } : { fontFamily: "'Courier New', monospace", maxWidth: '320px', margin: '0 auto', fontSize: '12px' }}>
                        <h2 style={{ textAlign: 'center', fontSize: settings?.invoice_type === 'A6' ? '22px' : '18px', marginBottom: '2px', fontWeight: 'bold' }}>{pharmName}</h2>
                        {(pharmAddr || pharmPhone) && (
                            <p style={{ textAlign: 'center', fontSize: settings?.invoice_type === 'A6' ? '12px' : '11px', color: '#555', marginBottom: '10px' }}>
                                {pharmAddr}
                                {pharmAddr && pharmPhone ? <br /> : ''}
                                {pharmPhone}
                            </p>
                        )}
                        <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '10px 0' }} />
                        <p style={{ fontSize: settings?.invoice_type === 'A6' ? '14px' : '12px', lineHeight: '1.6' }}>
                            <strong>Receipt #{sale.id}</strong><br />
                            Date: {new Date(sale.date || Date.now()).toLocaleString()}<br />
                            {sale.customer_name ? 'Customer: ' + sale.customer_name : 'Walk-in Customer'}
                        </p>
                        <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '10px 0' }} />
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ fontSize: settings?.invoice_type === 'A6' ? '13px' : '11px', color: '#555', borderBottom: '1px solid #ddd' }}>
                                    <th style={{ textAlign: 'left', padding: '4px 0' }}>Item</th>
                                    <th style={{ textAlign: 'center', padding: '4px' }}>Qty</th>
                                    <th style={{ textAlign: 'right', padding: '4px 0' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(sale.items || []).map((i, idx) => (
                                    <tr key={idx}>
                                        <td style={{ padding: '6px 0', fontSize: settings?.invoice_type === 'A6' ? '15px' : '13px', borderBottom: '1px solid #eee' }}>{i.product_name}</td>
                                        <td style={{ padding: '6px 4px', fontSize: settings?.invoice_type === 'A6' ? '15px' : '13px', textAlign: 'center', borderBottom: '1px solid #eee' }}>×{i.quantity}</td>
                                        <td style={{ padding: '6px 0', fontSize: settings?.invoice_type === 'A6' ? '15px' : '13px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{currency} {(i.subtotal || i.price * i.quantity).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '10px 0' }} />
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr>
                                    <td style={{ fontSize: settings?.invoice_type === 'A6' ? '15px' : '13px', padding: '3px 0' }}>Subtotal</td>
                                    <td style={{ textAlign: 'right', fontSize: settings?.invoice_type === 'A6' ? '15px' : '13px', padding: '3px 0' }}>{currency} {(sale.subtotal || 0).toLocaleString()}</td>
                                </tr>
                                {(sale.discount || 0) > 0 && (
                                    <tr>
                                        <td style={{ fontSize: settings?.invoice_type === 'A6' ? '15px' : '13px', padding: '3px 0' }}>Discount</td>
                                        <td style={{ textAlign: 'right', fontSize: settings?.invoice_type === 'A6' ? '15px' : '13px', padding: '3px 0' }}>-{currency} {(sale.discount || 0).toLocaleString()}</td>
                                    </tr>
                                )}
                                {(sale.tax || 0) > 0 && (
                                    <tr>
                                        <td style={{ fontSize: settings?.invoice_type === 'A6' ? '15px' : '13px', padding: '3px 0' }}>Tax</td>
                                        <td style={{ textAlign: 'right', fontSize: settings?.invoice_type === 'A6' ? '15px' : '13px', padding: '3px 0' }}>{currency} {(sale.tax || 0).toLocaleString()}</td>
                                    </tr>
                                )}
                                <tr style={{ borderTop: '1px dashed #aaa' }}>
                                    <td style={{ fontSize: settings?.invoice_type === 'A6' ? '18px' : '16px', fontWeight: 'bold', paddingTop: '8px' }}>Total</td>
                                    <td style={{ textAlign: 'right', fontSize: settings?.invoice_type === 'A6' ? '18px' : '16px', fontWeight: 'bold', paddingTop: '8px' }}>{currency} {(sale.total || 0).toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                        <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '10px 0' }} />
                        <p style={{ fontSize: settings?.invoice_type === 'A6' ? '14px' : '12px' }}>Payment: <strong style={{ textTransform: 'capitalize' }}>{sale.payment_method}</strong></p>
                        <p style={{ textAlign: 'center', fontSize: settings?.invoice_type === 'A6' ? '12px' : '10px', color: '#777', marginTop: '16px' }}>
                            Thank you for your purchase!<br />
                            {pharmName}
                        </p>
                    </div>
                </div>
            </>
        );
    }

    // ══════════════════════════════════════
    // ═══ MAIN POS INTERFACE ═══
    // ══════════════════════════════════════
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex gap-0 flex-1 min-h-0">
                {/* ═══════════ LEFT: Products ═══════════ */}
                <div className="flex-1 flex flex-col min-w-0 p-4 pr-2">
                    {/* Search + History */}
                    <div className="flex gap-2 mb-3">
                        <div className="relative flex-1">
                            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input ref={searchRef} placeholder="Search by name, barcode, brand... (F1)" value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-sea-500/30 focus:border-sea-400 transition-all shadow-sm" />
                        </div>
                        <button onClick={() => { setShowHistory(true); loadHistory(); }} title="Sales History (F5)"
                            className="px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:border-sea-400 hover:text-sea-600 transition-all shadow-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                    </div>

                    {/* Categories */}
                    <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                        {CATS.map(c => (
                            <button key={c} onClick={() => setActiveCat(c)} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all shrink-0 border ${activeCat === c
                                ? 'bg-sea-500 text-white border-sea-500 shadow-sm shadow-sea-500/20'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-sea-300'}`}>
                                {c}
                            </button>
                        ))}
                    </div>

                    {/* Products Grid */}
                    <div className="flex-1 overflow-y-auto pr-1">
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-300 dark:text-gray-600">
                                <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <span className="text-sm">{search ? `No products matching "${search}"` : 'No products in this category'}</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                {filtered.map(p => {
                                    const inCart = cart.find(c => c.product_id === p.id);
                                    return (
                                        <button key={p.id} disabled={p.stock <= 0} onClick={() => addToCart(p)}
                                            className={`text-left p-3 bg-white dark:bg-gray-800 border rounded-xl transition-all duration-200 relative group ${p.stock <= 0 ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700' : inCart ? 'border-sea-400 ring-2 ring-sea-400/20 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-sea-300 hover:shadow-md cursor-pointer'}`}>
                                            {/* In-cart badge */}
                                            {inCart && (
                                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-sea-500 to-sea-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md shadow-sea-500/30 ring-2 ring-white dark:ring-gray-800">{inCart.quantity}</div>
                                            )}
                                            {/* Category dot */}
                                            <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider mb-1.5 border ${CATEGORY_COLORS[p.category] || CATEGORY_COLORS.Other}`}>{p.category === 'General' ? 'GEN' : p.category?.substring(0, 3)}</div>
                                            <div className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate leading-tight">{p.name}</div>
                                            {p.generic_name && <div className="text-[9px] text-gray-500 truncate">{p.generic_name}</div>}
                                            <div className="text-[10px] text-gray-400 truncate mt-0.5">{p.brand || '—'}</div>
                                            <div className="flex items-end justify-between mt-2">
                                                <span className="text-sm font-bold text-sea-700 dark:text-sea-400">{currency} {(p.selling_price || 0).toLocaleString()}</span>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${p.stock <= 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : p.stock <= 10 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{p.stock <= 0 ? 'Out' : p.stock}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════ RIGHT: Bill Panel ═══════════ */}
                <div className="w-[290px] bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden shrink-0">
                    {/* Bill Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-sea-500 to-sea-700 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold">Bill Details</h3>
                                <span className="text-[10px] text-sea-100">{itemCount} item{itemCount !== 1 ? 's' : ''} in cart</span>
                            </div>
                            {cart.length > 0 && (
                                <button onClick={clearCart} className="text-[10px] text-white/70 hover:text-white font-medium px-2 py-1 hover:bg-white/10 rounded transition-all">
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Customer */}
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                        {selectedCustomer ? (
                            <div className="flex items-center justify-between bg-sea-50 dark:bg-sea-900/20 text-sea-700 dark:text-sea-400 px-3 py-2 rounded-lg text-[11px] font-semibold">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-sea-100 dark:bg-sea-900/30 rounded-full flex items-center justify-center"><svg className="w-3 h-3 text-sea-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg></div>
                                    <div className="flex flex-col">
                                        <span>{selectedCustomer.name}</span>
                                        {selectedCustomer.loyalty_points > 0 && <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">{selectedCustomer.loyalty_points} Loyalty Points</span>}
                                    </div>
                                </div>
                                <button onClick={() => { setSelectedCustomer(null); setPointsRedeemed(0); }} className="text-sea-400 hover:text-sea-600 text-xs">✕</button>
                            </div>
                        ) : (
                            <select onChange={e => { const c = customers.find(c => c.id === parseInt(e.target.value)); setSelectedCustomer(c || null); }}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-[11px] text-gray-600 dark:text-gray-300 outline-none focus:ring-1 focus:ring-sea-500 cursor-pointer">
                                <option value="">Walk-in Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-300 dark:text-gray-600 px-4">
                                <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.5.5-.15 1.35.56 1.35H18m-2.5 3a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>
                                <span className="text-[12px] font-medium">Cart is empty</span>
                                <span className="text-[10px] text-gray-400 mt-1 text-center">Click products or scan a barcode to start</span>
                            </div>
                        ) : cart.map((item, idx) => (
                            <div key={item.product_id} className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors group">
                                <div className="w-5 h-5 bg-sea-50 dark:bg-sea-900/20 rounded flex items-center justify-center text-[9px] font-bold text-sea-600 dark:text-sea-400 shrink-0">{idx + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 truncate">{item.product_name}</div>
                                    <div className="text-[10px] text-gray-400">{currency} {item.price.toLocaleString()} ea</div>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    <button onClick={() => updateQty(item.product_id, -1)} className="w-5 h-5 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-sea-50 hover:text-sea-600 text-[10px] font-bold transition-colors">−</button>
                                    <input type="number" className="w-7 text-center text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={item.quantity} onChange={e => updateQty(item.product_id, parseInt(e.target.value) || 1)} min={1} max={item.max_stock} />
                                    <button onClick={() => updateQty(item.product_id, 1)} className="w-5 h-5 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-sea-50 hover:text-sea-600 text-[10px] font-bold transition-colors">+</button>
                                </div>
                                <div className="text-[11px] font-bold text-gray-800 dark:text-gray-200 min-w-[52px] text-right">{currency} {(item.price * item.quantity).toLocaleString()}</div>
                                <button onClick={() => removeItem(item.product_id)} className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* ── Bottom Panel ── */}
                    {cart.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="px-4 py-3 space-y-1.5">
                                <div className="flex justify-between text-[11px] text-gray-500"><span>Subtotal</span><span className="font-medium text-gray-700 dark:text-gray-300">{currency} {subtotal.toLocaleString()}</span></div>
                                {taxRate > 0 && <div className="flex justify-between text-[11px] text-gray-500"><span>Tax ({taxRate}%)</span><span>{currency} {taxAmt.toLocaleString()}</span></div>}

                                {/* Discount */}
                                <div className="flex items-center justify-between text-[11px] text-gray-500">
                                    <span>Discount</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setDiscountType(discountType === 'fixed' ? 'percent' : 'fixed')}
                                            className="text-[9px] font-mono px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-500 hover:border-sea-400 hover:text-sea-600 transition-colors">
                                            {discountType === 'percent' ? '%' : currency}
                                        </button>
                                        <input type="number" className="w-14 px-1.5 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-[11px] text-right text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-sea-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={discount || ''} onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))} placeholder="0" />
                                    </div>
                                </div>

                                {selectedCustomer && selectedCustomer.loyalty_points > 0 && settings?.loyalty_discount_per_point > 0 && (
                                    <div className="flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-500 font-medium">
                                        <span>Redeem Points (Max: {selectedCustomer.loyalty_points})</span>
                                        <div className="flex items-center gap-1">
                                            <input type="number" max={selectedCustomer.loyalty_points} min="0" className="w-14 px-1.5 py-1 bg-white dark:bg-gray-700 border border-amber-200 dark:border-amber-600/50 rounded text-[11px] text-right text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                value={pointsRedeemed || ''} onChange={e => { const val = parseInt(e.target.value) || 0; setPointsRedeemed(Math.min(val, selectedCustomer.loyalty_points)); }} placeholder="0" />
                                            <span className="text-[10px] ml-1">Pts</span>
                                        </div>
                                    </div>
                                )}

                                {discountAmt > 0 && <div className="flex justify-between text-[11px] text-red-500 font-medium"><span>Savings</span><span>-{currency} {discountAmt.toLocaleString()}</span></div>}

                                {requiresPrescription && (
                                    <div className="pt-2 mt-2 border-t border-dashed border-gray-200 dark:border-gray-700 space-y-2 pb-1">
                                        <div className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            PRESCRIPTION REQUIRED
                                        </div>
                                        <input className="w-full px-2 py-1.5 bg-white dark:bg-gray-700 border border-red-200 dark:border-red-900/50 rounded text-[11px] outline-none focus:ring-1 focus:ring-red-500 placeholder-red-300 dark:placeholder-red-800 text-gray-800 dark:text-gray-200" placeholder="Doctor Name *" value={doctorName} onChange={e => setDoctorName(e.target.value)} />
                                        <div className="flex gap-1">
                                            <input className="flex-1 px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-[11px] outline-none" placeholder="Patient Name" value={patientName} onChange={e => setPatientName(e.target.value)} />
                                            <input className="flex-1 px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-[11px] outline-none" placeholder="Contact" value={patientContact} onChange={e => setPatientContact(e.target.value)} />
                                        </div>
                                        <div className="relative">
                                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                            <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-300 dark:border-gray-600 rounded text-[10px] text-gray-500 font-medium">
                                                <span>📸 {prescriptionImage ? 'Prescription Attached' : 'Attach Prescription Image'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Total */}
                                <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-dashed border-gray-200 dark:border-gray-600">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">Total</span>
                                    <span className="text-lg font-extrabold bg-gradient-to-r from-sea-500 to-sea-700 bg-clip-text text-transparent">{currency} {total.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Payment */}
                            <div className="px-4 pb-3">
                                <div className="grid grid-cols-4 gap-1.5 mb-3">
                                    {payments.map(pm => (
                                        <button key={pm.key} onClick={() => setPayMethod(pm.key)}
                                            className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[9px] font-semibold border transition-all ${payMethod === pm.key ? 'bg-sea-50 dark:bg-sea-900/20 border-sea-400 text-sea-700 dark:text-sea-400 shadow-sm shadow-sea-500/10' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 hover:border-sea-300'}`}>
                                            <span className={payMethod === pm.key ? 'text-sea-600 dark:text-sea-400' : 'text-gray-400'}>{pm.icon}</span>
                                            {pm.label}
                                        </button>
                                    ))}
                                </div>

                                <button onClick={completeSale} disabled={processing || cart.length === 0}
                                    className="w-full py-3 bg-gradient-to-r from-sea-500 to-sea-700 hover:from-sea-600 hover:to-sea-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-sea-500/20 hover:shadow-sea-500/40 active:scale-[0.98] disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                                    {processing ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            Complete — {currency} {total.toLocaleString()}
                                        </>
                                    )}
                                </button>

                                {/* Shortcuts */}
                                <div className="flex justify-center gap-2 mt-2">
                                    {[['F1', 'Search'], ['F2', 'Clear'], ['F4', 'Pay'], ['F5', 'History']].map(([k, l]) => (
                                        <span key={k} className="text-[8px] text-gray-400"><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[7px] font-mono mr-0.5">{k}</kbd>{l}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ Sales History Modal ═══ */}
            {
                showHistory && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000] animate-fade-in" onClick={() => setShowHistory(false)}>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[95%] max-w-[720px] max-h-[80vh] flex flex-col animate-scale-up border border-gray-100 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Sales History</h2>
                                    <p className="text-xs text-gray-400 mt-0.5">Recent transactions</p>
                                </div>
                                <button onClick={() => setShowHistory(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {salesHistory.length === 0 ? (
                                    <div className="py-16 text-center"><span className="text-gray-300 dark:text-gray-600 text-sm">No sales recorded yet</span></div>
                                ) : (
                                    <table className="w-full">
                                        <thead><tr className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 sticky top-0">
                                            <th className="text-left px-5 py-3">#</th><th className="text-left px-5 py-3">Date</th><th className="text-left px-5 py-3">Customer</th><th className="text-left px-5 py-3">Payment</th><th className="text-right px-5 py-3">Total</th><th className="text-center px-5 py-3">Actions</th>
                                        </tr></thead>
                                        <tbody>{salesHistory.map(s => (
                                            <tr key={s.id} className="tbl-row border-b border-gray-50 dark:border-gray-700/50 last:border-b-0">
                                                <td className="px-5 py-3 text-xs text-gray-500 font-mono">
                                                    #{s.id}
                                                    {s.status === 'returned' && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-bold uppercase tracking-wide">Returned</span>}
                                                    {s.status === 'partial_return' && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[9px] font-bold uppercase tracking-wide">Partial</span>}
                                                </td>
                                                <td className="px-5 py-3 text-xs text-gray-500">{new Date(s.date).toLocaleString()}</td>
                                                <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-400 font-medium">{s.customer_name || 'Walk-in'}</td>
                                                <td className="px-5 py-3"><span className="px-2 py-0.5 bg-sea-50 dark:bg-sea-900/20 text-sea-700 dark:text-sea-400 text-[10px] font-semibold rounded-full capitalize">{s.payment_method}</span></td>
                                                <td className="px-5 py-3 text-sm text-right font-bold text-sea-700 dark:text-sea-400">{s.status === 'returned' ? <span className="line-through opacity-50 mr-1">{currency} {(s.total || 0).toLocaleString()}</span> : null} {s.status === 'returned' ? <span className="text-red-500">Refunded</span> : `${currency} ${(s.total || 0).toLocaleString()}`}</td>
                                                <td className="px-5 py-3 flex items-center justify-center gap-2">
                                                    <button onClick={() => handleViewSale(s.id, false)} className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-[10px] font-semibold transition-colors disabled:opacity-50" disabled={processing}>View</button>
                                                    <button onClick={() => handleViewSale(s.id, true)} className="px-2.5 py-1 bg-sea-50 hover:bg-sea-100 dark:bg-sea-900/30 dark:hover:bg-sea-900/50 text-sea-600 dark:text-sea-400 rounded text-[10px] font-semibold transition-colors disabled:opacity-50" disabled={processing}>Print</button>
                                                    {s.status !== 'returned' && user?.role === 'admin' && (
                                                        <button onClick={() => openReturnSale(s.id)} className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded text-[10px] font-semibold transition-colors disabled:opacity-50" disabled={processing}>Return</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ═══ Partial Return Modal ═══ */}
            {returnSale && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[3000] animate-fade-in" onClick={() => setReturnSale(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[95%] max-w-[500px] flex flex-col animate-scale-up border border-gray-100 dark:border-gray-700 p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Return Sale #{returnSale.id}</h2>
                        <p className="text-xs text-gray-400 mb-4">{new Date(returnSale.date).toLocaleString()}</p>

                        <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-1">
                            {returnForm.map((item, idx) => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.name}</div>
                                        <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-bold">Qty: {item.max} • <span className="text-red-400">Returned: {item.returned}</span></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mr-1">Return:</span>
                                        <button disabled={item.qty <= 0} onClick={() => {
                                            const newForm = [...returnForm];
                                            newForm[idx].qty = Math.max(0, newForm[idx].qty - 1);
                                            setReturnForm(newForm);
                                        }} className="w-6 h-6 flex justify-center items-center bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300 disabled:opacity-30">-</button>
                                        <input type="number" min="0" max={item.max - item.returned}
                                            value={item.qty || ''}
                                            onChange={e => {
                                                const v = parseInt(e.target.value) || 0;
                                                const newForm = [...returnForm];
                                                newForm[idx].qty = Math.min(Math.max(0, v), item.max - item.returned);
                                                setReturnForm(newForm);
                                            }}
                                            className="w-12 px-1 py-1 border border-gray-200 rounded text-sm text-center bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white outline-none focus:border-red-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                        <button disabled={item.qty >= item.max - item.returned} onClick={() => {
                                            const newForm = [...returnForm];
                                            newForm[idx].qty = Math.min(newForm[idx].qty + 1, item.max - item.returned);
                                            setReturnForm(newForm);
                                        }} className="w-6 h-6 flex justify-center items-center bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300 disabled:opacity-30">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40 p-3 rounded-lg mb-4 text-xs">
                            <span className="font-semibold uppercase tracking-wider">Est. Core Refund:</span>
                            <span className="font-extrabold text-sm">{currency} {returnForm.reduce((sum, item) => sum + (item.qty * item.price), 0).toLocaleString()}</span>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setReturnSale(null)} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                            <button onClick={handleConfirmReturn} disabled={processing || !returnForm.some(i => i.qty > 0)} className="px-4 py-2 bg-red-500 hover:bg-red-600 border border-red-600 text-white rounded-lg text-sm font-bold shadow-md shadow-red-500/20 disabled:opacity-50 flex items-center gap-2">
                                {processing ? 'Processing...' : 'Confirm Return'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
