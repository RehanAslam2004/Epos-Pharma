import React from 'react';

const typeStyles = { info: 'bg-blue-500', success: 'bg-sea-600', warning: 'bg-amber-500', error: 'bg-red-500' };
const icons = {
    info: '💡', success: '✅', warning: '⚠️', error: '❌',
};

export default function Toast({ toasts }) {
    if (!toasts.length) return null;
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
            {toasts.map(t => (
                <div key={t.id} className={`toast-enter flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${typeStyles[t.type] || typeStyles.info}`}>
                    <span className="text-lg">{icons[t.type] || icons.info}</span>
                    <span>{t.msg}</span>
                </div>
            ))}
        </div>
    );
}
