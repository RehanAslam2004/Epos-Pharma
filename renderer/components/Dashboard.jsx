import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AppContext } from '../App';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const gradients = [
    { from: '#0aa86b', to: '#15c983' },
    { from: '#3b82f6', to: '#60a5fa' },
    { from: '#f59e0b', to: '#fbbf24' },
    { from: '#ef4444', to: '#f87171' },
];

const StatCard = ({ icon, value, label, idx }) => (
    <div className="gradient-card stat-hover text-white" style={{ '--gc-from': gradients[idx].from, '--gc-to': gradients[idx].to }}>
        <div className="text-3xl mb-1 opacity-80">{icon}</div>
        <div className="text-2xl font-extrabold tracking-tight">{value}</div>
        <div className="text-sm font-medium opacity-80 mt-0.5">{label}</div>
    </div>
);

const tooltipStyle = { background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' };

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [trial, setTrial] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { addToast } = useContext(AppContext);

    const load = async () => {
        try {
            const [d, t] = await Promise.all([api.getDashboard(), api.getTrial()]);
            setData(d); setTrial(t);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, []);

    if (loading) return <div className="flex items-center justify-center h-[80vh]"><div className="w-7 h-7 border-[3px] border-gray-200 dark:border-gray-700 border-t-sea-600 rounded-full animate-spin" /></div>;

    return (
        <div className="p-6 animate-fade-up">
            {/* Trial and Backup Banners */}
            <div className="space-y-3 mb-5">
                {trial && !trial.is_licensed && (
                    <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${trial.trial_expired ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 border border-amber-200 dark:border-amber-800'}`}>
                        <span>{trial.trial_expired ? '⚠️ Trial expired. Activate license.' : `⏳ Trial: ${trial.days_remaining} day${trial.days_remaining !== 1 ? 's' : ''} remaining`}</span>
                        <button onClick={() => navigate('/settings')} className="px-3 py-1.5 bg-sea-600 hover:bg-sea-700 text-white rounded-lg text-xs font-semibold transition-colors">Activate</button>
                    </div>
                )}
                {data?.daysSinceBackup > 7 && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-700 border border-rose-200 dark:border-rose-800">
                        <span className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Data at Risk: Your system has not been backed up in {data.daysSinceBackup === 999 ? 'a very long time' : `${data.daysSinceBackup} days`}.
                        </span>
                        <button onClick={() => navigate('/settings')} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors">Backup Now</button>
                    </div>
                )}
            </div>

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Welcome back! Here's your pharmacy overview.</p>
                </div>
                <div className="text-xs text-gray-400 font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard icon="🛒" value={data?.todaySales || 0} label="Today's Sales" idx={0} />
                <StatCard icon="💰" value={`PKR ${(data?.todayRevenue || 0).toLocaleString()}`} label="Today's Revenue" idx={1} />
                <StatCard icon="📦" value={data?.totalProducts || 0} label="Total Products" idx={2} />
                <StatCard icon="⚠️" value={data?.lowStockCount || 0} label="Low Stock" idx={3} />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                    { icon: '🛒', label: 'New Sale', path: '/pos' },
                    { icon: '➕', label: 'Add Product', path: '/inventory' },
                    { icon: '👤', label: 'Add Customer', path: '/customers' },
                    { icon: '📊', label: 'View Reports', path: '/reports' },
                ].map(a => (
                    <button key={a.label} onClick={() => navigate(a.path)} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-left hover:border-sea-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                        <span className="text-2xl group-hover:scale-110 transition-transform">{a.icon}</span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{a.label}</span>
                    </button>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Revenue Trend</h3>
                        <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">Last 7 days</span>
                    </div>
                    <div className="p-4">
                        {data?.weeklySales?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={data.weeklySales}>
                                    <defs><linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0aa86b" stopOpacity={0.2} /><stop offset="100%" stopColor="#0aa86b" stopOpacity={0} /></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => v.slice(5)} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Area type="monotone" dataKey="revenue" stroke="#0aa86b" strokeWidth={2.5} fill="url(#seaGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <div className="flex flex-col items-center justify-center h-[200px] text-gray-300 dark:text-gray-600"><span className="text-3xl mb-2">📈</span><span className="text-xs">No data yet</span></div>}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Top Products</h3>
                        <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">Last 30 days</span>
                    </div>
                    <div className="p-4">
                        {data?.topProducts?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={data.topProducts}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="product_name" tick={{ fontSize: 9, fill: '#9ca3af' }} interval={0} angle={-15} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Bar dataKey="qty" fill="url(#barGrad)" radius={[6, 6, 0, 0]}>
                                        <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0aa86b" /><stop offset="100%" stopColor="#15c983" /></linearGradient></defs>
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="flex flex-col items-center justify-center h-[200px] text-gray-300 dark:text-gray-600"><span className="text-3xl mb-2">📦</span><span className="text-xs">No data yet</span></div>}
                    </div>
                </div>
            </div>

            {/* Recent Sales */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Recent Sales</h3>
                    <button onClick={() => navigate('/reports')} className="text-xs font-medium text-sea-600 hover:text-sea-700 transition-colors">View All →</button>
                </div>
                {data?.recentSales?.length > 0 ? (
                    <div className="overflow-auto">
                        <table className="w-full">
                            <thead><tr className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                                <th className="text-left px-5 py-3 bg-gray-50 dark:bg-gray-800/50">Sale #</th><th className="text-left px-5 py-3 bg-gray-50 dark:bg-gray-800/50">Customer</th><th className="text-left px-5 py-3 bg-gray-50 dark:bg-gray-800/50">Total</th><th className="text-left px-5 py-3 bg-gray-50 dark:bg-gray-800/50">Payment</th><th className="text-left px-5 py-3 bg-gray-50 dark:bg-gray-800/50">Date</th>
                            </tr></thead>
                            <tbody>{data.recentSales.map(s => (
                                <tr key={s.id} className="tbl-row border-b border-gray-50 dark:border-gray-700/50 last:border-b-0">
                                    <td className="px-5 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">#{s.id}</td>
                                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">{s.customer_name || 'Walk-in'}</td>
                                    <td className="px-5 py-3 text-sm font-bold text-sea-700 dark:text-sea-400">PKR {s.total?.toLocaleString()}</td>
                                    <td className="px-5 py-3"><span className="px-2 py-0.5 bg-sea-50 dark:bg-sea-900/20 text-sea-700 dark:text-sea-400 text-[11px] font-semibold rounded-full">{s.payment_method}</span></td>
                                    <td className="px-5 py-3 text-xs text-gray-400">{new Date(s.date).toLocaleString()}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                ) : <div className="flex flex-col items-center justify-center py-12 text-gray-300 dark:text-gray-600"><span className="text-3xl mb-2">🧾</span><span className="text-xs">No sales yet</span></div>}
            </div>
        </div>
    );
}
