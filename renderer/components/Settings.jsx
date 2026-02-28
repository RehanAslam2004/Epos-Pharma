import React, { useState, useEffect, useContext } from 'react';
import { api } from '../api';
import { AppContext } from '../App';

export default function Settings() {
    const [tab, setTab] = useState('general');
    const [settings, setSettings] = useState(null);
    const [trial, setTrial] = useState(null);
    const [users, setUsers] = useState([]);
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generalForm, setGeneralForm] = useState({ pharmacy_name: '', phone: '', address: '', email: '', currency: 'PKR', tax_rate: 0 });
    const [licenseKey, setLicenseKey] = useState('');
    const [showUserModal, setShowUserModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [userForm, setUserForm] = useState({ username: '', password: '', full_name: '', role: 'staff' });
    const [userFormError, setUserFormError] = useState('');
    const { addToast, dark, setDark } = useContext(AppContext);

    useEffect(() => {
        Promise.all([api.getSettings(), api.getTrial(), api.getUsers(), api.getBackups()])
            .then(([s, t, u, b]) => { setSettings(s); setTrial(t); setUsers(u); setBackups(b); if (s) setGeneralForm({ pharmacy_name: s.pharmacy_name || '', phone: s.phone || '', address: s.address || '', email: s.email || '', currency: s.currency || 'PKR', tax_rate: s.tax_rate || 0 }); })
            .catch(console.error).finally(() => setLoading(false));
    }, []);

    async function saveGeneral() { setSaving(true); try { await api.updateSettings(generalForm); addToast('Settings saved', 'success'); } catch (e) { addToast(e.message, 'error'); } setSaving(false); }
    async function activateLicense() { if (!licenseKey) { addToast('Enter a key', 'warning'); return; } setSaving(true); try { await api.activateLicense(licenseKey); addToast('License activated!', 'success'); setTrial(await api.getTrial()); } catch (e) { addToast(e.message, 'error'); } setSaving(false); }
    async function createBackup() { setSaving(true); try { await api.createBackup(); addToast('Backup created', 'success'); setBackups(await api.getBackups()); } catch (e) { addToast(e.message, 'error'); } setSaving(false); }
    async function restoreBackup(file) { if (!confirm('Replace database? Restart needed.')) return; try { await api.restoreBackup(file); addToast('Restored. Restart now.', 'success'); } catch (e) { addToast(e.message, 'error'); } }
    function openAddUser() { setEditUser(null); setUserForm({ username: '', password: '', full_name: '', role: 'staff' }); setUserFormError(''); setShowUserModal(true); }
    function openEditUser(u) { setEditUser(u); setUserForm({ username: u.username, password: '', full_name: u.full_name || '', role: u.role || 'staff' }); setUserFormError(''); setShowUserModal(true); }
    async function saveUser(e) { e.preventDefault(); if (!userForm.username) { setUserFormError('Username required'); return; } if (!editUser && !userForm.password) { setUserFormError('Password required'); return; } try { if (editUser) await api.updateUser(editUser.id, userForm); else await api.createUser(userForm); setShowUserModal(false); setUsers(await api.getUsers()); addToast('User saved', 'success'); } catch (e) { setUserFormError(e.message); } }
    async function deleteUser(id) { if (!confirm('Delete user?')) return; try { await api.deleteUser(id); setUsers(await api.getUsers()); addToast('Deleted', 'success'); } catch (e) { addToast(e.message, 'error'); } }

    if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-7 h-7 border-[3px] border-gray-200 dark:border-gray-700 border-t-sea-600 rounded-full animate-spin" /></div>;

    const tabItems = [{ key: 'general', icon: '🏥', label: 'General' }, { key: 'appearance', icon: '🎨', label: 'Appearance' }, { key: 'license', icon: '🔑', label: 'License' }, { key: 'backup', icon: '💾', label: 'Backup' }, { key: 'users', icon: '👥', label: 'Users' }];
    const inputCls = "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sea-500/30 focus:border-sea-500 transition-all";

    return (
        <div className="p-6 animate-fade-up">
            <div className="mb-5"><h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Settings</h1><p className="text-sm text-gray-400 mt-0.5">System configuration</p></div>

            <div className="flex gap-2 mb-5">{tabItems.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${tab === t.key ? 'bg-sea-50 dark:bg-sea-900/20 border-sea-400 text-sea-700 dark:text-sea-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'}`}><span className="text-base">{t.icon}</span>{t.label}</button>)}</div>

            {/* General */}
            {tab === 'general' && <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden animate-fade-up"><div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Pharmacy Information</h3></div><div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Pharmacy Name</label><input className={inputCls} value={generalForm.pharmacy_name} onChange={e => setGeneralForm({ ...generalForm, pharmacy_name: e.target.value })} /></div><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</label><input className={inputCls} value={generalForm.phone} onChange={e => setGeneralForm({ ...generalForm, phone: e.target.value })} /></div></div>
                <div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Address</label><input className={inputCls} value={generalForm.address} onChange={e => setGeneralForm({ ...generalForm, address: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-4"><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</label><input className={inputCls} type="email" value={generalForm.email} onChange={e => setGeneralForm({ ...generalForm, email: e.target.value })} /></div><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Currency</label><select className={inputCls} value={generalForm.currency} onChange={e => setGeneralForm({ ...generalForm, currency: e.target.value })}><option value="PKR">PKR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></div><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Tax Rate (%)</label><input className={inputCls} type="number" step="0.1" value={generalForm.tax_rate} onChange={e => setGeneralForm({ ...generalForm, tax_rate: parseFloat(e.target.value) || 0 })} /></div></div>
                <button onClick={saveGeneral} disabled={saving} className="px-5 py-2 bg-gradient-to-r from-sea-500 to-sea-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60 mt-2">{saving ? 'Saving...' : 'Save Settings'}</button>
            </div></div>}

            {/* Appearance */}
            {tab === 'appearance' && <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden animate-fade-up"><div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Appearance</h3></div><div className="p-5">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div><div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Dark Mode</div><div className="text-xs text-gray-400 mt-0.5">Switch between light and dark theme</div></div>
                    <button onClick={() => setDark(!dark)} className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${dark ? 'bg-sea-600' : 'bg-gray-300'}`}><span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${dark ? 'translate-x-6' : 'translate-x-0.5'}`} /></button>
                </div>
            </div></div>}

            {/* License */}
            {tab === 'license' && <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden animate-fade-up"><div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">License & Activation</h3></div><div className="p-6">

                <div className="mb-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5 relative">
                    <p className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-2">Machine ID</p>
                    <div className="text-lg font-mono text-sea-600 dark:text-sea-400 font-extrabold tracking-widest bg-white dark:bg-gray-800 py-2.5 px-4 rounded-lg border border-gray-100 dark:border-gray-700 mb-3 select-all truncate">
                        {trial?.machine_id || 'LOADING...'}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { navigator.clipboard.writeText(trial?.machine_id || ''); addToast('Machine ID copied successfully', 'success'); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy ID
                        </button>
                        <button onClick={() => {
                            const email = 'rehan2004aslam@gmail.com';
                            const subject = encodeURIComponent(`EPOS Pharma License Request`);
                            const body = encodeURIComponent(`Hello,\n\nPlease generate a license key for my installation.\n\nMachine ID: ${trial?.machine_id || ''}\n\nThank you.`);
                            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
                        }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-700 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors shadow-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> Email ID
                        </button>
                    </div>
                </div>

                {trial?.is_licensed ? <div className="flex flex-col gap-2 bg-sea-50 dark:bg-sea-900/20 border border-sea-200 dark:border-sea-800 text-sea-700 dark:text-sea-400 p-4 rounded-xl text-sm font-medium"><div className="flex items-center gap-2">✅ <span className="font-bold text-base">Activated — Lifetime License</span></div><div className="text-xs opacity-80 mt-1">License Key: <code className="font-mono">{trial.license_key}</code></div><div className="text-[11px] opacity-60">Activated on: {new Date(trial.activation_date).toLocaleString()}</div></div> : <>
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium mb-5 ${trial?.trial_expired ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700'}`}>{trial?.trial_expired ? '⚠️ Trial expired. Activation required.' : `⏳ Trial Active — ${trial?.days_remaining || 0} days remaining`}</div>
                    <div className="max-w-md"><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Enter License Key</label><input className={inputCls + " font-mono tracking-widest"} value={licenseKey} onChange={e => setLicenseKey(e.target.value.toUpperCase())} placeholder="XJ29-XXXX-XXXX-XXXX" maxLength={19} /></div>
                    <button onClick={activateLicense} disabled={saving} className="px-6 py-2.5 bg-gradient-to-r from-sea-500 to-sea-700 hover:from-sea-600 hover:to-sea-800 text-white rounded-lg text-sm font-semibold disabled:opacity-60 mt-3 shadow-md shadow-sea-500/20 transition-all">{saving ? 'Validating...' : 'Activate License'}</button>
                </>}
            </div></div>}

            {/* Backup */}
            {tab === 'backup' && <div className="animate-fade-up space-y-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"><div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Create Backup</h3></div><div className="p-5"><p className="text-sm text-gray-400 mb-4">Full database backup (products, sales, customers, settings).</p><button onClick={createBackup} disabled={saving} className="px-5 py-2 bg-gradient-to-r from-sea-500 to-sea-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">{saving ? 'Creating...' : '💾 Backup Now'}</button></div></div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"><div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">History</h3></div>
                    {backups.length === 0 ? <div className="py-10 text-center text-gray-400 text-sm">No backups</div> : <table className="w-full"><thead><tr className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700"><th className="text-left px-5 py-3">Date</th><th className="text-left px-5 py-3">Size</th><th className="text-left px-5 py-3">Actions</th></tr></thead><tbody>{backups.map(b => <tr key={b.id} className="tbl-row border-b border-gray-50 dark:border-gray-700/50"><td className="px-5 py-3 text-xs text-gray-500">{new Date(b.date).toLocaleString()}</td><td className="px-5 py-3 text-xs text-gray-500">{b.size ? `${(b.size / 1024).toFixed(1)} KB` : '—'}</td><td className="px-5 py-3"><button onClick={() => restoreBackup(b.backup_file)} className="text-xs text-sea-600 hover:text-sea-700 font-medium">🔄 Restore</button></td></tr>)}</tbody></table>}
                </div>
            </div>}

            {/* Users */}
            {tab === 'users' && <div className="animate-fade-up">
                <div className="flex items-center justify-between mb-4"><span className="text-sm text-gray-400">{users.length} user(s)</span><button onClick={openAddUser} className="px-4 py-2 bg-gradient-to-r from-sea-500 to-sea-700 text-white rounded-lg text-sm font-semibold">+ Add User</button></div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"><table className="w-full"><thead><tr className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700"><th className="text-left px-5 py-3">Username</th><th className="text-left px-5 py-3">Full Name</th><th className="text-left px-5 py-3">Role</th><th className="text-left px-5 py-3">Last Login</th><th className="text-left px-5 py-3">Actions</th></tr></thead>
                    <tbody>{users.map(u => <tr key={u.id} className="tbl-row border-b border-gray-50 dark:border-gray-700/50"><td className="px-5 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{u.username}</td><td className="px-5 py-3 text-sm text-gray-500">{u.full_name || '—'}</td><td className="px-5 py-3"><span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${u.role === 'admin' ? 'bg-sea-50 text-sea-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{u.role}</span></td><td className="px-5 py-3 text-xs text-gray-400">{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td><td className="px-5 py-3"><div className="flex gap-1"><button onClick={() => openEditUser(u)} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 text-xs">✏️</button><button onClick={() => deleteUser(u.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 text-xs">🗑️</button></div></td></tr>)}</tbody>
                </table></div>
            </div>}

            {/* User Modal */}
            {showUserModal && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000] animate-fade-in" onClick={() => setShowUserModal(false)}><div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[95%] max-w-[460px] animate-scale-up" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900 dark:text-white">{editUser ? 'Edit User' : 'Add User'}</h2><button onClick={() => setShowUserModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs">✕</button></div>
                <form onSubmit={saveUser}><div className="px-6 py-5 space-y-3">
                    {userFormError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{userFormError}</div>}
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Username *</label><input className={inputCls} value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} /></div><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Full Name</label><input className={inputCls} value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} /></div></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Password {editUser && <span className="text-gray-400 normal-case">(blank = keep)</span>}</label><input className={inputCls} type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} /></div><div><label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Role</label><select className={inputCls} value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}><option value="staff">Staff</option><option value="cashier">Cashier</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div></div>
                </div><div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2"><button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600">Cancel</button><button type="submit" className="px-5 py-2 bg-gradient-to-r from-sea-500 to-sea-700 text-white rounded-lg text-sm font-semibold">{editUser ? 'Update' : 'Create'}</button></div></form>
            </div></div>}
        </div>
    );
}
