import React, { useState, useEffect, useCallback, useContext } from 'react';
import { api } from '../api';
import { AppContext } from '../App';

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editSupplier, setEditSupplier] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [showProducts, setShowProducts] = useState(null);
    const [supplierProducts, setSupplierProducts] = useState([]);
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', company: '', notes: '' });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const { addToast } = useContext(AppContext);

    const load = useCallback(async () => { try { setSuppliers(await api.getSuppliers(search ? `search=${encodeURIComponent(search)}` : '')); } catch { } setLoading(false); }, [search]);
    useEffect(() => { load(); }, [load]);

    function openAdd() { setEditSupplier(null); setForm({ name: '', phone: '', email: '', address: '', company: '', notes: '' }); setFormError(''); setShowModal(true); }
    function openEdit(s) { setEditSupplier(s); setForm({ name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', company: s.company || '', notes: s.notes || '' }); setFormError(''); setShowModal(true); }

    async function handleSave(e) { e.preventDefault(); if (!form.name) { setFormError('Name required'); return; } setSaving(true); setFormError(''); try { if (editSupplier) await api.updateSupplier(editSupplier.id, form); else await api.createSupplier(form); setShowModal(false); load(); addToast(editSupplier ? 'Supplier updated' : 'Supplier added', 'success'); } catch (err) { setFormError(err.message); } setSaving(false); }
    async function handleDelete() { if (!deleteId) return; try { await api.deleteSupplier(deleteId); setDeleteId(null); load(); addToast('Supplier deleted', 'success'); } catch { } }
    async function viewProducts(s) { setShowProducts(s); try { setSupplierProducts(await api.getSupplierProducts(s.id)); } catch { } }

    const inputCls = "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sea-500/30 focus:border-sea-500 transition-all";

    return (
        <div className="p-6 animate-fade-up">
            <div className="flex items-start justify-between mb-5"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Suppliers</h1><p className="text-sm text-gray-400 mt-0.5">Manage suppliers and retailers</p></div>
                <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sea-500 to-sea-700 text-white rounded-lg text-sm font-semibold shadow-sm shadow-sea-500/20">+ Add Supplier</button>
            </div>

            <div className="flex items-center gap-3 mb-4"><div className="relative flex-1 max-w-xs"><svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sea-500/30 focus:border-sea-500 text-gray-900 dark:text-white placeholder-gray-400" /></div></div>

            {loading ? <div className="flex items-center justify-center h-[40vh]"><div className="w-7 h-7 border-[3px] border-gray-200 dark:border-gray-700 border-t-sea-600 rounded-full animate-spin" /></div> : (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"><div className="overflow-auto">
                    <table className="w-full"><thead><tr className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700"><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Company</th><th className="text-left px-4 py-3">Phone</th><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Actions</th></tr></thead>
                        <tbody>{suppliers.length === 0 ? <tr><td colSpan="5" className="text-center py-16 text-gray-300 dark:text-gray-600"><span className="text-3xl block mb-2">🏭</span><span className="text-sm">No suppliers</span></td></tr> : suppliers.map(s => (
                            <tr key={s.id} className="tbl-row border-b border-gray-50 dark:border-gray-700/50 last:border-b-0">
                                <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{s.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{s.company || '—'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{s.phone || '—'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{s.email || '—'}</td>
                                <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => viewProducts(s)} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 text-xs">📦</button><button onClick={() => openEdit(s)} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 text-xs">✏️</button><button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 text-xs">🗑️</button></div></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div></div>
            )}

            {/* Add/Edit */}
            {showModal && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000] animate-fade-in" onClick={() => setShowModal(false)}><div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[95%] max-w-[500px] animate-scale-up" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900 dark:text-white">{editSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2><button onClick={() => setShowModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs">✕</button></div>
                <form onSubmit={handleSave}><div className="px-6 py-5 space-y-3">
                    {formError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{formError}</div>}
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Name *</label><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Company</label><input className={inputCls} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</label><input className={inputCls} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</label><input className={inputCls} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div></div>
                    <div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Address</label><input className={inputCls} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                    <div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</label><input className={inputCls} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                </div><div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600">Cancel</button><button type="submit" disabled={saving} className="px-5 py-2 bg-gradient-to-r from-sea-500 to-sea-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">{saving ? 'Saving...' : editSupplier ? 'Update' : 'Add'}</button></div></form>
            </div></div>}

            {/* Products */}
            {showProducts && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000] animate-fade-in" onClick={() => setShowProducts(null)}><div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[95%] max-w-[650px] max-h-[80vh] overflow-y-auto animate-scale-up" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900 dark:text-white">Products — {showProducts.name}</h2><button onClick={() => setShowProducts(null)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs">✕</button></div>
                {supplierProducts.length === 0 ? <div className="py-10 text-center text-gray-400 text-sm">No linked products</div> : <table className="w-full"><thead><tr className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700"><th className="text-left px-5 py-3">Name</th><th className="text-left px-5 py-3">Brand</th><th className="text-left px-5 py-3">Stock</th><th className="text-left px-5 py-3">Purchase</th><th className="text-left px-5 py-3">Selling</th></tr></thead><tbody>{supplierProducts.map(p => <tr key={p.id} className="tbl-row border-b border-gray-50 dark:border-gray-700/50"><td className="px-5 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{p.name}</td><td className="px-5 py-3 text-sm text-gray-500">{p.brand || '—'}</td><td className="px-5 py-3"><span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${p.stock <= 10 ? 'bg-amber-100 text-amber-600' : 'bg-sea-50 text-sea-700'}`}>{p.stock}</span></td><td className="px-5 py-3 text-sm text-gray-500">PKR {(p.purchase_price || 0).toLocaleString()}</td><td className="px-5 py-3 text-sm text-gray-500">PKR {(p.selling_price || 0).toLocaleString()}</td></tr>)}</tbody></table>}
            </div></div>}

            {/* Delete */}
            {deleteId !== null && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000] animate-fade-in" onClick={() => setDeleteId(null)}><div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[95%] max-w-[380px] animate-scale-up" onClick={e => e.stopPropagation()}><div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700"><h2 className="text-lg font-bold text-gray-900 dark:text-white">Delete Supplier</h2></div><div className="px-6 py-6 text-center text-sm text-gray-500">Delete? Linked products will be unlinked.</div><div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-center gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600">Cancel</button><button onClick={handleDelete} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold">Delete</button></div></div></div>}
        </div>
    );
}
