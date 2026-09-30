import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { initInstallPrompt } from '../pwa';

const DISMISS_KEY = 'vs_install_dismissed_at';

export const InstallBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [ctrl] = useState(() => initInstallPrompt());

  useEffect(() => {
    // Respect a recent manual dismissal (2 days)
    try {
      const last = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (Date.now() - last < 2 * 24 * 3600 * 1000) return;
    } catch { /* ignore */ }

    const off = ctrl.onAvailable(() => {
      if (ctrl.canInstall()) setShow(true);
    });
    // The prompt event may have fired before React mounted
    if (ctrl.canInstall()) setShow(true);
    return off;
  }, [ctrl]);

  if (!show) return null;

  const install = async () => {
    setInstalling(true);
    const result = await ctrl.promptInstall();
    setInstalling(false);
    if (result === 'accepted') setShow(false);
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setShow(false);
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md animate-[slideDown_.3s_ease-out]">
      <div className="bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-orange-500/30 p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black">Install VendorSaathi</p>
          <p className="text-[10px] text-slate-300 leading-tight">Add to Home Screen — opens fullscreen, works offline</p>
        </div>
        <button
          onClick={install}
          disabled={installing}
          className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black flex items-center gap-1 disabled:opacity-60 transition"
        >
          <Download className="w-3.5 h-3.5" /> {installing ? '…' : 'Install'}
        </button>
        <button onClick={dismiss} aria-label="Dismiss install banner" className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
