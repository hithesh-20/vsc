import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { getPushState, enableOrderPush, disableOrderPush, sendTestPush, PushState } from '../services/pushService';

interface OrderAlertsCardProps {
  language?: string;
}

const T = {
  en: { title: 'New Order Alerts', sub: 'Get a loud notification even when the app is closed', enable: 'Enable Alerts', disable: 'Turn Off', test: 'Send Test Alert', unsupported: 'Not supported on this browser', blocked: 'Notifications blocked — enable them in browser settings', on: 'Alerts are ON for this device', done: 'Sent! Check your notifications', fail: 'Could not send — try Enable Alerts again' },
  kn: { title: 'ಹೊಸ ಆರ್ಡರ್ ಎಚ್ಚರಿಕೆಗಳು', sub: 'ಆಪ್ ಮುಚ್ಚಿದ್ದರೂ ಜೋರಾಗಿ ಅಧಿಸೂಚನೆ ಸಿಗುತ್ತದೆ', enable: 'ಎಚ್ಚರಿಕೆ ಆನ್ ಮಾಡಿ', disable: 'ಆಫ್ ಮಾಡಿ', test: 'ಪರೀಕ್ಷಾ ಎಚ್ಚರಿಕೆ ಕಳುಹಿಸಿ', unsupported: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಬೆಂಬಲವಿಲ್ಲ', blocked: 'ಅಧಿಸೂಚನೆಗಳು ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ — ಬ್ರೌಸರ್ ಸೆಟ್ಟಿಂಗ್‌ನಲ್ಲಿ ಆನ್ ಮಾಡಿ', on: 'ಈ ಸಾಧನದಲ್ಲಿ ಎಚ್ಚರಿಕೆಗಳು ಆನ್ ಆಗಿವೆ', done: 'ಕಳುಹಿಸಲಾಗಿದೆ! ಅಧಿಸೂಚನೆ ನೋಡಿ', fail: 'ಕಳುಹಿಸಲಾಗಲಿಲ್ಲ — ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ' },
  hi: { title: 'नए ऑर्डर की चेतावनी', sub: 'ऐप बंद होने पर भी तेज़ नोटिफिकेशन पाएं', enable: 'अलर्ट चालू करें', disable: 'बंद करें', test: 'टेस्ट अलर्ट भेजें', unsupported: 'इस ब्राउज़र में समर्थित नहीं', blocked: 'नोटिफिकेशन ब्लॉक हैं — ब्राउज़र सेटिंग में चालू करें', on: 'इस डिवाइस पर अलर्ट चालू हैं', done: 'भेज दिया! नोटिफिकेशन देखें', fail: 'नहीं भेजा जा सका — दोबारा कोशिश करें' },
} as const;

export const OrderAlertsCard: React.FC<OrderAlertsCardProps> = ({ language = 'en' }) => {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const t = (T as any)[language] || T.en;

  useEffect(() => {
    getPushState().then(setState);
  }, []);

  const enable = async () => {
    setBusy(true);
    setTestMsg(null);
    const result = await enableOrderPush();
    const s = await getPushState();
    setState(s);
    setBusy(false);
    if (result === 'granted') {
      const tr = await sendTestPush();
      setTestMsg(tr.ok ? { ok: true, text: t.done } : { ok: false, text: t.fail });
    } else if (result === 'denied') {
      setTestMsg({ ok: false, text: t.blocked });
    } else if (result === 'unsupported') {
      setTestMsg({ ok: false, text: t.unsupported });
    } else {
      setTestMsg({ ok: false, text: t.fail });
    }
  };

  const disable = async () => {
    setBusy(true);
    await disableOrderPush();
    setState(await getPushState());
    setBusy(false);
  };

  const sendTest = async () => {
    setBusy(true);
    const tr = await sendTestPush();
    setTestMsg(tr.ok ? { ok: true, text: t.done } : { ok: false, text: t.fail });
    setBusy(false);
  };

  const subscribed = !!state?.subscribed && state.permission === 'granted';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${subscribed ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
          {subscribed ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-slate-900 text-sm">{t.title}</h3>
          <p className="text-[11px] text-slate-500 leading-tight">{state && !state.supported ? t.unsupported : t.sub}</p>
        </div>
        {subscribed && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">ON</span>}
      </div>

      <div className="flex gap-2">
        {!subscribed ? (
          <button
            onClick={enable}
            disabled={busy || (state ? !state.supported : false)}
            className="flex-1 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 transition"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            {t.enable}
          </button>
        ) : (
          <>
            <button
              onClick={sendTest}
              disabled={busy}
              className="flex-1 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 transition"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t.test}
            </button>
            <button
              onClick={disable}
              disabled={busy}
              className="px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black transition"
            >
              {t.disable}
            </button>
          </>
        )}
      </div>

      {subscribed && <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t.on}</p>}
      {testMsg && (
        <p className={`text-[11px] font-bold flex items-center gap-1 ${testMsg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
          {testMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} {testMsg.text}
        </p>
      )}
    </div>
  );
};
