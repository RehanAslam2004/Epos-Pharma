import React, { useState } from 'react';
import { api } from '../api';

export default function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!username || !password) { setError('Please enter your credentials'); return; }
        setLoading(true); setError('');
        try { onLogin(await api.login(username, password)); }
        catch (err) { setError(err.message || 'Invalid credentials'); }
        setLoading(false);
    }

    return (
        <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-900">
            {/* Left: Gradient Panel */}
            <div className="flex w-2/5 bg-gradient-to-br from-sea-500 via-sea-600 to-sea-800 relative overflow-hidden flex-col justify-between p-10">
                {/* Pattern overlay */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.12'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/svg%3E")` }} />

                <div className="relative z-10">
                    {/* Brand */}
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-11 h-11 rounded-xl overflow-hidden shadow-lg shadow-black/10">
                            <img src="./icon.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">EPOS Pharma</span>
                    </div>

                    {/* Heading */}
                    <h1 className="text-3xl font-extrabold text-white leading-tight mb-4">Modern Pharmacy<br />Management</h1>
                    <p className="text-sea-100 text-base max-w-sm leading-relaxed">Streamline your pharmacy operations with our intelligent POS system. Built for speed, designed for simplicity.</p>

                    {/* Features */}
                    <div className="mt-10 space-y-3">
                        {[
                            { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>, text: 'Inventory Management' },
                            { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.5.5-.15 1.35.56 1.35H18m-2.5 3a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>, text: 'Fast Point of Sale' },
                            { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, text: 'Real-time Analytics' },
                        ].map((f, i) => (
                            <div key={i} className="flex items-center gap-3 text-white/80 text-sm">
                                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">{f.icon}</div>
                                {f.text}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 text-white/50 text-xs">© 2026 EPOS Pharma. All rights reserved.</div>

                {/* Decorative */}
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/5 rounded-full" />
                <div className="absolute top-1/3 -left-12 w-40 h-40 bg-white/5 rounded-full" />
            </div>

            {/* Right: Login Form */}
            <div className="flex-1 flex items-center justify-center px-8">
                <div className="w-full max-w-[380px] animate-fade-up">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Welcome back</h2>
                    <p className="text-gray-400 text-sm mb-8">Sign in to your pharmacy account</p>

                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-5 animate-fade-in">
                            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" /></svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Username</label>
                            <div className="relative">
                                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                <input className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-sea-500/30 focus:border-sea-500 outline-none transition-all" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" autoFocus />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Password</label>
                            <div className="relative">
                                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                <input className="w-full pl-10 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-sea-500/30 focus:border-sea-500 outline-none transition-all" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
                                <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5" onClick={() => setShowPw(!showPw)}>
                                    {showPw ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-sea-600 focus:ring-sea-500 dark:border-gray-600 dark:bg-gray-700" />
                                <span className="text-sm text-gray-500">Remember me</span>
                            </label>
                        </div>

                        <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-sea-500 to-sea-700 hover:from-sea-600 hover:to-sea-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-sea-500/25 hover:shadow-sea-500/40 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
                            {loading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center mt-6 text-xs text-gray-400">Default: <span className="font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">admin</span> / <span className="font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">admin123</span></p>
                </div>
            </div>
        </div>
    );
}
