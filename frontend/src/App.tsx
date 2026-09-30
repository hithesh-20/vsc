import React, { useState } from 'react';
import { VendorMobileApp } from './components/VendorMobileApp';
import { OnboardingScreens } from './components/OnboardingScreens';
import { InstallBanner } from './components/InstallBanner';
import { authService, AppSession, AuthResult } from './services/auth';
import { vendorSession } from './services/vendorSession';

const LANG_KEY = 'vs_app_language';

export const App: React.FC = () => {
  const [session, setSession] = useState<AppSession | null>(() => authService.getSession());
  const [prefLang, setPrefLang] = useState<string>(() => localStorage.getItem(LANG_KEY) || 'en');

  const handleAuthed = (auth: AuthResult & { language: string }) => {
    localStorage.setItem(LANG_KEY, auth.language);
    const next: AppSession = {
      access_token: auth.token,
      user_id: auth.userId,
      role: auth.role,
      name: auth.name,
      phone: authService.getLastPhone() || '',
      customer_id: auth.customerId,
      vendor_id: auth.vendorId,
      language: auth.language,
    };
    authService.saveSession(next);
    if (next.role === 'VENDOR') {
      // Seed the vendor dashboard state, then route into it
      vendorSession.activate(next).finally(() => setSession(next));
    } else {
      setSession(next);
    }
  };

  const handleLogout = () => {
    vendorSession.clear();
    authService.clearSession();
    setSession(null);
  };

  const handleLanguage = (lang: string) => {
    localStorage.setItem(LANG_KEY, lang);
    if (session) {
      const next = { ...session, language: lang };
      authService.saveSession(next);
      setSession(next);
    } else {
      setPrefLang(lang);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex items-center justify-center overflow-hidden select-none relative">
      {/* PWA install banner (Add to Home Screen) */}
      <InstallBanner />

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Phone canvas — the app itself */}
      <div className="relative w-full max-w-[420px] h-screen sm:h-[94vh] sm:max-h-[920px] bg-white sm:rounded-[44px] sm:shadow-[0_40px_120px_-20px_rgba(249,115,22,0.45)] sm:ring-1 sm:ring-slate-800 overflow-hidden flex flex-col">

        {/* App content gate: vendor-only build — every session lands in the
            vendor dashboard (existing customer accounts still log in but see
            the vendor workspace, ready for a future separate customer app) */}
        {!session ? (
          <OnboardingFlow initialLanguage={prefLang} onAuthed={handleAuthed} onLanguage={handleLanguage} />
        ) : (
          <VendorMobileApp language={session.language} />
        )}

        {/* Home indicator */}
        <div className="bg-white pb-2 pt-1 flex justify-center flex-shrink-0">
          <div className="w-32 h-1.5 bg-slate-200 rounded-full" />
        </div>
      </div>
    </div>
  );
};

interface OnboardingFlowProps {
  initialLanguage: string;
  onAuthed: (auth: AuthResult & { language: string }) => void;
  onLanguage: (lang: string) => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ initialLanguage, onAuthed, onLanguage }) => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <OnboardingScreens
        initialLanguage={initialLanguage}
        onAuthed={onAuthed}
        onLanguage={onLanguage}
        onPhone={(p) => authService.setLastPhone(p)}
      />
    </div>
  );
};

export default App;
