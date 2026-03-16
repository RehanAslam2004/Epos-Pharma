import React, { useState, useEffect, useCallback, useContext } from 'react';
import { api } from '../api';
import { AppContext } from '../App';

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Modals
    const [showAddEdit, setShowAddEdit] = useState(false);
    const [showProfile, setShowProfile] = useState(null); // Full supplier object
    const [deleteId, setDeleteId] = useState(null);
    const [showPayment, setShowPayment] = useState(false);

    // Profile Tabs Data
    const [activeTab, setActiveTab] = useState('info'); // info, products, ledger
    const [supplierProducts, setSupplierProducts] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);

    // Forms
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', company: '', ntn: '', balance: 0, notes: '' });
    const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', reference: '' });

    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const { user, addToast } = useContext(AppContext);

    const load = useCallback(async () => {
        setLoading(true);
        try { setSuppliers(await api.getSuppliers(search ? `search=${encodeURIComponent(search)}` : '')); } catch { }
        setLoading(false);
    }, [search]);

    useEffect(() => { load(); }, [load]);

    // Refresh Profile Data
    const loadProfileData = async (supplierId) => {
        if (!supplierId) return;
        setLedgerLoading(true);
        try {
            const [prods, ledg] = await Promise.all([
                api.getSupplierProducts(supplierId),
                api.getSupplierLedger(supplierId)
            ]);
            setSupplierProducts(prods);
            setLedger(ledg.ledger || []);

            // Update profile with fresh balance
            if (showProfile) {
                setShowProfile({ ...showProfile, balance: ledg.supplier?.balance || showProfile.balance });
            }
        } catch (err) { addToast('Failed to load supplier details', 'error'); }
        setLedgerLoading(false);
    };

    function openAdd() { setForm({ name: '', phone: '', email: '', address: '', company: '', ntn: '', balance: 0, notes: '' }); setFormError(''); setShowAddEdit('add'); }
    function openEdit(s) { setForm({ name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', company: s.company || '', ntn: s.ntn || '', balance: s.balance || 0, notes: s.notes || '' }); setFormError(''); setShowAddEdit(s.id); }

    function openProfile(s) {
        setShowProfile(s);
        setActiveTab('info');
        loadProfileData(s.id);
    }

    async function handleSave(e) {
        e.preventDefault();
        if (!form.name) { setFormError('Name required'); return; }
        setSaving(true); setFormError('');
        try {
            if (showAddEdit === 'add') await api.createSupplier(form);
            else await api.updateSupplier(showAddEdit, form);
            setShowAddEdit(false); load(); addToast('Supplier saved successfully', 'success');
        } catch (err) { setFormError(err.message); }
        setSaving(false);
    }

    async function handleDelete() {
        if (!deleteId) return;
        try {
            await api.deleteSupplier(deleteId);
            setDeleteId(null); load(); addToast('Supplier deleted', 'success');
        } catch (err) { setDeleteId(null); addToast(err.message || 'Cannot delete supplier', 'error'); }
    }

    async function handlePayment(e) {
        e.preventDefault();
        if (!paymentForm.amount || Number(paymentForm.amount) <= 0) return addToast('Valid amount required', 'warning');
        setSaving(true);
        try {
            await api.addSupplierPayment(showProfile.id, paymentForm);
            addToast('Payment recorded successfully', 'success');
            setShowPayment(false);
            setPaymentForm({ amount: '', method: 'cash', reference: '' });
            loadProfileData(showProfile.id); // Refresh ledger
            load(); // Refresh main table balances
        } catch (err) { addToast(err.message, 'error'); }
        setSaving(false);
    }

    const inputCls = "w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sea-500/30 transition-all";

    return (
        <div className="p-6 animate-fade-up">
            <div className="flex items-start justify-between mb-5">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Suppliers & Vendors</h1><p className="text-sm text-gray-400 mt-0.5">Manage contacts, outstanding liabilities, and inventory ledgers.</p></div>
                <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sea-500 to-sea-700 text-white rounded-lg text-sm font-semibold shadow-sm shadow-sea-500/20">+ Add Supplier</button>
            </div>

            <div className="flex items-center gap-3 mb-4"><div className="relative flex-1 max-w-xs"><svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sea-500/30 text-gray-900 dark:text-white" /></div></div>

            {loading ? <div className="flex justify-center h-[40vh] items-center"><div className="w-7 h-7 border-[3px] border-sea-600 border-t-white rounded-full animate-spin"></div></div> : (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 font-semibold border-b border-gray-100 dark:border-gray-700">
                                    <th className="px-5 py-3.5">Supplier Name</th>
                                    <th className="px-5 py-3.5">Company / NTN</th>
                                    <th className="px-5 py-3.5">Contact</th>
                                    <th className="px-5 py-3.5 text-right">Outstanding Balance</th>
                                    <th className="px-5 py-3.5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {suppliers.length === 0 ? <tr><td colSpan="5" className="text-center py-16 text-gray-400">No suppliers found</td></tr> : suppliers.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-5 py-3 align-middle font-bold text-gray-800 dark:text-gray-200">{s.name}</td>
                                        <td className="px-5 py-3 align-middle">
                                            <div className="text-gray-700 dark:text-gray-300 font-medium">{s.company || '—'}</div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-widest">{s.ntn ? `NTN: ${s.ntn}` : ''}</div>
                                        </td>
                                        <td className="px-5 py-3 align-middle text-gray-500 font-medium">
                                            <div>{s.phone}</div>
                                            <div className="text-xs">{s.email}</div>
                                        </td>
                                        <td className="px-5 py-3 align-middle text-right">
                                            <span className={`font-bold ${s.balance > 0 ? 'text-amber-500' : 'text-gray-500'}`}>
                                                PKR {s.balance ? s.balance.toLocaleString() : '0'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 align-middle text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button onClick={() => openProfile(s)} className="text-xs font-semibold px-3 py-1.5 bg-sea-50 dark:bg-sea-900/20 text-sea-600 dark:text-sea-400 rounded-lg hover:bg-sea-100 transition-colors">Profile & Ledger</button>
                                                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">✏️</button>
                                                {user?.role === 'admin' && <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">🗑️</button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Comprehensive Profile Modal */}
            {showProfile && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center animate-fade-in" onClick={() => setShowProfile(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[95%] max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50 dark:bg-gray-800/50">
                            <div>
                                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{showProfile.company}</h2>
                                <p className="text-sm font-medium text-gray-500 mt-1">Rep: {showProfile.name} • {showProfile.phone}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Outstanding Liability</div>
                                    <div className={`text-xl font-bold ${showProfile.balance > 0 ? 'text-amber-500' : 'text-sea-500'}`}>PKR {(showProfile.balance || 0).toLocaleString()}</div>
                                </div>
                                {showProfile.balance > 0 && (
                                    <button onClick={() => setShowPayment(true)} className="px-4 py-2 bg-gradient-to-r from-sea-500 to-sea-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-sea-500/30 hover:shadow-sea-500/50 transition-all transform hover:-translate-y-0.5">Pay Balance</button>
                                )}
                                <button onClick={() => setShowProfile(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-600 ml-4 transition-colors">✕</button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 dark:border-gray-700 px-6 pt-2 bg-gray-50 dark:bg-gray-800/50">
                            {[
                                { id: 'info', label: 'Basic Info' },
                                { id: 'ledger', label: 'Financial Ledger' },
                                { id: 'products', label: 'Inventory Stock' }
                            ].map(t => (
                                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === t.id ? 'border-sea-600 text-sea-600 dark:text-sea-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900/20">

                            {/* INFO TAB */}
                            {activeTab === 'info' && (
                                <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                    <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Company Address</span><span className="text-sm font-medium text-gray-800 dark:text-gray-200">{showProfile.address || 'N/A'}</span></div>
                                    <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Tax / NTN</span><span className="text-sm font-medium text-gray-800 dark:text-gray-200">{showProfile.ntn || 'N/A'}</span></div>
                                    <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Email</span><span className="text-sm font-medium text-gray-800 dark:text-gray-200">{showProfile.email || 'N/A'}</span></div>
                                    <div className="col-span-2"><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Internal Notes</span><span className="text-sm font-medium text-gray-600 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl block">{showProfile.notes || 'No notes added.'}</span></div>
                                </div>
                            )}

                            {/* LEDGER TAB */}
                            {activeTab === 'ledger' && (
                                <div>
                                    {ledgerLoading ? <p className="text-sm text-center text-gray-400 py-10">Loading financial history...</p> : (
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 font-semibold text-xs uppercase">
                                                    <th className="py-3 px-2">Date</th><th className="py-3 px-2">Type</th><th className="py-3 px-2">Ref</th><th className="py-3 px-2 text-right">Debit (Buy)</th><th className="py-3 px-2 text-right">Credit (Pay)</th><th className="py-3 px-2 text-right text-gray-800 dark:text-white font-bold">Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                                {ledger.length === 0 ? <tr><td colSpan="6" className="text-center py-10 text-gray-400">No transactions recorded.</td></tr> : ledger.map((entry, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                        <td className="py-3 px-2 text-gray-500">{new Date(entry.date).toLocaleDateString()}</td>
                                                        <td className="py-3 px-2">
                                                            {entry.type === 'purchase' ? <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold">Purchase Ref</span> : <span className="text-xs bg-sea-50 text-sea-600 px-2 py-0.5 rounded-full font-bold">Payment Paid</span>}
                                                        </td>
                                                        <td className="py-3 px-2 font-mono text-xs">{entry.reference}</td>
                                                        <td className="py-3 px-2 text-right text-rose-500 font-medium">{entry.debit ? `+ ${entry.debit.toLocaleString()}` : '-'}</td>
                                                        <td className="py-3 px-2 text-right text-sea-500 font-medium">{entry.credit ? `- ${entry.credit.toLocaleString()}` : '-'}</td>
                                                        <td className="py-3 px-2 text-right font-bold text-gray-800 dark:text-gray-200">PKR {entry.running_balance.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {/* PRODUCTS TAB */}
                            {activeTab === 'products' && (
                                <div>
                                    {ledgerLoading ? <p className="text-sm text-center text-gray-400 py-10">Loading stock...</p> : (
                                        <table className="w-full text-left text-sm">
                                            <thead><tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 font-semibold text-xs uppercase"><th className="py-3 px-2">Medicine</th><th className="py-3 px-2">Current Stock</th><th className="py-3 px-2">Purchase Price</th><th className="py-3 px-2 flex items-center gap-1">Selling Price <span className="text-[10px] lowercase font-normal">(margin)</span></th></tr></thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                                {supplierProducts.length === 0 ? <tr><td colSpan="4" className="text-center py-10 text-gray-400">No inventory linked. Create a Purchase Invoice first.</td></tr> : supplierProducts.map(p => {
                                                    const margin = p.purchase_price ? (((p.selling_price - p.purchase_price) / p.selling_price) * 100).toFixed(1) : 0;
                                                    return (
                                                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                            <td className="py-3 px-2 font-bold text-gray-800 dark:text-gray-200">{p.name} <span className="text-xs text-gray-400 font-normal">({p.brand})</span></td>
                                                            <td className="py-3 px-2"><span className={`px-2 py-0.5 text-xs font-bold rounded ${p.stock <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>{p.stock} units</span></td>
                                                            <td className="py-3 px-2 text-gray-500 font-medium">PKR {p.purchase_price?.toLocaleString()}</td>
                                                            <td className="py-3 px-2 text-sea-600 font-bold">
                                                                PKR {p.selling_price?.toLocaleString()}
                                                                <span className="text-xs text-sea-400 ml-2 font-normal">({margin}%)</span>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* Record Payment Sub-Modal */}
            {showPayment && showProfile && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[3000] flex items-center justify-center animate-fade-in" onClick={() => setShowPayment(false)}>
                    <form onSubmit={handlePayment} className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-[90%] max-w-sm p-6 animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-sea-100 dark:bg-sea-900/30 text-sea-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">💸</div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Record Payment</h3>
                            <p className="text-sm text-gray-500 mt-1">Settle debt with {showProfile.company}</p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200 dark:border-amber-800/50 p-3 rounded-xl flex justify-between items-center text-sm font-bold mb-5">
                            <span>Current Debt:</span><span>PKR {showProfile.balance.toLocaleString()}</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Amount Paying</label>
                                <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} className={inputCls} min="1" max={showProfile.balance} required autoFocus />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Method</label>
                                <select value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })} className={inputCls}>
                                    <option value="cash">Cash</option><option value="bank">Bank Transfer</option><option value="check">Cheque</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Reference / Cheque #</label>
                                <input type="text" value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} className={inputCls} placeholder="Optional proof" />
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button type="button" onClick={() => setShowPayment(false)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-sea-600 text-white font-semibold rounded-xl text-sm shadow-md shadow-sea-500/30 hover:bg-sea-700 transition-colors disabled:opacity-50 flex justify-center items-center">
                                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Submit Payment'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Basic Add/Edit Modal */}
            {showAddEdit !== false && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] animate-fade-in" onClick={() => setShowAddEdit(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[95%] max-w-lg overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700"><h2 className="text-lg font-bold text-gray-900 dark:text-white">{showAddEdit === 'add' ? 'New Supplier' : 'Edit Supplier'}</h2></div>
                        <form onSubmit={handleSave}>
                            <div className="px-6 py-5 space-y-4">
                                {formError && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-200">{formError}</div>}
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Rep Name *</label><input required className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Company</label><input required className={inputCls} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Phone</label><input className={inputCls} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">NTN / Tax ID</label><input className={inputCls} value={form.ntn} onChange={e => setForm({ ...form, ntn: e.target.value })} /></div>
                                </div>
                                {showAddEdit === 'add' && (
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Opening Balance (PKR)</label><input type="number" className={inputCls} value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} placeholder="Initial debt if any" /></div>
                                )}
                                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Address</label><input className={inputCls} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Internal Notes</label><input className={inputCls} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
                                <button type="button" onClick={() => setShowAddEdit(false)} className="px-5 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 transition-colors">Cancel</button>
                                <button type="submit" disabled={saving} className="px-6 py-2 bg-gradient-to-r from-sea-500 to-sea-700 text-white rounded-lg text-sm font-bold shadow-md shadow-sea-500/20 hover:from-sea-600 hover:to-sea-800 disabled:opacity-50 transition-all">{saving ? 'Saving...' : 'Save Supplier'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteId !== null && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[5000] animate-fade-in" onClick={() => setDeleteId(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[95%] max-w-sm overflow-hidden animate-scale-up text-center p-6" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Supplier?</h2>
                        <p className="text-sm text-gray-500 mb-6">This will unlink their products. You cannot delete a supplier if they have purchase histories attached.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 font-semibold rounded-xl text-sm">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-semibold rounded-xl text-sm shadow-md shadow-rose-500/30">Force Delete</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
