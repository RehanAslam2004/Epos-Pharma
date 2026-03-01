import React, { useState, useEffect, useContext } from 'react';
import { api } from '../api';
import { AppContext } from '../App';
import { Wallet, Plus, Trash2, Calendar, FileText, Search } from 'lucide-react';

export default function Expenses({ isMerged }) {
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { addToast } = useContext(AppContext);

    // Form State
    const [form, setForm] = useState({ category: 'Rent', amount: '', reference: '', notes: '', date: new Date().toISOString().slice(0, 16) });
    const categories = ['Rent', 'Utilities', 'Salaries', 'Maintenance', 'Marketing', 'Office Supplies', 'Logistics', 'Other'];

    const loadData = async () => {
        try {
            const [expData, sumData] = await Promise.all([api.getExpenses(), api.getExpenseSummary()]);
            setExpenses(expData);
            setSummary(sumData);
        } catch (err) {
            addToast(err.message || 'Failed to load expenses', 'error');
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.createExpense({ ...form, amount: parseFloat(form.amount) });
            addToast('Expense logged successfully', 'success');
            setShowModal(false);
            setForm({ category: 'Rent', amount: '', reference: '', notes: '', date: new Date().toISOString().slice(0, 16) });
            loadData();
        } catch (err) {
            addToast(err.message || 'Failed to save expense', 'error');
        }
        setSubmitting(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense record?')) return;
        try {
            await api.deleteExpense(id);
            addToast('Expense deleted', 'success');
            loadData();
        } catch (err) { addToast(err.message || 'Failed to delete', 'error'); }
    };

    if (loading) return <div className="flex items-center justify-center h-[80vh]"><div className="w-7 h-7 border-[3px] border-gray-200 border-t-sea-600 rounded-full animate-spin" /></div>;

    const inputCls = "w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sea-500/30 focus:border-sea-500 transition-all";

    return (
        <div className={`animate-fade-up max-w-6xl mx-auto ${isMerged ? 'p-6 pt-6' : 'p-6'}`}>
            {/* Header */}
            <div className={`flex items-start mb-6 ${isMerged ? 'justify-end' : 'justify-between'}`}>
                {!isMerged && (
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2"><Wallet className="text-sea-500" /> Expenses</h1>
                        <p className="text-sm text-gray-400 mt-0.5">Track operational costs and shop expenditures</p>
                    </div>
                )}
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-sea-600 hover:bg-sea-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                    <Plus size={16} strokeWidth={3} /> Record Expense
                </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-5 mb-8">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Today's Expenses</div>
                    <div className="text-2xl font-black text-rose-500">PKR {(summary?.today || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">This Month</div>
                    <div className="text-2xl font-black text-rose-600">PKR {(summary?.thisMonth || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Top Categories (MTD)</div>
                    <div className="space-y-1.5">
                        {summary?.byCategory?.slice(0, 2).map(c => (
                            <div key={c.category} className="flex justify-between text-xs">
                                <span className="text-gray-500 font-medium">{c.category}</span>
                                <span className="text-gray-900 dark:text-white font-bold">{c.value.toLocaleString()} PKR</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3 font-semibold rounded-tl-xl"><div className="flex items-center gap-2"><Calendar size={14} /> Date</div></th>
                                <th className="px-5 py-3 font-semibold">Category</th>
                                <th className="px-5 py-3 font-semibold">Amount (PKR)</th>
                                <th className="px-5 py-3 font-semibold"><div className="flex items-center gap-2"><FileText size={14} /> Reference / Notes</div></th>
                                <th className="px-5 py-3 font-semibold text-right rounded-tr-xl">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {expenses.map((exp) => (
                                <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                    <td className="px-5 py-4 text-gray-900 dark:text-gray-200">{new Date(exp.date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                    <td className="px-5 py-4"><span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md text-xs font-semibold">{exp.category}</span></td>
                                    <td className="px-5 py-4 font-bold text-rose-600">{exp.amount.toLocaleString()}</td>
                                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-300">{exp.reference || '-'}</div>
                                        <div className="text-[11px] truncate max-w-[200px]">{exp.notes || ''}</div>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button onClick={() => handleDelete(exp.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                            {expenses.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-5 py-16 text-center text-gray-400">
                                        <Wallet size={32} className="mx-auto mb-3 opacity-20" />
                                        <div className="text-sm font-medium">No expenses recorded yet</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 overflow-hidden animate-zoom-in">
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-gray-900 dark:text-white">Record Expense</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date & Time</label>
                                    <input type="datetime-local" required className={inputCls} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
                                    <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Amount (PKR)</label>
                                <input type="number" required min="1" step="0.01" className={`${inputCls} text-lg font-bold text-rose-600`} placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Reference / Receipt No.</label>
                                    <input type="text" className={inputCls} placeholder="Optional physical receipt id..." value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
                                    <textarea rows="2" className={inputCls} placeholder="Description..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold transition-colors">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-sea-600 hover:bg-sea-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                                    {submitting ? 'Saving...' : 'Save Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
