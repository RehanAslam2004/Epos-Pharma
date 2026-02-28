import React, { useState, useEffect } from 'react';

function UpdateButton() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateDownloaded, setUpdateDownloaded] = useState(false);
    const [updateInfo, setUpdateInfo] = useState(null);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.onUpdateAvailable((event, info) => {
                setUpdateAvailable(true);
                setUpdateInfo(info);
            });
            window.electronAPI.onUpdateDownloaded((event, info) => {
                setUpdateDownloaded(true);
                setUpdateInfo(info);
            });
        }
    }, []);

    function installUpdate() {
        if (window.electronAPI) {
            window.electronAPI.installUpdate();
        }
    }

    if (!updateAvailable && !updateDownloaded) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 3000,
            animation: 'scaleIn 0.3s ease',
        }}>
            {updateDownloaded ? (
                <button className="btn btn-primary btn-lg" onClick={installUpdate} style={{
                    boxShadow: '0 8px 30px rgba(0, 168, 107, 0.4)',
                    borderRadius: 'var(--radius-full)',
                }}>
                    🔄 Install Update {updateInfo?.version && `v${updateInfo.version}`}
                </button>
            ) : (
                <div className="btn btn-secondary btn-lg" style={{
                    boxShadow: 'var(--shadow-lg)',
                    borderRadius: 'var(--radius-full)',
                    cursor: 'default',
                }}>
                    ⬇️ Downloading update...
                </div>
            )}
        </div>
    );
}

export default UpdateButton;
