import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { getToken, removeToken, getUser, setToken, setUser, api } from './api';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import Customers from './components/Customers';
import Suppliers from './components/Suppliers';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Toast from './components/Toast';

// ── Context ──
export const AppContext = createContext();

const sidebarItems = [
    { path: '/', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>), label: 'Dashboard' },
    { path: '/pos', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.5.5-.15 1.35.56 1.35H18m-2.5 3a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>), label: 'Point of Sale' },
    { path: '/inventory', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>), label: 'Inventory' },
    { path: '/customers', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>), label: 'Customers' },
    { path: '/suppliers', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>), label: 'Suppliers' },
    { path: '/reports', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>), label: 'Reports' },
    { path: '/settings', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>), label: 'Settings' },
];

function App() {
    const [authed, setAuthed] = useState(false);
    const [checking, setChecking] = useState(true);
    const [user, setCurrentUser] = useState(null);
    const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
    const [toasts, setToasts] = useState([]);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }, [dark]);

    useEffect(() => { checkSession(); }, []);

    async function checkSession() {
        const token = getToken();
        if (!token) { setChecking(false); return; }
        try {
            const data = await api.checkSession();
            setCurrentUser(data.user);
            setAuthed(true);
        } catch { removeToken(); }
        setChecking(false);
    }

    function handleLogin(data) {
        setToken(data.token); setUser(data.user); setCurrentUser(data.user); setAuthed(true);
    }

    function handleLogout() {
        api.logout().catch(() => { }); removeToken(); setAuthed(false); setCurrentUser(null);
    }

    function addToast(msg, type = 'info') {
        const id = Date.now();
        setToasts(t => [...t, { id, msg, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
    }

    // Check notifications periodically
    useEffect(() => {
        if (!authed) return;
        const check = async () => {
            try {
                const n = await api.getNotifications();
                setNotifications(n || []);
            } catch { }
        };
        check();
        const iv = setInterval(check, 60000);
        return () => clearInterval(iv);
    }, [authed]);

    if (checking) return (
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
            <div className="w-8 h-8 border-[3px] border-gray-200 dark:border-gray-700 border-t-sea-600 rounded-full animate-spin" />
        </div>
    );

    if (!authed) return <Login onLogin={handleLogin} />;

    const ctx = { user, dark, setDark, addToast, notifications };

    return (
        <AppContext.Provider value={ctx}>
            <Router>
                <div className="flex h-screen w-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-hidden">
                    {/* ──── Sidebar ──── */}
                    <aside className="w-[200px] min-w-[200px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full z-50 transition-colors duration-300">
                        {/* Brand */}
                        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-sea-500 to-sea-700 rounded-xl flex items-center justify-center text-white text-lg shadow-md shadow-sea-500/20 flex-shrink-0">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-2V1h-2v2H9V1H7v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3a3 3 0 110 6 3 3 0 010-6zm0 14c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z" /></svg>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">EPOS Pharma</div>
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Pharmacy POS</div>
                            </div>
                        </div>

                        {/* Nav */}
                        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 px-3 py-2 mt-1">Menu</div>
                            {sidebarItems.map(item => (
                                <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) =>
                                    `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group ${isActive
                                        ? 'bg-sea-50 dark:bg-sea-900/20 text-sea-700 dark:text-sea-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-gray-200'
                                    }`
                                }>
                                    {({ isActive }) => (<>
                                        {isActive && <span className="nav-active-bar" />}
                                        <span className={isActive ? 'text-sea-600 dark:text-sea-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}>{item.icon}</span>
                                        {item.label}
                                    </>)}
                                </NavLink>
                            ))}
                        </nav>

                        {/* Footer */}
                        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
                            {/* Dark mode toggle */}
                            <button onClick={() => setDark(!dark)} className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-[13px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all">
                                {dark ? (
                                    <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7a5 5 0 100 10 5 5 0 000-10z" /><path fillRule="evenodd" d="M12 1a1 1 0 011 1v1a1 1 0 11-2 0V2a1 1 0 011-1zM4.22 4.22a1 1 0 011.42 0l.7.7a1 1 0 01-1.42 1.42l-.7-.7a1 1 0 010-1.42zm15.56 0a1 1 0 010 1.42l-.7.7a1 1 0 01-1.42-1.42l.7-.7a1 1 0 011.42 0zM1 12a1 1 0 011-1h1a1 1 0 110 2H2a1 1 0 01-1-1zm19 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM6.34 17.66a1 1 0 010 1.42l-.7.7a1 1 0 01-1.42-1.42l.7-.7a1 1 0 011.42 0zm11.32 0a1 1 0 011.42 0l.7.7a1 1 0 01-1.42 1.42l-.7-.7a1 1 0 010-1.42zM12 20a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" /></svg>
                                ) : (
                                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" /></svg>
                                )}
                                {dark ? 'Light Mode' : 'Dark Mode'}
                            </button>

                            {/* User */}
                            <div className="flex items-center gap-3 px-3 py-2 rounded-lg mt-1">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sea-400 to-sea-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate">{user?.full_name || user?.username}</div>
                                    <div className="text-[10px] text-gray-400 capitalize">{user?.role}</div>
                                </div>
                            </div>

                            {/* Sign Out */}
                            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-[13px] font-medium text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all mt-0.5">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                Sign Out
                            </button>
                        </div>
                    </aside>

                    {/* ──── Main ──── */}
                    <main className="flex-1 min-w-0 overflow-y-auto h-full">
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/pos" element={<POS />} />
                            <Route path="/inventory" element={<Inventory />} />
                            <Route path="/customers" element={<Customers />} />
                            <Route path="/suppliers" element={<Suppliers />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>

                    {/* ──── Toasts ──── */}
                    <Toast toasts={toasts} />
                </div>
            </Router>
        </AppContext.Provider>
    );
}

export default App;
