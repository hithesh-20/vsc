import React, { useState, useEffect } from 'react';
import { VendorMobileApp } from './components/VendorMobileApp';
import { VendorTerminal } from './components/VendorTerminal';
import { AcademicDocsModal } from './components/AcademicDocsModal';
import { 
  Smartphone, Monitor, BookOpen, MapPin, Radio, ShieldCheck, 
  Sparkles, CloudSun, Languages, CheckCircle2 
} from 'lucide-react';
import { ALL_REGIONAL_LANGUAGES, VENDOR_TRANSLATIONS, formatLocalizedNumber } from './services/i18n';
import { SUPPORTED_CURRENCIES, getStoredCurrency, setStoredCurrency } from './services/currency';

export const App: React.FC = () => {
  // Vendor Layout Mode: 'mobile_view' (Smartphone simulator) or 'desktop_view' (Widescreen terminal)
  const [vendorLayout, setVendorLayout] = useState<'mobile_view' | 'desktop_view'>('mobile_view');
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('kn');
  const [currentCurrency, setCurrentCurrency] = useState<string>(getStoredCurrency());
  const [weatherAdvisory, setWeatherAdvisory] = useState<any>(null);

  const handleCurrencyChange = (newCode: string) => {
    setCurrentCurrency(newCode);
    setStoredCurrency(newCode);
  };

  const t = VENDOR_TRANSLATIONS[currentLanguage] || VENDOR_TRANSLATIONS.kn;
  const currentLangConfig = ALL_REGIONAL_LANGUAGES.find(l => l.code === currentLanguage) || ALL_REGIONAL_LANGUAGES[0];

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/weather/current?lat=12.9716&lon=77.5946')
      .then(r => r.json())
      .then(d => { if (d.data) setWeatherAdvisory(d.data); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/80 via-white to-orange-50/50 text-slate-900 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      
      {/* 1. CLEAN VENDOR OPERATING HEADER (ORANGE & WHITE) */}
      <header className="bg-white/95 backdrop-blur border-b border-orange-200/80 px-4 py-2.5 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          
          {/* Logo & Vendor Cart Status */}
          <div className="flex items-center space-x-3">
            <img 
              src="/vendorsathi_logo.jpg" 
              alt="VendorSaathi Logo" 
              className="w-10 h-10 rounded-2xl object-cover shadow-md shadow-orange-500/20 ring-2 ring-orange-200" 
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-orange-950 text-base tracking-wide">VendorSaathi</span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  <span>{t.onlineGps || 'LIVE GPS'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {t.vendorTitle}
              </p>
            </div>
          </div>

          {/* Right Controls: Indian Language Picker & Bharat Currency */}
          <div className="flex items-center space-x-2">
            {/* 10 Indian Regional Languages Switcher */}
            <select
              value={currentLanguage}
              onChange={(e) => setCurrentLanguage(e.target.value)}
              className="bg-white text-slate-800 border border-orange-200 text-xs font-black px-3 py-2 rounded-2xl outline-none cursor-pointer hover:border-orange-500 transition shadow-sm"
              title="Select Regional Language"
            >
              {ALL_REGIONAL_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-white text-slate-900">
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>

            {/* Official Bharat Currency Indicator */}
            <div 
              className="bg-orange-50 text-orange-700 border border-orange-200 text-xs font-black px-3 py-2 rounded-2xl flex items-center space-x-1.5 shadow-sm"
              title="Official Currency: Indian Rupee (INR ₹)"
            >
              <span>🇮🇳</span>
              <span className="font-extrabold">₹ INR</span>
            </div>
          </div>

        </div>
      </header>

      {/* 2. DYNAMIC WEATHER & MANDI ADVISORY BAR */}
      {weatherAdvisory && (
        <div className="bg-orange-500/10 border-b border-orange-200/70 px-4 py-2 text-xs font-bold text-orange-900 flex items-center justify-center space-x-2 backdrop-blur">
          <CloudSun className="w-4 h-4 text-orange-600 flex-shrink-0 animate-pulse" />
          <span>
            {currentLanguage === 'kn'
              ? `${weatherAdvisory.weather_condition_kn || 'ಸ್ವಚ್ಛ ಬಿಸಿಲು'} (${formatLocalizedNumber(weatherAdvisory.temperature_celsius, currentLanguage)}°C) • ${weatherAdvisory.advisory_kn || 'ಇಂದು ಬೀದಿಬದಿ ಗಾಡಿ ವ್ಯಾಪಾರಕ್ಕೆ ಅತ್ಯುತ್ತಮ ಹವಾಮಾನ. ಸೊಪ್ಪುಗಳಿಗೆ ಹಗುರವಾಗಿ ನೀರು ಚಿಮುಕಿಸಿ.'}`
              : (currentLanguage === 'hi'
                  ? `${weatherAdvisory.weather_condition_hi || 'साफ़ मौसम'} (${formatLocalizedNumber(weatherAdvisory.temperature_celsius, currentLanguage)}°C) • ${weatherAdvisory.advisory_hi || 'आज सड़क किनारे ठेला व्यापार के लिए उत्कृष्ट मौसम है।'}`
                  : (currentLanguage === 'ta'
                      ? `${weatherAdvisory.weather_condition_ta || 'தெளிவான வானம்'} (${formatLocalizedNumber(weatherAdvisory.temperature_celsius, currentLanguage)}°C) • ${weatherAdvisory.advisory_ta || 'இன்று தெருவோர தள்ளுவண்டி வியாபாரத்திற்கு சிறந்த வானிலை.'}`
                      : (currentLanguage === 'te'
                          ? `${weatherAdvisory.weather_condition_te || 'స్పష్టమైన ఆకాశం'} (${formatLocalizedNumber(weatherAdvisory.temperature_celsius, currentLanguage)}°C) • ${weatherAdvisory.advisory_te || 'ఈ రోజు తోపుడు బండి వ్యాపారానికి అనుకూలమైన వాతావరణం.'}`
                          : `${weatherAdvisory.weather_condition || 'Clear Sky'} (${formatLocalizedNumber(weatherAdvisory.temperature_celsius, currentLanguage)}°C) • ${weatherAdvisory.advisory || 'Excellent conditions for pushcart street vending today.'}`)))}
          </span>
        </div>
      )}

      {/* 3. MAIN VENDOR MOBILE EXPERIENCE (FLAGSHIP SMARTPHONE SHOWCASE) */}
      <main className="flex-1 py-4 sm:py-8 flex justify-center items-start relative px-2">
        {/* Ambient Decorative Glow Orbs */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl pointer-events-none -z-10 animate-soft-pulse" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-rose-400/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Flagship Titanium Smartphone Frame (Fixed height flex container) */}
        <div className="relative max-w-[430px] w-full mx-auto bg-slate-900 sm:rounded-[48px] p-2.5 shadow-[0_30px_90px_-15px_rgba(234,88,12,0.3)] ring-1 ring-slate-800 h-[860px] max-h-[92vh] flex flex-col overflow-hidden">
          
          {/* Top Dynamic Island & Flagship Hardware Bezel */}
          <div className="bg-white rounded-t-[38px] pt-3 px-6 pb-2 flex items-center justify-between border-b border-orange-100 select-none flex-shrink-0 z-30">
            {/* Live Clock */}
            <span className="text-[11px] font-black text-slate-900 tracking-tight">9:41 AM</span>
            
            {/* Dynamic Island Pill */}
            <div className="w-24 h-5 bg-slate-950 rounded-full flex items-center justify-between px-2.5 shadow-inner">
              <div className="w-2 h-2 rounded-full bg-slate-800 ring-1 ring-slate-700 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-blue-500/80" />
              </div>
              <div className="w-8 h-1 bg-slate-800 rounded-full" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>

            {/* Network, 5G & Battery Status */}
            <div className="flex items-center space-x-1.5 text-slate-800 text-[10px] font-black">
              <span>5G</span>
              <span>📶</span>
              <span className="text-emerald-600 font-extrabold">98% 🔋</span>
            </div>
          </div>

          {/* Actual VendorMobileApp in flex-1 min-h-0 column */}
          <div className="bg-white overflow-hidden rounded-b-[38px] flex-1 flex flex-col min-h-0">
            <VendorMobileApp 
              language={currentLanguage} 
              currency={currentCurrency} 
              onCurrencyChange={handleCurrencyChange}
            />
            {/* Bottom Home Indicator Bar */}
            <div className="bg-white pb-2 pt-1 flex justify-center flex-shrink-0 border-t border-orange-50">
              <div className="w-36 h-1.5 bg-slate-300 rounded-full" />
            </div>
          </div>
        </div>
      </main>

      {/* 4. SIMPLE CLEAN FOOTER (ORANGE & WHITE) */}
      <footer className="bg-white border-t border-orange-100 text-slate-500 py-4 text-xs text-center shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-bold text-slate-700 text-[11px]">
            🇮🇳 VendorSaathi Bharat • Digital Operating System for Indian Street & Village Push-Cart Vendors
          </p>
          <div className="flex items-center space-x-3 text-[11px]">
            <button
              onClick={() => setIsDocsOpen(true)}
              className="text-orange-600 hover:text-orange-700 font-bold flex items-center space-x-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Viva Project Docs</span>
            </button>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-600 font-semibold">Backend Active 🟢</span>
          </div>
        </div>
      </footer>

      {/* Academic 14-Section Viva Documentation Modal */}
      <AcademicDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

    </div>
  );
};

export default App;
