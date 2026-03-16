import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AppContext } from '../App';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingCart, Package, Users as UsersIcon, Factory, Receipt, BarChart3, CircleDollarSign, TrendingUp } from 'lucide-react';

const COLORS = ['#6366f1', '#14b8a6', '#f43f5e', '#f59e0b', '#8b5cf6'];

const StatCard = ({ title, value, subtitle, data, dataKey, color, onClick }) => {
    // Recharts requires at least 2 points with distinct X values to draw a line.
    let plotData = data;
    if (data?.length === 1) {
        plotData = [
            { ...data[0], day: data[0].day + ' ' },
            data[0]
        ];
    }

    return (
        <div onClick={onClick} className={`bg-white dark:bg-gray-800 border ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''} border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex justify-between items-center transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600`}>
            <div>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{title}</h3>
                <div className="text-2xl font-extrabold" style={{ color: color }}>{value}</div>
                <div className="text-xs text-gray-400 mt-1 font-medium">{subtitle}</div>
            </div>
            {plotData && plotData.length > 0 && (
                <div className="w-[90px] h-[50px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={plotData}>
                            <defs>
                                <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#grad-${title.replace(/\s+/g, '')})`} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

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

    const navigateToInventory = (filter) => navigate(`/inventory`, { state: { defaultFilter: filter } });

    const padWeeklyData = (weeklySales) => {
        if (!weeklySales) return [];
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const existing = weeklySales.find(s => s.day === dateStr);
            days.push(existing || { day: dateStr, revenue: 0, sales: 0, avg_sale: 0 });
        }
        return days;
    };

    const paddedWeekly = padWeeklyData(data?.weeklySales);

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

            {/* Stat cards style from Image 1 */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard title="MONTH REVENUE" value={`PKR ${(data?.monthRevenue || 0).toLocaleString()}`} subtitle="Gross volume month" data={paddedWeekly} dataKey="revenue" color="#6366f1" />
                <StatCard title="MONTH PROFIT" value={`PKR ${((data?.monthRevenue || 0) - (data?.monthExpenses || 0)).toLocaleString()}`} subtitle="Revenue minus Expenses" data={paddedWeekly} dataKey="revenue" color="#10b981" />
                <StatCard title="EXPIRING SOON" value={data?.expiringSoonCount || 0} subtitle="Items expiring in 60 days" color={data?.expiringSoonCount > 0 ? '#f43f5e' : '#f59e0b'} onClick={() => navigateToInventory('expiring')} />
                <StatCard title="WARNING PRODUCTS" value={data?.lowStockCount || 0} subtitle="Items low on stock" color={data?.lowStockCount > 0 ? '#f43f5e' : '#f59e0b'} onClick={() => navigateToInventory('low_stock')} />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-6 gap-3 mb-6">
                {[
                    { icon: <ShoppingCart size={28} strokeWidth={1.5} className="text-sea-600 dark:text-sea-400" />, label: 'New Sale', path: '/pos' },
                    { icon: <Package size={28} strokeWidth={1.5} className="text-amber-500" />, label: 'Inventory', path: '/inventory' },
                    { icon: <UsersIcon size={28} strokeWidth={1.5} className="text-blue-500" />, label: 'Customers', path: '/customers' },
                    { icon: <Factory size={28} strokeWidth={1.5} className="text-purple-500" />, label: 'Suppliers', path: '/suppliers' },
                    { icon: <Receipt size={28} strokeWidth={1.5} className="text-emerald-500" />, label: 'Purchases', path: '/purchases' },
                    { icon: <BarChart3 size={28} strokeWidth={1.5} className="text-rose-500" />, label: 'Reports', path: '/reports' },
                ].map(a => (
                    <button key={a.label} onClick={() => navigate(a.path)} className="flex flex-col items-center justify-center gap-2 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-center hover:border-sea-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                        <span className="text-2xl group-hover:scale-110 transition-transform">{a.icon}</span>
                        <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{a.label}</span>
                    </button>
                ))}
            </div>

            {/* Main Graphs Block matching Image 2 */}
            <div className="grid grid-cols-3 gap-6 mb-4">

                {/* Donut Chart: Top Sales Product */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5 flex flex-col shadow-sm">
                    <div className="text-center mb-2">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Top Sales Product</h3>
                        <p className="text-[10px] font-medium text-gray-400 mt-0.5">Last 30 days</p>
                    </div>
                    <div className="h-[160px] w-full mt-2">
                        {data?.topProducts?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.topProducts} dataKey="qty" nameKey="product_name" cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} stroke="none">
                                        {data.topProducts.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ ...tooltipStyle, border: 'none', borderRadius: '16px', fontWeight: 'bold' }} formatter={(value) => [`${value} units`, 'Sold']} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <div className="flex items-center justify-center h-full text-xs font-medium text-gray-400">No data</div>}
                    </div>
                    {/* Custom Legend */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2 mt-2">
                        {data?.topProducts?.map((p, i) => (
                            <div key={i} className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                                    <span className="text-gray-600 dark:text-gray-300 font-medium truncate leading-tight">{p.product_name}</span>
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white shrink-0">{((p.qty / data.topProducts.reduce((a, b) => a + b.qty, 0)) * 100).toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bar Chart: Weekly Sales Report */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5 flex flex-col shadow-sm col-span-2">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Weekly Sales Report</h3>
                            <p className="text-[11px] font-medium text-gray-400 mt-1">Last 7 days performance</p>
                        </div>
                        <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-full">Revenue (PKR)</span>
                    </div>
                    <div className="h-[180px] w-full mt-2">
                        {data?.weeklySales?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.weeklySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }} tickFormatter={v => v.slice(5).replace('-', '/')} axisLine={{ stroke: '#e5e7eb', strokeWidth: 2 }} tickLine={false} tickMargin={8} />
                                    <YAxis tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }} axisLine={false} tickLine={false} tickMargin={8} tickFormatter={v => (v >= 1000 ? (v / 1000) + 'k' : v)} />
                                    <Tooltip contentStyle={{ ...tooltipStyle, border: 'none', borderRadius: '12px' }} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                                    <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 6, 6]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="flex items-center justify-center h-full text-sm font-medium text-gray-400">No data</div>}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-3 gap-6">
                {/* Revenue Overview Cards */}
                <div className="grid grid-rows-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 flex flex-col justify-center relative overflow-hidden shadow-sm">
                        <div className="absolute top-4 right-4 text-gray-300 dark:text-gray-600"><CircleDollarSign size={28} strokeWidth={1.5} /></div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sales Revenue</h3>
                        <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-2">{(data?.monthRevenue || 0).toLocaleString()} PKR</div>
                        <div className="text-[11px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md inline-block self-start">+ MTD Volume</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 flex flex-col justify-center relative overflow-hidden shadow-sm">
                        <div className="absolute top-4 right-4 text-gray-300 dark:text-gray-600"><TrendingUp size={28} strokeWidth={1.5} /></div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Deals Today</h3>
                        <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-2">{data?.todaySales || 0}</div>
                        <div className="text-[11px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md inline-block self-start">Active Customers Today</div>
                    </div>
                </div>

                {/* Recent Sales Table */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl overflow-hidden shadow-sm col-span-2 flex flex-col">
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Recent Sales</h3>
                        <button onClick={() => navigate('/reports')} className="text-xs font-bold text-sea-600 hover:text-sea-700 transition-colors">View All →</button>
                    </div>
                    {data?.recentSales?.length > 0 ? (
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                    <th className="px-6 py-3">Sale #</th><th className="px-6 py-3">Customer</th><th className="px-6 py-3">Payment</th><th className="px-6 py-3">Date</th><th className="px-6 py-3 text-right">Total</th>
                                </tr></thead>
                                <tbody>{data.recentSales.map(s => (
                                    <tr key={s.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                                        <td className="px-6 py-4 text-sm font-bold text-gray-800 dark:text-gray-200">#{s.id}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400">{s.customer_name || 'Walk-in'}</td>
                                        <td className="px-6 py-4"><span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-md uppercase tracking-wide">{s.payment_method}</span></td>
                                        <td className="px-6 py-4 text-xs font-medium text-gray-500">{new Date(s.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm font-black text-indigo-600 dark:text-indigo-400 text-right">PKR {s.total?.toLocaleString()}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    ) : <div className="flex flex-col items-center justify-center py-12 text-gray-300 dark:text-gray-600"><span className="text-3xl mb-3">🧾</span><span className="text-sm font-medium">No sales yet</span></div>}
                </div>
            </div>
        </div>
    );
}
