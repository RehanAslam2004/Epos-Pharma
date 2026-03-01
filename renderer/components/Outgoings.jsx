import React, { useState } from 'react';
import Purchases from './Purchases';
import Expenses from './Expenses';
import { Wallet, Receipt } from 'lucide-react';

export default function Outgoings() {
    const [activeTab, setActiveTab] = useState('purchases');

    return (
        <div className="flex flex-col h-full">
            {/* Unified Header with Tabs */}
            <div className="px-6 pt-6 pb-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
                <div className="flex items-end justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Finances & Outgoings</h1>
                        <p className="text-sm text-gray-400 mt-0.5">Manage supplier invoices and operational expenses in one place.</p>
                    </div>
                </div>
                <div className="flex gap-6">
                    <button onClick={() => setActiveTab('purchases')} className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'purchases' ? 'border-sea-600 text-sea-600 dark:text-sea-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        <Receipt size={16} /> Supplier Purchases
                    </button>
                    <button onClick={() => setActiveTab('expenses')} className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'expenses' ? 'border-sea-600 text-sea-600 dark:text-sea-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        <Wallet size={16} /> Operational Expenses
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto relative">
                {activeTab === 'purchases' ? <Purchases isMerged={true} /> : <Expenses isMerged={true} />}
            </div>
        </div>
    );
}
