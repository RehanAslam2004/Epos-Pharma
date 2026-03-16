import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import { AppContext } from '../App';

export default function Inventory() {
    const location = useLocation();
    const defaultFilter = location.state?.defaultFilter || 'all';

    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState(defaultFilter);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [form, setForm] = useState({ name: '', brand: '', batch: '', expiry: '', purchase_price: '', selling_price: '', stock: '', barcode: '', supplier_id: '', category: 'General', description: '', generic_name: '', strength: '', product_form: '', is_narcotic: false, is_prescription_required: false });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const { user, addToast } = useContext(AppContext);

    // Stock Movements State
    const [showMovementsModal, setShowMovementsModal] = useState(false);
    const [stockMovements, setStockMovements] = useState([]);
    const [loadingMovements, setLoadingMovements] = useState(false);

    const load = useCallback(async () => {
        try {
            let p = '';
            if (search) p += `search=${encodeURIComponent(search)}&`;
            if (filter === 'low_stock') p += 'low_stock=true&';
            if (filter === 'expiring') p += 'expiring=true&';
            setProducts(await api.getProducts(p));
        } catch (e) {
            addToast(e.message || 'Failed to load inventory', 'error');
        }
        setLoading(false);
    }, [search, filter]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { api.getSuppliers().then(setSuppliers).catch(() => { }); }, []);

    function openAdd() { setEditProduct(null); setForm({ name: '', brand: '', batch: '', expiry: '', purchase_price: '', selling_price: '', stock: '', barcode: '', supplier_id: '', category: 'General', description: '', generic_name: '', strength: '', product_form: '', is_narcotic: false, is_prescription_required: false }); setFormError(''); setShowModal(true); }
    function openEdit(p) { setEditProduct(p); setForm({ name: p.name, brand: p.brand || '', batch: p.batch || '', expiry: p.expiry ? p.expiry.split('T')[0] : '', purchase_price: p.purchase_price || '', selling_price: p.selling_price || '', stock: p.stock || '', barcode: p.barcode || '', supplier_id: p.supplier_id || '', category: p.category || 'General', description: p.description || '', generic_name: p.generic_name || '', strength: p.strength || '', product_form: p.form || '', is_narcotic: !!p.is_narcotic, is_prescription_required: !!p.is_prescription_required }); setFormError(''); setShowModal(true); }

    async function openMovements() {
        setShowMovementsModal(true);
        setLoadingMovements(true);
        try {
            setStockMovements(await api.getStockMovements());
        } catch (e) {
            addToast('Failed to load stock movements: ' + e.message, 'error');
        }
        setLoadingMovements(false);
    }

    function generateBarcode() {
        const num = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        setForm({ ...form, barcode: num });
    }

    async function handleSave(e) {
        e.preventDefault();
        if (!form.name) { setFormError('Product name is required'); return; }
        setSaving(true); setFormError('');
        try {
            const payload = { ...form, form: form.product_form, purchase_price: parseFloat(form.purchase_price) || 0, selling_price: parseFloat(form.selling_price) || 0, stock: parseInt(form.stock) || 0, supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null };
            if (editProduct) await api.updateProduct(editProduct.id, payload);
            else await api.createProduct(payload);
            setShowModal(false); load();
            addToast(editProduct ? 'Product updated' : 'Product added', 'success');
        } catch (err) { setFormError(err.message); }
        setSaving(false);
    }

    async function handleDelete() { if (!deleteId) return; try { await api.deleteProduct(deleteId); setDeleteId(null); load(); addToast('Product deleted', 'success'); } catch (e) { addToast(e.message, 'error'); } }

    // CSV Export
    function exportCSV() {
        const headers = ['Name', 'Brand', 'Batch', 'Expiry', 'Purchase Price', 'Selling Price', 'Stock', 'Barcode', 'Category'];
        const rows = products.map(p => [p.name, p.brand, p.batch, p.expiry, p.purchase_price, p.selling_price, p.stock, p.barcode, p.category]);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        addToast('CSV exported', 'success');
    }

    // CSV Import
    function importCSV(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const lines = ev.target.result.split('\n').slice(1).filter(l => l.trim());
                let count = 0;
                for (const line of lines) {
                    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
                    if (cols[0]) {
                        await api.createProduct({ name: cols[0], brand: cols[1] || '', batch: cols[2] || '', expiry: cols[3] || '', purchase_price: parseFloat(cols[4]) || 0, selling_price: parseFloat(cols[5]) || 0, stock: parseInt(cols[6]) || 0, barcode: cols[7] || '', category: cols[8] || 'General' });
                        count++;
                    }
                }
                addToast(`Imported ${count} products`, 'success'); load();
            } catch (err) { addToast('Import failed: ' + err.message, 'error'); }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    const inputCls = "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sea-500/30 focus:border-sea-500 transition-all";
    const selectCls = inputCls + " appearance-none bg-no-repeat bg-[right_8px_center] bg-[length:10px]";

    return (
        <div className="p-6 animate-fade-up">
            <div className="flex items-start justify-between mb-5">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Inventory</h1><p className="text-sm text-gray-400 mt-0.5">Manage products and medicines</p></div>
                <div className="flex gap-2">
                    <button onClick={openMovements} className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 transition-all">📋 Movement Log</button>
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-gray-300 cursor-pointer transition-all"><span>📥</span>Import CSV<input type="file" accept=".csv" onChange={importCSV} className="hidden" /></label>
                    <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-gray-300 transition-all">📤 Export</button>
                    <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sea-500 to-sea-700 text-white rounded-lg text-sm font-semibold shadow-sm shadow-sea-500/20 hover:shadow-md transition-all">+ Add Product</button>
                </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-xs">
                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sea-500/30 focus:border-sea-500 text-gray-900 dark:text-white placeholder-gray-400" />
                </div>
                <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 outline-none"><option value="all">All Products</option><option value="low_stock">Low Stock</option><option value="expiring">Expiring Soon</option></select>
            </div>

            {loading ? <div className="flex items-center justify-center h-[40vh]"><div className="w-7 h-7 border-[3px] border-gray-200 dark:border-gray-700 border-t-sea-600 rounded-full animate-spin" /></div> : (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                    <div className="overflow-auto">
                        <table className="w-full">
                            <thead><tr className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Brand</th><th className="text-left px-4 py-3">Batch</th><th className="text-left px-4 py-3">Expiry</th><th className="text-left px-4 py-3">Purchase</th><th className="text-left px-4 py-3">Selling</th><th className="text-left px-4 py-3">Stock</th><th className="text-left px-4 py-3">Barcode</th><th className="text-left px-4 py-3">Actions</th>
                            </tr></thead>
                            <tbody>
                                {products.length === 0 ? <tr><td colSpan="9" className="text-center py-16 text-gray-300 dark:text-gray-600"><span className="text-3xl block mb-2">💊</span><span className="text-sm">No products found</span></td></tr> :
                                    products.map(p => {
                                        const daysToExpiry = p.expiry ? Math.ceil((new Date(p.expiry) - new Date()) / 864e5) : null;
                                        return (
                                            <tr key={p.id} className={`tbl-row border-b border-gray-50 dark:border-gray-700/50 last:border-b-0 ${daysToExpiry !== null && daysToExpiry < 0 ? 'bg-red-50/50 dark:bg-red-900/10' : daysToExpiry !== null && daysToExpiry <= 30 ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                    {p.name}
                                                    {p.generic_name && <div className="text-[10px] text-gray-500 font-normal mt-0.5">{p.generic_name}</div>}
                                                    {p.is_narcotic === 1 && <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[9px] font-bold rounded">NARCOTIC</span>}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{p.brand || '—'}</td>
                                                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{p.batch || '—'}</td>
                                                <td className="px-4 py-3 text-sm">{daysToExpiry === null ? <span className="text-gray-400">—</span> : daysToExpiry < 0 ? <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-semibold rounded-full">Expired</span> : daysToExpiry <= 30 ? <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-semibold rounded-full">{p.expiry?.split('T')[0]}</span> : <span className="text-xs text-gray-500">{p.expiry?.split('T')[0]}</span>}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500">PKR {(p.purchase_price || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">PKR {(p.selling_price || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3">{p.stock <= 0 ? <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-semibold rounded-full">Out</span> : p.stock <= 10 ? <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-semibold rounded-full">{p.stock}</span> : <span className="px-2 py-0.5 bg-sea-50 dark:bg-sea-900/20 text-sea-700 dark:text-sea-400 text-[10px] font-semibold rounded-full">{p.stock}</span>}</td>
                                                <td className="px-4 py-3"><span className="text-[10px] font-mono text-gray-400">{p.barcode || '—'}</span></td>
                                                <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(p)} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-xs">✏️</button>{user?.role === 'admin' && <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors text-xs">🗑️</button>}</div></td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000] animate-fade-in" onClick={() => setShowModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[95%] max-w-[680px] max-h-[85vh] overflow-y-auto animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editProduct ? 'Edit Product' : 'Add Product'}</h2>
                            <button onClick={() => setShowModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs">✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="px-6 py-5 space-y-4">
                                {formError && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-xs">{formError}</div>}
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Product Name *</label><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Panadol 500mg" /></div>
                                    <div><label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Generic Name</label><input className={inputCls} value={form.generic_name} onChange={e => setForm({ ...form, generic_name: e.target.value })} placeholder="e.g. Paracetamol" /></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div><label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Brand</label><input className={inputCls} value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} /></div>
                                    <div><label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Strength</label><input className={inputCls} value={form.strength} onChange={e => setForm({ ...form, strength: e.target.value })} placeholder="e.g. 500mg" /></div>
                                    <div><label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Form</label><input className={inputCls} value={form.product_form} onChange={e => setForm({ ...form, product_form: e.target.value })} placeholder="e.g. Tablet, Syrup" /></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div><label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Category</label><select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{['General', 'Tablets', 'Syrup', 'Injection', 'Cream', 'Drops', 'Capsule', 'Surgical', 'Other'].map(c => <option key={c}>{c}</option>)}</select></div>
                                    <div className="flex items-center gap-2 mt-5">
                                        <input type="checkbox" id="is_prescription_required" checked={form.is_prescription_required} onChange={e => setForm({ ...form, is_prescription_required: e.target.checked })} className="w-4 h-4 text-sea-600 rounded focus:ring-sea-500" />
                                        <label htmlFor="is_prescription_required" className="text-sm text-gray-700 dark:text-gray-300">Requires Prescription</label>
                                    </div>
                                    <div className="flex items-center gap-2 mt-5">
                                        <input type="checkbox" id="is_narcotic" checked={form.is_narcotic} onChange={e => setForm({ ...form, is_narcotic: e.target.checked })} className="w-4 h-4 text-red-600 rounded focus:ring-red-500" />
                                        <label htmlFor="is_narcotic" className="text-sm font-bold text-red-600 dark:text-red-400">Narcotic / Controlled</label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div><label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Batch</label><input className={inputCls} value={form.batch} onChange={e => setForm({ ...form, batch: e.target.value })} placeholder="e.g. B-2026-01" /></div>
                                    <div><label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Expiry Date</label><input className={inputCls} type="date" value={form.expiry} onChange={e => setForm({ ...form, expiry: e.target.value })} /></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div><label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Purchase Price</label><input className={inputCls} type="number" step="0.01" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} /></div>
                                    <div><label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Selling Price</label><input className={inputCls} type="number" step="0.01" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} /></div>
                                    <div><label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Stock</label><input className={inputCls} type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Barcode</label>
                                        <div className="flex gap-2">
                                            <input className={inputCls} value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or Generate" />
                                            <button type="button" onClick={generateBarcode} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors whitespace-nowrap" title="Auto Generate">⚡ Auto</button>
                                        </div>
                                    </div>
                                    <div><label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Supplier</label><select className={inputCls} value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}><option value="">None</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                </div>
                            </div>
                            <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={saving} className="px-5 py-2 bg-gradient-to-r from-sea-500 to-sea-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-all">{saving ? 'Saving...' : editProduct ? 'Update' : 'Add Product'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stock Movements Modal */}
            {showMovementsModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000] animate-fade-in" onClick={() => setShowMovementsModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[95%] max-w-[800px] max-h-[85vh] flex flex-col animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Stock Movement Log</h2>
                            <button onClick={() => setShowMovementsModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs">✕</button>
                        </div>
                        <div className="flex-1 overflow-auto p-0">
                            {loadingMovements ? (
                                <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-[3px] border-gray-200 border-t-sea-600 rounded-full animate-spin" /></div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 border-b border-gray-100 dark:border-gray-700 shadow-sm z-10">
                                        <tr className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Product</th>
                                            <th className="px-4 py-3">Batch</th>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3 text-right">Qty Change</th>
                                            <th className="px-4 py-3">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockMovements.length === 0 ? <tr><td colSpan="6" className="text-center py-10 text-gray-400">No stock movements found</td></tr> :
                                            stockMovements.map(m => (
                                                <tr key={m.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-b-0 text-sm">
                                                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(m.created_at).toLocaleString()}</td>
                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{m.product_name}</td>
                                                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{m.batch_number || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${m.type === 'sale' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : m.type === 'return' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : m.type === 'purchase' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                                            {m.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold font-mono">
                                                        {m.quantity > 0 ? (
                                                            <span className="text-emerald-500">+{m.quantity}</span>
                                                        ) : (
                                                            <span className="text-red-500">{m.quantity}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-400 truncate max-w-[200px]" title={m.notes}>{m.notes}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete */}
            {deleteId !== null && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000] animate-fade-in" onClick={() => setDeleteId(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[95%] max-w-[380px] animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700"><h2 className="text-lg font-bold text-gray-900 dark:text-white">Delete Product</h2></div>
                        <div className="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">Are you sure? This cannot be undone.</div>
                        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-center gap-3">
                            <button onClick={() => setDeleteId(null)} className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400">Cancel</button>
                            <button onClick={handleDelete} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
