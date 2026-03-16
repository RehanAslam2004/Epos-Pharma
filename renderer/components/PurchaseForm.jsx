import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AppContext } from '../App';

export default function PurchaseForm() {
    const navigate = useNavigate();
    const { addToast } = useContext(AppContext);

    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [form, setForm] = useState({
        supplier_id: '',
        invoice_number: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'credit',
        paid_amount: 0
    });

    const [items, setItems] = useState([
        { product_id: '', quantity: 1, purchase_price: 0, batch: '', expiry: '' }
    ]);

    useEffect(() => {
        Promise.all([api.getSuppliers(), api.getProducts()])
            .then(([supps, prods]) => {
                setSuppliers(supps);
                setProducts(prods);
            })
            .catch(err => addToast(err.message, 'error'))
            .finally(() => setLoading(false));
    }, []);

    const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        // Auto-fill last purchase price if product is selected
        if (field === 'product_id' && value) {
            const prod = products.find(p => p.id.toString() === value.toString());
            if (prod && !newItems[index].purchase_price) {
                newItems[index].purchase_price = prod.purchase_price || 0;
            }
        }
        setItems(newItems);
    };

    const addItem = () => setItems([...items, { product_id: '', quantity: 1, purchase_price: 0, batch: '', expiry: '' }]);
    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

    const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.purchase_price)), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.supplier_id) return addToast('Please select a supplier', 'warning');

        const validItems = items.filter(i => i.product_id && i.quantity > 0 && i.purchase_price >= 0);
        if (validItems.length === 0) return addToast('Please add at least one valid product item', 'warning');

        setSaving(true);
        try {
            await api.createPurchase({
                ...form,
                total_amount: totalAmount,
                paid_amount: Number(form.paid_amount),
                status: Number(form.paid_amount) >= totalAmount ? 'paid' : (Number(form.paid_amount) > 0 ? 'partial' : 'unpaid'),
                items: validItems
            });
            addToast('Purchase Invoice saved successfully. Inventory updated!', 'success');
            navigate('/purchases');
        } catch (err) {
            addToast(err.message || 'Failed to save purchase invoice', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center mt-20"><div className="w-6 h-6 border-[3px] border-sea-500 border-t-transparent rounded-full animate-spin"></div></div>;

    const inputCls = "w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sea-500/30 focus:border-sea-500 transition-all";

    return (
        <div className="p-6 max-w-5xl mx-auto animate-fade-up">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Record Purchase Invoice</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Log incoming stock from a supplier to update inventory and ledgers.</p>
                </div>
                <button onClick={() => navigate('/purchases')} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium px-4 py-2">Cancel</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header Info */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">Invoice Details</h3>
                    <div className="grid grid-cols-3 gap-5">
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Supplier *</label>
                            <select name="supplier_id" value={form.supplier_id} onChange={handleFormChange} className={inputCls} required>
                                <option value="">Select a vendor...</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.company})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Invoice Number</label>
                            <input type="text" name="invoice_number" value={form.invoice_number} onChange={handleFormChange} className={inputCls} placeholder="Leave blank to auto-generate" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Invoice Date</label>
                            <input type="date" name="date" value={form.date} onChange={handleFormChange} className={inputCls} required />
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Inventory Items</h3>
                        <button type="button" onClick={addItem} className="text-xs font-bold text-sea-600 dark:text-sea-400 flex items-center gap-1 bg-sea-50 dark:bg-sea-900/20 px-3 py-1.5 rounded-lg hover:bg-sea-100 transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                            Add Row
                        </button>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="flex gap-3 items-start relative group">
                                <div className="flex-1">
                                    <select value={item.product_id} onChange={e => handleItemChange(index, 'product_id', e.target.value)} className={inputCls} required>
                                        <option value="">Search medicine...</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} - {p.category}</option>)}
                                    </select>
                                </div>
                                <div className="w-24">
                                    <input type="number" step="0.01" min="0" value={item.purchase_price} onChange={e => handleItemChange(index, 'purchase_price', e.target.value)} className={inputCls} placeholder="Price" required />
                                </div>
                                <div className="w-20">
                                    <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className={inputCls} placeholder="Qty" required />
                                </div>
                                <div className="w-32">
                                    <input type="text" value={item.batch} onChange={e => handleItemChange(index, 'batch', e.target.value)} className={inputCls} placeholder="Batch #" />
                                </div>
                                <div className="w-32">
                                    <input type="date" value={item.expiry} onChange={e => handleItemChange(index, 'expiry', e.target.value)} className={inputCls} />
                                </div>
                                <div className="w-24 flex items-center justify-end font-mono font-bold text-sm text-gray-700 dark:text-gray-200 pt-2">
                                    PKR {(item.purchase_price * item.quantity).toLocaleString()}
                                </div>
                                {items.length > 1 && (
                                    <button type="button" onClick={() => removeItem(index)} className="absolute -right-3 top-2 opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 transition-opacity bg-rose-50 rounded p-0.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Totals & Payment */}
                    <div className="mt-8 pt-5 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-8 items-start">
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-3 border border-gray-100 dark:border-gray-700">
                            <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Payment Settlement</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Method</label>
                                    <select name="payment_method" value={form.payment_method} onChange={handleFormChange} className={inputCls}>
                                        <option value="credit">Credit (Unpaid)</option>
                                        <option value="cash">Cash</option>
                                        <option value="bank">Bank Transfer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Amount Paid Now</label>
                                    <input type="number" name="paid_amount" value={form.paid_amount} onChange={handleFormChange} className={inputCls} min="0" max={totalAmount} />
                                </div>
                            </div>
                            {Number(form.paid_amount) < totalAmount && (
                                <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                                    Warning: The remaining balance of PKR {(totalAmount - Number(form.paid_amount)).toLocaleString()} will be added to the supplier's liability ledger.
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col items-end justify-center space-y-1">
                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total Invoice Amount</span>
                            <span className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white pb-3">PKR {totalAmount.toLocaleString()}</span>
                            <button type="submit" disabled={saving || items.length === 0} className="w-full sm:w-auto px-10 py-3.5 bg-gradient-to-r from-sea-600 to-sea-500 hover:from-sea-700 hover:to-sea-600 text-white rounded-xl font-bold shadow-lg shadow-sea-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-lg">
                                {saving ? 'Saving to Database...' : 'Finalize Invoice & Stock'}
                            </button>
                        </div>
                    </div>

                </div>
            </form>
        </div>
    );
}
