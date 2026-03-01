import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function SetupWizard({ onComplete }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [machineId, setMachineId] = useState('');
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        pharmacyName: '',
        ownerName: '',
        phone: '',
        address: '',
        currUsername: 'admin',
        currPassword: '',
        confirmPassword: '',
        licenseKey: ''
    });

    useEffect(() => {
        api.getSetupMachineId().then(res => setMachineId(res.machineId)).catch(console.error);
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const nextStep = () => {
        if (step === 1 && !form.pharmacyName) return setError('Pharmacy Name is required.');
        if (step === 2) {
            if (!form.currUsername || !form.currPassword) return setError('Username and Password are required.');
            if (form.currPassword !== form.confirmPassword) return setError('Passwords do not match.');
        }
        setStep(s => s + 1);
        setError('');
    };

    const prevStep = () => {
        setStep(s => s - 1);
        setError('');
    };

    const copyMachineId = () => {
        navigator.clipboard.writeText(machineId);
        // We'll rely on a small inline confirmation since Toast is above App context
        const btn = document.getElementById('copyBtn');
        if (btn) {
            const old = btn.innerHTML;
            btn.innerHTML = 'Copied!';
            setTimeout(() => btn.innerHTML = old, 2000);
        }
    };

    const handleFinish = async () => {
        setLoading(true);
        setError('');
        try {
            await api.completeSetup(form);
            onComplete();
        } catch (err) {
            setError(err.message || 'Failed to complete setup.');
            setLoading(false);
        }
    };

    const sendEmail = () => {
        const email = 'rehan2004aslam@gmail.com';
        const subject = encodeURIComponent(`EPOS Pharma License Request - ${form.pharmacyName}`);
        const body = encodeURIComponent(`Hello,\n\nPlease generate a license key for my installation.\n\nPharmacy Name: ${form.pharmacyName}\nOwner Name: ${form.ownerName}\n\nMachine ID: ${machineId}\n\nThank you.`);
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    };

    return (
        <div className="flex h-screen w-screen bg-gray-50 dark:bg-gray-900 items-center justify-center p-4">
            <div className="w-full max-w-2xl max-h-[95vh] bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-sea-500/10 border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">

                {/* Header */}
                <div className="bg-gradient-to-r from-sea-600 to-sea-500 p-6 text-white text-center relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                    <div className="flex justify-center mb-3">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-sea-500/20 mb-6 relative">
                            <img src="./icon.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Welcome to EPOS Pharma</h2>
                    <p className="text-sea-100 text-sm mt-1 opacity-90">First-time Setup Wizard</p>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto">

                    {/* Stepper indicator */}
                    <div className="flex items-center justify-center mb-8 gap-2">
                        {[1, 2, 3].map(i => (
                            <React.Fragment key={i}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= i ? 'bg-sea-500 text-white shadow-md shadow-sea-500/30' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                    {i}
                                </div>
                                {i < 3 && <div className={`w-12 h-1 rounded-full ${step > i ? 'bg-sea-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                            </React.Fragment>
                        ))}
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-xl text-sm font-medium flex items-center gap-3 animate-pulse">
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {error}
                        </div>
                    )}

                    {/* Step 1: Pharmacy */}
                    {step === 1 && (
                        <div className="space-y-5 animate-fadeIn">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Pharmacy Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pharmacy Name *</label>
                                    <input type="text" name="pharmacyName" value={form.pharmacyName} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sea-500 focus:border-sea-500 outline-none transition-all dark:text-white" placeholder="EPOS Pharmacy" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner Name</label>
                                    <input type="text" name="ownerName" value={form.ownerName} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sea-500 focus:border-sea-500 outline-none transition-all dark:text-white" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                                    <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sea-500 focus:border-sea-500 outline-none transition-all dark:text-white" placeholder="+92 300 0000000" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                                    <textarea name="address" value={form.address} onChange={handleChange} rows="2" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sea-500 focus:border-sea-500 outline-none transition-all dark:text-white resize-none" placeholder="123 Pharma Street..." />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Admin */}
                    {step === 2 && (
                        <div className="space-y-5 animate-fadeIn">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Create Administrator</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Username *</label>
                                    <input type="text" name="currUsername" value={form.currUsername} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sea-500 focus:border-sea-500 outline-none transition-all dark:text-white" placeholder="admin" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                                    <input type="password" name="currPassword" value={form.currPassword} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sea-500 focus:border-sea-500 outline-none transition-all dark:text-white" placeholder="••••••••" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password *</label>
                                    <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sea-500 focus:border-sea-500 outline-none transition-all dark:text-white" placeholder="••••••••" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: License */}
                    {step === 3 && (
                        <div className="space-y-5 animate-fadeIn">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 text-center">License Activation</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm text-center">Your installation is securely bound to this device.</p>

                            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-center shadow-inner relative">
                                <p className="text-xs uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-2">Your Unique Machine ID</p>
                                <div className="text-xl font-mono text-sea-600 dark:text-sea-400 font-extrabold tracking-widest bg-white dark:bg-gray-800 py-3 rounded-lg border border-gray-100 dark:border-gray-700 mb-4 select-all">
                                    {machineId || 'GENERATING...'}
                                </div>
                                <div className="flex items-center justify-center gap-3">
                                    <button id="copyBtn" onClick={copyMachineId} className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        Copy ID
                                    </button>
                                    <button onClick={sendEmail} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-700 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors shadow-sm">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        Email ID
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col items-center">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Have a license key?</label>
                                <input type="text" name="licenseKey" value={form.licenseKey} onChange={handleChange} className="w-full max-w-sm px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sea-500 focus:border-sea-500 outline-none transition-all dark:text-white text-center font-mono uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:font-sans" placeholder="Entry Key Here (Optional)" maxLength={19} />
                                <p className="text-xs text-gray-400 mt-3 text-center">Leave blank to start your 15-day free trial.</p>
                            </div>

                            <div className="mt-8 flex items-start justify-center gap-3">
                                <input type="checkbox" id="terms" checked={form.agreedToTerms || false} onChange={e => setForm({ ...form, agreedToTerms: e.target.checked })} className="mt-1 w-4 h-4 text-sea-600 bg-gray-100 border-gray-300 rounded focus:ring-sea-500 dark:focus:ring-sea-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                <label htmlFor="terms" className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                                    I agree to the <a href="#" className="font-semibold text-sea-600 dark:text-sea-400 hover:underline">End User License Agreement</a> and understand that my Machine ID is collected to generate a hardware-bound software license.
                                </label>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Controls */}
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
                    {step > 1 ? (
                        <button onClick={prevStep} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-transparent hover:border-gray-300 dark:hover:border-gray-600">Back</button>
                    ) : <div></div>}

                    {step < 3 ? (
                        <button onClick={nextStep} className="px-6 py-2.5 bg-gradient-to-r from-sea-600 to-sea-500 hover:from-sea-700 hover:to-sea-600 text-white rounded-xl font-medium shadow-lg shadow-sea-500/30 transition-all flex items-center gap-2">
                            Next
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    ) : (
                        <button onClick={handleFinish} disabled={loading || !form.agreedToTerms} className="px-6 py-2.5 bg-gradient-to-r from-sea-600 to-sea-500 hover:from-sea-700 hover:to-sea-600 text-white rounded-xl font-medium shadow-lg shadow-sea-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? 'Finalizing Setup...' : (form.licenseKey ? 'Activate License' : 'Start 15-Day Trial')}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
