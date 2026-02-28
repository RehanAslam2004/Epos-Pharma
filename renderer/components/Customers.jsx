import React, { useState, useEffect, useCallback, useContext } from 'react';
import { api } from '../api';
import { AppContext } from '../App';

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editCustomer, setEditCustomer] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [showHistory, setShowHistory] = useState(null);
    const [purchases, setPurchases] = useState([]);
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', type: 'walk-in', notes: '' });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const { addToast } = useContext(AppContext);

    const load = useCallback(async () => { try { let p = ''; if (search) p += `search=${encodeURIComponent(search)}&`; if (typeFilter) p += `type=${typeFilter}&`; setCustomers(await api.getCustomers(p)); } catch (e) { } setLoading(false); }, [search, typeFilter]);
    useEffect(() => { load(); }, [load]);

    function openAdd() { setEditCustomer(null); setForm({ name: '', phone: '', email: '', address: '', type: 'walk-in', notes: '' }); setFormError(''); setShowModal(true); }
    function openEdit(c) { setEditCustomer(c); setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', type: c.type || 'walk-in', notes: c.notes || '' }); setFormError(''); setShowModal(true); }

    async function handleSave(e) { e.preventDefault(); if (!form.name) { setFormError('Name required'); return; } setSaving(true); setFormError(''); try { if (editCustomer) await api.updateCustomer(editCustomer.id, form); else await api.createCustomer(form); setShowModal(false); load(); addToast(editCustomer ? 'Customer updated' : 'Customer added', 'success'); } catch (err) { setFormError(err.message); } setSaving(false); }
    async function handleDelete() { if (!deleteId) return; try { await api.deleteCustomer(deleteId); setDeleteId(null); load(); addToast('Customer deleted', 'success'); } catch (e) { } }
    async function viewHistory(c) { setShowHistory(c); try { setPurchases(await api.getCustomerPurchases(c.id)); } catch { } }

    const typeBadge = { 'walk-in': 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400', 'regular': 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400', 'wholesale': 'bg-sea-50 dark:bg-sea-900/20 text-sea-700 dark:text-sea-400' };
    const inputCls = "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sea-500/30 focus:border-sea-500 transition-all";

    return (
        <div className="p-6 animate-fade-up">
            <div className="flex items-start justify-between mb-5"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Customers</h1><p className="text-sm text-gray-400 mt-0.5">Manage customer database</p></div>
                <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sea-500 to-sea-700 text-white rounded-lg text-sm font-semibold shadow-sm shadow-sea-500/20">+ Add Customer</button>
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-xs"><svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sea-500/30 focus:border-sea-500 text-gray-900 dark:text-white placeholder-gray-400" /></div>
                <div className="flex gap-1.5">
                    {['', 'walk-in', 'regular', 'wholesale'].map(t => <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${typeFilter === t ? 'bg-sea-50 dark:bg-sea-900/20 border-sea-400 text-sea-700 dark:text-sea-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'}`}>{t || 'All'}</button>)}
                </div>
            </div>

            {loading ? <div className="flex items-center justify-center h-[40vh]"><div className="w-7 h-7 border-[3px] border-gray-200 dark:border-gray-700 border-t-sea-600 rounded-full animate-spin" /></div> : (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"><div className="overflow-auto">
                    <table className="w-full"><thead><tr className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700"><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Phone</th><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Actions</th></tr></thead>
                        <tbody>{customers.length === 0 ? <tr><td colSpan="5" className="text-center py-16 text-gray-300 dark:text-gray-600"><span className="text-3xl block mb-2">👥</span><span className="text-sm">No customers</span></td></tr> : customers.map(c => (
                            <tr key={c.id} className="tbl-row border-b border-gray-50 dark:border-gray-700/50 last:border-b-0">
                                <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{c.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{c.phone || '—'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{c.email || '—'}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${typeBadge[c.type] || typeBadge['walk-in']}`}>{c.type}</span></td>
                                <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => viewHistory(c)} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 text-xs">📋</button><button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 text-xs">✏️</button><button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 text-xs">🗑️</button></div></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div></div>
            )}

            {/* Modals */}
            {showModal && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000] animate-fade-in" onClick={() => setShowModal(false)}><div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[95%] max-w-[500px] animate-scale-up" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900 dark:text-white">{editCustomer ? 'Edit Customer' : 'Add Customer'}</h2><button onClick={() => setShowModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs">✕</button></div>
                <form onSubmit={handleSave}><div className="px-6 py-5 space-y-3">
                    {formError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 text-xs px-3 py-2 rounded-lg">{formError}</div>}
                    <div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Name *</label><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</label><input className={inputCls} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</label><input className={inputCls} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div></div>
                    <div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Address</label><input className={inputCls} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Type</label><select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="walk-in">Walk-in</option><option value="regular">Regular</option><option value="wholesale">Wholesale</option></select></div><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</label><input className={inputCls} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div></div>
                </div><div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400">Cancel</button><button type="submit" disabled={saving} className="px-5 py-2 bg-gradient-to-r from-sea-500 to-sea-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">{saving ? 'Saving...' : editCustomer ? 'Update' : 'Add'}</button></div></form>
            </div></div>}

            {showHistory && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000] animate-fade-in" onClick={() => setShowHistory(null)}><div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[95%] max-w-[650px] max-h-[80vh] overflow-y-auto animate-scale-up" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900 dark:text-white">Purchases — {showHistory.name}</h2><button onClick={() => setShowHistory(null)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs">✕</button></div>
                {purchases.length === 0 ? <div className="py-10 text-center text-gray-400 text-sm">No history</div> : <table className="w-full"><thead><tr className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700"><th className="text-left px-5 py-3">Date</th><th className="text-left px-5 py-3">Products</th><th className="text-left px-5 py-3">Total</th><th className="text-left px-5 py-3">Payment</th></tr></thead><tbody>{purchases.map(p => <tr key={p.id} className="tbl-row border-b border-gray-50 dark:border-gray-700/50"><td className="px-5 py-3 text-xs text-gray-500">{new Date(p.date).toLocaleDateString()}</td><td className="px-5 py-3 text-xs text-gray-600 truncate max-w-[200px]">{p.products || '—'}</td><td className="px-5 py-3 text-sm font-bold text-sea-700 dark:text-sea-400">PKR {p.total.toLocaleString()}</td><td className="px-5 py-3"><span className="px-2 py-0.5 bg-sea-50 dark:bg-sea-900/20 text-sea-700 dark:text-sea-400 text-[10px] font-semibold rounded-full">{p.payment_method}</span></td></tr>)}</tbody></table>}
            </div></div>}

            {deleteId !== null && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000] animate-fade-in" onClick={() => setDeleteId(null)}><div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[95%] max-w-[380px] animate-scale-up" onClick={e => e.stopPropagation()}><div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700"><h2 className="text-lg font-bold text-gray-900 dark:text-white">Delete Customer</h2></div><div className="px-6 py-6 text-center text-sm text-gray-500">Delete this customer?</div><div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-center gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600">Cancel</button><button onClick={handleDelete} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold">Delete</button></div></div></div>}
        </div>
    );
}
