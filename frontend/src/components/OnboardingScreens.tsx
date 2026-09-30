import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, ShieldCheck, Phone, RefreshCw, Check, Store, ShoppingBag,
  Sparkles, ArrowRight, User as UserIcon, QrCode
} from 'lucide-react';
import { INDIAN_LANGUAGES, getAppStrings } from '../services/i18n';
import { authService, AuthResult } from '../services/auth';
import { sounds } from '../services/sound';
import { API_BASE } from '../services/api';

interface OnboardingProps {
  onAuthed: (auth: AuthResult & { language: string }) => void;
  onLanguage?: (lang: string) => void;
  onPhone?: (phone: string) => void;
  initialLanguage?: string;
}

type Step = 'splash' | 'language' | 'phone' | 'otp' | 'signup';

export const OnboardingScreens: React.FC<OnboardingProps> = ({ onAuthed, onLanguage, onPhone, initialLanguage }) => {
  const [step, setStep] = useState<Step>('splash');
  const [language, setLanguageState] = useState(initialLanguage || 'en');

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    onLanguage?.(lang);
  };

  // phone step
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [sending, setSending] = useState(false);

  // otp step
  const [requestId, setRequestId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // signup step
  const [fullName, setFullName] = useState('');
  const [creating, setCreating] = useState(false);

  const t = getAppStrings(language);
  const langMeta = INDIAN_LANGUAGES.find(l => l.code === language) || INDIAN_LANGUAGES[1];

  // WiFi onboarding: this PC's address as a QR so a phone can open the app
  // without typing anything. The backend resolves the LAN IP (a browser
  // cannot); hidden when the backend only has a loopback address — and on
  // phones (non-localhost host), where scanning your own screen is pointless
  // and the vendor should see a clean language list first.
  const isOnPhone = typeof window !== 'undefined'
    && window.location.hostname !== 'localhost'
    && window.location.hostname !== '127.0.0.1';
  const [lanInfo, setLanInfo] = useState<{ app_url: string } | null>(null);
  const [qrOpen, setQrOpen] = useState(true);
  useEffect(() => {
    if (isOnPhone) return; // phone screens stay clean: no QR card at all
    let dead = false;
    fetch(`${API_BASE}/system/lan-info`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (!dead && j?.data?.is_lan) setLanInfo(j.data); })
      .catch(() => { /* backend down → no QR card */ });
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Splash auto-advance
  useEffect(() => {
    if (step === 'splash') {
      const id = setTimeout(() => setStep('language'), 1600);
      return () => clearTimeout(id);
    }
  }, [step]);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn(v => v - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  // Auto-verify when all 6 digits filled
  useEffect(() => {
    if (digits.every(d => d !== '') && !verifying) {
      handleVerify(digits.join(''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const finish = (auth: AuthResult) => onAuthed({ ...auth, language });

  const handleSendOtp = async (resend = false) => {
    setPhoneError('');
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setPhoneError(language === 'kn' ? 'ಸರಿಯಾದ 10-ಅಂಕಿಯ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ' : language === 'hi' ? 'सही 10-अंकों का नंबर डालें' : 'Enter a valid 10-digit number');
      return;
    }
    setSending(true);
    try {
      onPhone?.(clean);
      const res = await authService.requestOtp(clean);
      setRequestId(res.request_id);
      setMaskedPhone(res.masked_phone);
      setIsNewUser(res.is_new_user);
      setDemoCode(res.demo_code || null);
      setDigits(['', '', '', '', '', '']);
      setOtpError('');
      setResendIn(res.resend_in_seconds);
      setStep('otp');
      if (!resend) sounds.playTap();
    } catch (e: any) {
      // fetch() throws TypeError on network failure (PC off, WiFi dropped, or
      // a firewall block) — say that plainly instead of a vague OTP error.
      const networkDown = e instanceof TypeError || /fetch|network/i.test(String(e?.message));
      setPhoneError(networkDown
        ? (language === 'kn'
            ? 'ಸರ್ವರ್ ಸಂಪರ್ಕ ಕಡಿತವಾಗಿದೆ — ಕಂಪ್ಯೂಟರ್ ಆನ್ ಆಗಿದೆಯೆ ಮತ್ತು ಒಂದೇ WiFi ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ'
            : 'Cannot reach the server — check the computer is on and both devices are on the same WiFi')
        : (e.message || 'Failed to send OTP'));
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (code?: string) => {
    const otp = code ?? digits.join('');
    if (otp.length !== 6) return;
    setVerifying(true);
    setOtpError('');
    try {
      const res = await authService.verifyOtp(requestId, otp);
      if (res.auth) {
        sounds.playSuccessChime();
        finish(res.auth);
      } else {
        setStep('signup');
      }
    } catch (e: any) {
      setOtpError(e.message || t.wrongOtp);
      setDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleDigit = (idx: number, val: string) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = v;
    setDigits(next);
    if (v && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleSignup = async () => {
    if (fullName.trim().length < 2) return;
    setCreating(true);
    try {
      // Vendor-only build: every new signup becomes a vendor account
      const auth = await authService.completeSignup(requestId, fullName.trim(), 'VENDOR', language);
      sounds.playSuccessChime();
      finish(auth);
    } catch (e: any) {
      setOtpError(e.message || 'Could not create account');
      setStep('otp');
    } finally {
      setCreating(false);
    }
  };

  // ------------------------------ SPLASH ------------------------------
  if (step === 'splash') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-orange-500 via-orange-600 to-amber-600 text-white select-none">
        <div className="w-24 h-24 rounded-[28px] bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center shadow-2xl animate-bounce">
          <Store className="w-12 h-12" />
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-tight">VendorSaathi</h1>
        <p className="mt-1 text-orange-100 text-sm font-semibold">
          {langMeta.greeting} • Vendor Business App
        </p>
        <div className="mt-10 flex items-center space-x-1.5 text-[11px] font-bold text-orange-100/90">
          <Sparkles className="w-3.5 h-3.5" />
          <span>All Indian languages • UPI • Udhaar</span>
        </div>
        <div className="absolute bottom-10 w-32 h-1.5 rounded-full bg-white/30 overflow-hidden">
          <div className="h-full w-1/3 bg-white rounded-full animate-[slide_1.4s_ease-in-out_infinite]" />
        </div>
      </div>
    );
  }

  // ------------------------------ LANGUAGE ------------------------------
  if (step === 'language') {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <div className="px-5 pt-8 pb-3 bg-gradient-to-b from-orange-50 to-white">
          <h2 className="text-2xl font-black text-slate-900">{t.chooseLanguage}</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">{t.chooseLanguageSub}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-2 gap-2.5">
            {INDIAN_LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => { setLanguage(l.code); sounds.playTap(); }}
                className={`p-3.5 rounded-2xl border-2 text-left transition active:scale-95 ${
                  language === l.code
                    ? 'border-orange-500 bg-orange-50 shadow-md shadow-orange-100'
                    : 'border-slate-200 bg-white hover:border-orange-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-slate-900">{l.native}</span>
                  {language === l.code && (
                    <span className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-400">{l.english}</span>
              </button>
            ))}
          </div>

          {lanInfo && (
            <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50/60 p-3">
              <button
                onClick={() => { sounds.playTap(); setQrOpen(v => !v); }}
                className="w-full flex items-center justify-between gap-2"
              >
                <div className="text-left min-w-0">
                  <p className="text-[11px] font-black text-slate-900 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-orange-600" /> Open on your phone — scan, no typing
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 truncate">{lanInfo.app_url}</p>
                </div>
                <span className="text-[10px] font-black text-orange-600 whitespace-nowrap">{qrOpen ? 'HIDE' : 'SHOW'}</span>
              </button>
              {qrOpen && (
                <div className="mt-2.5 flex items-center gap-3">
                  <img
                    src={`${API_BASE}/system/lan-qr`}
                    alt="QR code — scan to open VendorSaathi on this WiFi"
                    className="w-28 h-28 shrink-0 bg-white rounded-xl border border-slate-200 p-1.5"
                  />
                  <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                    Point the phone's camera here (same WiFi), tap the link it shows, and VendorSaathi opens — ready to log in.
                    <span className="block mt-1 text-slate-500">ಫೋನ್ ಕ್ಯಾಮೆರಾದಿಂದ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ — ಅಪ್ಲಿಕೇಶನ್ ತೆರೆಯುತ್ತದೆ.</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 bg-white">
          <button
            onClick={() => { sounds.playTap(); setStep('phone'); }}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl shadow-lg shadow-orange-200 flex items-center justify-center space-x-2 active:scale-[0.98] transition"
          >
            <span>{t.continue}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------ PHONE ------------------------------
  if (step === 'phone') {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <button onClick={() => setStep('language')} className="p-4 self-start text-slate-500">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="px-6 pt-2">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center">
            <Phone className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="mt-5 text-2xl font-black text-slate-900">{t.enterPhone}</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">{t.phoneSub}</p>

          <div className={`mt-6 flex items-center rounded-2xl border-2 px-4 py-3.5 ${phoneError ? 'border-rose-300 bg-rose-50' : 'border-slate-200 focus-within:border-orange-400'}`}>
            <span className="text-slate-700 font-black text-base pr-3 border-r border-slate-200">🇮🇳 +91</span>
            <input
              autoFocus
              inputMode="numeric"
              placeholder="98765 43210"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="ml-3 flex-1 outline-none text-lg font-bold tracking-widest text-slate-900 placeholder:text-slate-300 placeholder:tracking-normal"
            />
          </div>
          {phoneError && <p className="mt-2 text-xs font-bold text-rose-600">{phoneError}</p>}

          <button
            onClick={() => handleSendOtp()}
            disabled={sending || phone.length !== 10}
            className="mt-6 w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 disabled:from-slate-300 disabled:to-slate-300 text-white font-black rounded-2xl shadow-lg shadow-orange-200 active:scale-[0.98] transition text-base"
          >
            {sending ? '…' : t.getOtp}
          </button>

          <div className="mt-8 flex items-center justify-center space-x-1.5 text-[11px] font-bold text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Secure OTP login • Your number is never shared</span>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------ OTP ------------------------------
  if (step === 'otp') {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <button onClick={() => setStep('phone')} className="p-4 self-start text-slate-500">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="px-6 pt-2">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="mt-5 text-2xl font-black text-slate-900">{t.verifyOtp}</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {t.otpSub} <span className="font-black text-slate-800">{maskedPhone}</span>
          </p>

          {demoCode && (
            <div className="mt-4 p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between">
              <span className="text-xs font-black text-blue-700">{t.demoOtp}: <span className="font-mono tracking-widest">{demoCode}</span></span>
              <button
                onClick={() => { setDigits(demoCode.split('')); }}
                className="text-xs font-black text-blue-600 underline"
              >
                Auto-fill
              </button>
            </div>
          )}

          <div className="mt-6 flex justify-between space-x-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { otpRefs.current[i] = el; }}
                autoFocus={i === 0}
                inputMode="numeric"
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => { if (e.key === 'Backspace' && !digits[i] && i > 0) otpRefs.current[i - 1]?.focus(); }}
                className={`w-12 h-14 text-center text-2xl font-black rounded-2xl border-2 outline-none transition ${
                  d ? 'border-orange-400 bg-orange-50 text-slate-900' : 'border-slate-200 bg-slate-50'
                } ${otpError ? 'border-rose-300' : ''}`}
              />
            ))}
          </div>
          {otpError && <p className="mt-3 text-xs font-bold text-rose-600 text-center">{otpError}</p>}

          <button
            onClick={() => handleVerify()}
            disabled={verifying || digits.join('').length !== 6}
            className="mt-6 w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 disabled:from-slate-300 disabled:to-slate-300 text-white font-black rounded-2xl shadow-lg shadow-orange-200 active:scale-[0.98] transition"
          >
            {verifying ? '…' : t.verifyAndContinue}
          </button>

          <div className="mt-5 text-center">
            {resendIn > 0 ? (
              <span className="text-xs font-bold text-slate-400 flex items-center justify-center space-x-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.resendIn} 0:{resendIn.toString().padStart(2, '0')}</span>
              </span>
            ) : (
              <button onClick={() => handleSendOtp(true)} className="text-xs font-black text-orange-600">
                {t.resend}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------ SIGNUP ------------------------------
  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="px-6 pt-10">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
          <UserIcon className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="mt-5 text-2xl font-black text-slate-900">{t.welcome}! 🎉</h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {language === 'kn' ? 'ನಿಮ್ಮ ಖಾತೆ ರಚಿಸಲು ಹೆಸರು ನಮೂದಿಸಿ' : language === 'hi' ? 'खाता बनाने के लिए अपना नाम डालें' : 'One last step — tell us your name'}
        </p>

        <input
          autoFocus
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder={t.yourName}
          className="mt-6 w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-orange-400 outline-none text-base font-bold text-slate-900 placeholder:text-slate-300"
        />

        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center space-x-3">
          <span className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-orange-600" />
          </span>
          <div>
            <p className="text-xs font-black text-slate-800">Vendor Account</p>
            <p className="text-[11px] text-slate-400 font-semibold">{maskedPhone} • {langMeta.native}</p>
          </div>
        </div>

        <button
          onClick={handleSignup}
          disabled={creating || fullName.trim().length < 2}
          className="mt-6 w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 disabled:from-slate-300 disabled:to-slate-300 text-white font-black rounded-2xl shadow-lg shadow-orange-200 active:scale-[0.98] transition"
        >
          {creating ? '…' : t.completeSignup}
        </button>
        {otpError && <p className="mt-3 text-xs font-bold text-rose-600 text-center">{otpError}</p>}
      </div>
    </div>
  );
};
