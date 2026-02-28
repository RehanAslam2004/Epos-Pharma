import React, { useState, useEffect, useContext } from 'react';
import { api } from '../api';
import { AppContext } from '../App';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#0aa86b', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const tooltipStyle = { background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' };

export default function Reports() {
    const [tab, setTab] = useState('sales');
    const [period, setPeriod] = useState('month');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [salesData, setSalesData] = useState(null);
    const [inventoryData, setInventoryData] = useState(null);
    const [customerData, setCustomerData] = useState(null);
    const [supplierData, setSupplierData] = useState(null);
    const [paymentData, setPaymentData] = useState(null);
    const [loading, setLoading] = useState(false);
    const { addToast } = useContext(AppContext);

    useEffect(() => { loadReport(); }, [tab, period]);

    async function loadReport() {
        setLoading(true);
        try {
            if (tab === 'sales') { let p = `period=${period}`; if (fromDate && toDate) p = `from=${fromDate}&to=${toDate}`; setSalesData(await api.getSalesReport(p)); }
            else if (tab === 'inventory') setInventoryData(await api.getInventoryReport());
            else if (tab === 'customers') setCustomerData(await api.getCustomerReport());
            else if (tab === 'suppliers') setSupplierData(await api.getSupplierReport());
            else if (tab === 'payments') { let p = ''; if (fromDate && toDate) p = `from=${fromDate}&to=${toDate}`; setPaymentData(await api.getPaymentReport(p)); }
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    function exportCSV(headers, rows, filename) {
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        addToast('CSV exported', 'success');
    }

    const tabs = [{ key: 'sales', icon: '📊', label: 'Sales' }, { key: 'inventory', icon: '📦', label: 'Inventory' }, { key: 'customers', icon: '👥', label: 'Customers' }, { key: 'suppliers', icon: '🏭', label: 'Suppliers' }, { key: 'payments', icon: '💳', label: 'Payments' }];
    const inputCls = "px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sea-500/30 focus:border-sea-500";

    return (
        <div className="p-6 animate-fade-up">
            <div className="flex items-start justify-between mb-5"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Reports</h1><p className="text-sm text-gray-400 mt-0.5">Business insights & analytics</p></div></div>

            {/* Tabs */}
            <div className="flex gap-2 mb-5">
                {tabs.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${tab === t.key ? 'bg-sea-50 dark:bg-sea-900/20 border-sea-400 text-sea-700 dark:text-sea-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'}`}><span className="text-base">{t.icon}</span>{t.label}</button>)}
            </div>

            {/* Date filters for sales */}
            {tab === 'sales' && <div className="flex items-center gap-3 mb-4 flex-wrap">
                <select className={inputCls} style={{ width: 130 }} value={period} onChange={e => setPeriod(e.target.value)}><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="year">This Year</option></select>
                <span className="text-gray-400 text-xs">or</span>
                <input type="date" className={inputCls} style={{ width: 140 }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
                <span className="text-gray-400 text-xs">to</span>
                <input type="date" className={inputCls} style={{ width: 140 }} value={toDate} onChange={e => setToDate(e.target.value)} />
                {fromDate && toDate && <button onClick={loadReport} className="px-3 py-2 bg-sea-600 text-white rounded-lg text-xs font-semibold hover:bg-sea-700 transition-colors">Apply</button>}
            </div>}

            {loading ? <div className="flex items-center justify-center h-[40vh]"><div className="w-7 h-7 border-[3px] border-gray-200 dark:border-gray-700 border-t-sea-600 rounded-full animate-spin" /></div> : <div className="animate-fade-up">

                {/* Sales Tab */}
                {tab === 'sales' && salesData && <>
                    <div className="grid grid-cols-4 gap-4 mb-5">
                        {[{ v: salesData.summary?.total_sales || 0, l: 'Total Sales', c: 'from-sea-500 to-sea-700', i: '🛒' },
                        { v: `PKR ${(salesData.summary?.total_revenue || 0).toLocaleString()}`, l: 'Revenue', c: 'from-blue-500 to-blue-600', i: '💰' },
                        { v: `PKR ${Math.round(salesData.summary?.avg_sale || 0).toLocaleString()}`, l: 'Avg Sale', c: 'from-amber-500 to-amber-600', i: '📊' },
                        { v: `PKR ${(salesData.summary?.total_discount || 0).toLocaleString()}`, l: 'Discounts', c: 'from-red-500 to-red-600', i: '🏷️' },
                        ].map((s, i) => <div key={i} className={`relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br ${s.c}`}><div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" /><div className="text-2xl mb-1 opacity-80">{s.i}</div><div className="text-xl font-extrabold">{s.v}</div><div className="text-xs opacity-80 mt-0.5">{s.l}</div></div>)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"><div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex justify-between"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Revenue Trend</h3><button onClick={() => exportCSV(['Day', 'Sales', 'Revenue'], (salesData.dailyData || []).map(d => [d.day, d.sales, d.revenue]), 'sales_trend')} className="text-[10px] text-gray-400 hover:text-sea-600 transition-colors">📥 CSV</button></div><div className="p-4">{salesData.dailyData?.length > 0 ? <ResponsiveContainer width="100%" height={220}><AreaChart data={salesData.dailyData}><defs><linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0aa86b" stopOpacity={0.2} /><stop offset="100%" stopColor="#0aa86b" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => v.slice(5)} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Area type="monotone" dataKey="revenue" stroke="#0aa86b" strokeWidth={2.5} fill="url(#sGrad)" /></AreaChart></ResponsiveContainer> : <div className="flex items-center justify-center h-[220px] text-gray-300"><span className="text-sm">No data</span></div>}</div></div>
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"><div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Top Products</h3></div><div className="p-4">{salesData.topProducts?.length > 0 ? <ResponsiveContainer width="100%" height={220}><BarChart data={salesData.topProducts}><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="product_name" tick={{ fontSize: 9, fill: '#9ca3af' }} interval={0} angle={-15} textAnchor="end" height={55} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="total_revenue" fill="#0aa86b" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="flex items-center justify-center h-[220px] text-gray-300"><span className="text-sm">No data</span></div>}</div></div>
                    </div>
                </>}

                {/* Inventory Tab */}
                {tab === 'inventory' && inventoryData && <>
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="bg-gradient-to-br from-sea-500 to-sea-700 rounded-2xl p-5 text-white"><div className="text-2xl mb-1 opacity-80">💰</div><div className="text-xl font-extrabold">PKR {(inventoryData.totalValue?.sell_value || 0).toLocaleString()}</div><div className="text-xs opacity-80 mt-0.5">Inventory Value (Selling)</div></div>
                        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white"><div className="text-2xl mb-1 opacity-80">📦</div><div className="text-xl font-extrabold">PKR {(inventoryData.totalValue?.cost_value || 0).toLocaleString()}</div><div className="text-xs opacity-80 mt-0.5">Investment (Cost)</div></div>
                    </div>
                    {inventoryData.categoryBreakdown?.length > 0 && <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden mb-5"><div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Categories</h3></div><div className="p-4"><ResponsiveContainer width="100%" height={200}><BarChart data={inventoryData.categoryBreakdown}><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="category" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" fill="#0aa86b" radius={[6, 6, 0, 0]} name="Products" /><Bar dataKey="total_stock" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Stock" /></BarChart></ResponsiveContainer></div></div>}
                    <div className="grid grid-cols-2 gap-4">
                        {[{ title: '⚠️ Low Stock', items: inventoryData.lowStock, cols: ['Name', 'Stock', 'Price'], render: p => [p.name, p.stock, `PKR ${p.selling_price}`], badgeCls: 'bg-amber-100 text-amber-600' },
                        { title: '🚨 Expired', items: inventoryData.expired, cols: ['Name', 'Expiry', 'Stock'], render: p => [p.name, p.expiry?.split('T')[0], p.stock], badgeCls: 'bg-red-100 text-red-600' }
                        ].map((sec, i) => <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"><div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex justify-between"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{sec.title} ({sec.items?.length || 0})</h3></div><div className="max-h-[240px] overflow-y-auto">{sec.items?.length > 0 ? <table className="w-full"><thead><tr className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">{sec.cols.map(c => <th key={c} className="text-left px-4 py-2">{c}</th>)}</tr></thead><tbody>{sec.items.map(p => <tr key={p.id} className="tbl-row border-b border-gray-50 dark:border-gray-700/50"><td className="px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200">{sec.render(p)[0]}</td><td className="px-4 py-2"><span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${sec.badgeCls}`}>{sec.render(p)[1]}</span></td><td className="px-4 py-2 text-sm text-gray-500">{sec.render(p)[2]}</td></tr>)}</tbody></table> : <div className="py-8 text-center text-gray-400 text-sm">None 🎉</div>}</div></div>)}
                    </div>
                </>}

                {/* Customers Tab */}
                {tab === 'customers' && customerData && <>
                    {customerData.typeBreakdown?.length > 0 && <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden mb-5"><div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Customer Segments</h3></div><div className="p-4 flex justify-center"><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={customerData.typeBreakdown} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={65} innerRadius={35} label={{ fontSize: 11 }}>{customerData.typeBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer></div></div>}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"><div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex justify-between"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Top Customers</h3><button onClick={() => exportCSV(['Name', 'Phone', 'Type', 'Purchases', 'Spent'], (customerData.topCustomers || []).map(c => [c.name, c.phone, c.type, c.purchase_count, c.total_spent]), 'top_customers')} className="text-[10px] text-gray-400 hover:text-sea-600 transition-colors">📥 CSV</button></div>
                        {customerData.topCustomers?.length > 0 ? <table className="w-full"><thead><tr className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700"><th className="text-left px-5 py-3">Name</th><th className="text-left px-5 py-3">Phone</th><th className="text-left px-5 py-3">Type</th><th className="text-left px-5 py-3">Purchases</th><th className="text-left px-5 py-3">Spent</th></tr></thead><tbody>{customerData.topCustomers.map(c => <tr key={c.id} className="tbl-row border-b border-gray-50 dark:border-gray-700/50"><td className="px-5 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{c.name}</td><td className="px-5 py-3 text-sm text-gray-500">{c.phone || '—'}</td><td className="px-5 py-3"><span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[10px] font-semibold rounded-full">{c.type}</span></td><td className="px-5 py-3 text-sm text-gray-600">{c.purchase_count}</td><td className="px-5 py-3 text-sm font-bold text-sea-700 dark:text-sea-400">PKR {(c.total_spent || 0).toLocaleString()}</td></tr>)}</tbody></table> : <div className="py-10 text-center text-gray-400 text-sm">No data</div>}
                    </div>
                </>}

                {/* Suppliers Tab */}
                {tab === 'suppliers' && supplierData && <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"><div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex justify-between"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Supplier Summary</h3><button onClick={() => exportCSV(['Name', 'Company', 'Phone', 'Products', 'Investment'], (supplierData.supplierStats || []).map(s => [s.name, s.company, s.phone, s.product_count, s.total_investment]), 'suppliers')} className="text-[10px] text-gray-400 hover:text-sea-600 transition-colors">📥 CSV</button></div>
                    {supplierData.supplierStats?.length > 0 ? <table className="w-full"><thead><tr className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700"><th className="text-left px-5 py-3">Name</th><th className="text-left px-5 py-3">Company</th><th className="text-left px-5 py-3">Products</th><th className="text-left px-5 py-3">Investment</th></tr></thead><tbody>{supplierData.supplierStats.map(s => <tr key={s.id} className="tbl-row border-b border-gray-50 dark:border-gray-700/50"><td className="px-5 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{s.name}</td><td className="px-5 py-3 text-sm text-gray-500">{s.company || '—'}</td><td className="px-5 py-3"><span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[10px] font-semibold rounded-full">{s.product_count}</span></td><td className="px-5 py-3 text-sm font-bold text-sea-700 dark:text-sea-400">PKR {(s.total_investment || 0).toLocaleString()}</td></tr>)}</tbody></table> : <div className="py-10 text-center text-gray-400 text-sm">No data</div>}
                </div>}

                {/* Payments Tab */}
                {tab === 'payments' && paymentData && paymentData.paymentBreakdown?.length > 0 && <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"><div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Payment Distribution</h3></div><div className="p-4"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={paymentData.paymentBreakdown} dataKey="total" nameKey="payment_method" cx="50%" cy="50%" outerRadius={70} innerRadius={40} label={{ fontSize: 11 }}>{paymentData.paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer></div></div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"><div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Breakdown</h3></div><table className="w-full"><thead><tr className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700"><th className="text-left px-5 py-3">Method</th><th className="text-left px-5 py-3">Count</th><th className="text-left px-5 py-3">Total</th></tr></thead><tbody>{paymentData.paymentBreakdown.map((p, i) => <tr key={i} className="tbl-row border-b border-gray-50 dark:border-gray-700/50"><td className="px-5 py-3"><span className="px-2 py-0.5 bg-sea-50 dark:bg-sea-900/20 text-sea-700 dark:text-sea-400 text-[10px] font-semibold rounded-full">{p.payment_method}</span></td><td className="px-5 py-3 text-sm text-gray-600">{p.count}</td><td className="px-5 py-3 text-sm font-bold text-sea-700 dark:text-sea-400">PKR {(p.total || 0).toLocaleString()}</td></tr>)}</tbody></table></div>
                </div>}
            </div>}
        </div>
    );
}
