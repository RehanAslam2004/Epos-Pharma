import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AppContext } from '../App';

export default function Purchases({ isMerged }) {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useContext(AppContext);
    const navigate = useNavigate();

    useEffect(() => {
        loadPurchases();
    }, []);

    const loadPurchases = async () => {
        setLoading(true);
        try {
            const data = await api.getPurchases();
            setPurchases(data.purchases || []);
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-[80vh]"><div className="w-7 h-7 border-[3px] border-gray-200 dark:border-gray-700 border-t-sea-600 rounded-full animate-spin" /></div>;

    const totalPurchased = purchases.reduce((sum, p) => sum + p.total_amount, 0);
    const totalUnpaid = purchases.reduce((sum, p) => sum + (p.total_amount - p.paid_amount), 0);

    return (
        <div className={`animate-fade-up ${isMerged ? 'p-6' : 'p-6'}`}>
            <div className={`flex items-start mb-6 ${isMerged ? 'justify-end' : 'justify-between'}`}>
                {!isMerged && (
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Purchase Invoices</h1>
                        <p className="text-sm text-gray-400 mt-0.5">Manage your incoming stock and supplier invoices.</p>
                    </div>
                )}
                <div className="flex flex-col items-end gap-3">
                    <button onClick={() => navigate('/purchases/new')} className="px-4 py-2 bg-sea-600 hover:bg-sea-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-sea-500/20 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        New Purchase Invoice
                    </button>
                    <div className="flex gap-4 text-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl text-sm">
                        <div><span className="text-gray-400 text-xs block">Total Logged</span><span className="font-bold text-gray-700 dark:text-gray-200 text-base">PKR {totalPurchased.toLocaleString()}</span></div>
                        <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
                        <div><span className="text-gray-400 text-xs block">Total Payable Debt</span><span className="font-bold text-amber-500 text-base">PKR {totalUnpaid.toLocaleString()}</span></div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                {purchases.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No Purchases Yet</h3>
                        <p className="text-sm mt-1 max-w-sm">When you buy new stock from suppliers, record it here to update your inventory and track open liabilities.</p>
                        <button onClick={() => navigate('/purchases/new')} className="mt-4 px-5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg text-sm transition-colors">Record First Purchase</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 font-semibold border-b border-gray-100 dark:border-gray-700">
                                    <th className="px-5 py-3.5 whitespace-nowrap">Invoice #</th>
                                    <th className="px-5 py-3.5 whitespace-nowrap">Date</th>
                                    <th className="px-5 py-3.5">Supplier</th>
                                    <th className="px-5 py-3.5 text-right">Total Amount</th>
                                    <th className="px-5 py-3.5 text-right">Paid</th>
                                    <th className="px-5 py-3.5 text-center">Status</th>
                                    <th className="px-5 py-3.5 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {purchases.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                        <td className="px-5 py-3 align-middle font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">{p.invoice_number}</td>
                                        <td className="px-5 py-3 align-middle text-gray-500">{new Date(p.date).toLocaleDateString()}</td>
                                        <td className="px-5 py-3 align-middle">
                                            <div className="font-semibold text-gray-800 dark:text-gray-200">{p.supplier_name}</div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-widest">{p.supplier_company}</div>
                                        </td>
                                        <td className="px-5 py-3 align-middle text-right font-bold text-gray-700 dark:text-gray-300">PKR {p.total_amount.toLocaleString()}</td>
                                        <td className="px-5 py-3 align-middle text-right text-gray-500">PKR {p.paid_amount.toLocaleString()}</td>
                                        <td className="px-5 py-3 align-middle text-center">
                                            {p.status === 'paid' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Paid</span>}
                                            {p.status === 'unpaid' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Unpaid</span>}
                                            {p.status === 'partial' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Partial</span>}
                                        </td>
                                        <td className="px-5 py-3 align-middle text-center">
                                            <button onClick={() => navigate(`/purchases/${p.id}`)} className="text-sea-600 hover:text-sea-700 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View Details</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
