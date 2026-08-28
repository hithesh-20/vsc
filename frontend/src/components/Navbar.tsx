import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, MapPin, Award, UserCheck, PhoneCall, Sparkles, BookOpen, Volume2, Globe, ChevronDown, Check } from 'lucide-react';
import { FeatureGuidanceAudio } from './FeatureGuidanceAudio';
import { ALL_REGIONAL_LANGUAGES, UI_TRANSLATIONS } from '../services/i18n';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenLoyalty: () => void;
  onOpenDocs: () => void;
  customerName: string;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  language: string;
  onSelectLanguage: (langCode: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  onOpenLoyalty,
  onOpenDocs,
  customerName,
  isLoggedIn,
  onLoginClick,
  language,
  onSelectLanguage
}) => {
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = ALL_REGIONAL_LANGUAGES.find((l) => l.code === language) || ALL_REGIONAL_LANGUAGES[0];
  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.kn;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo & Slogan */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-200 text-white font-bold text-xl">
            ವ
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                VendorSaathi
              </span>
              <span className="text-[11px] bg-orange-100 text-orange-900 font-extrabold px-2 py-0.5 rounded-full hidden sm:inline-block">
                {currentLang.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">
              {t.heroTag} • Digital India Platform
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Feature Guidance Audio */}
          <FeatureGuidanceAudio
            titleKn="ಹಳ್ಳಿ & ರಸ್ತೆ ಬದಿ ಗಾಡಿಗಳು"
            titleEn="Village Mobile Carts"
            explanationKn="ಇಲ್ಲಿ ನೀವು ನಿಮ್ಮ ಹಳ್ಳಿಯ ರಸ್ತೆಗಳಲ್ಲಿ ಸಂಚರಿಸುತ್ತಿರುವ ತರಕಾರಿ, ಹಣ್ಣು ಮತ್ತು ತಿಂಡಿ ಗಾಡಿಗಳ ಲೈವ್ ಸ್ಥಳವನ್ನು ನೋಡಬಹುದು ಮತ್ತು ಧ್ವನಿ ಮೂಲಕ ಮಾತನಾಡಬಹುದು."
            explanationEn="Here you can track live village roadside carts and communicate using voice assistant."
            language={language as any}
          />

          {/* Academic Docs / Viva Button */}
          <button
            onClick={onOpenDocs}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition"
            title="Project Documentation & Research"
          >
            <BookOpen className="w-4 h-4 text-slate-600" />
            <span className="hidden lg:inline">{t.projectSpecs}</span>
          </button>

          {/* REGIONAL LANGUAGE DROPDOWN TOGGLE */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-black rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 shadow-sm transition active:scale-95"
            >
              <Globe className="w-3.5 h-3.5 text-orange-600" />
              <span>{currentLang.flag} {currentLang.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-orange-600 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Language Selector Popover Menu */}
            {isLangDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in zoom-in-95 duration-150 max-h-80 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">
                  Select Regional Language (ಪ್ರಾದೇಶಿಕ ಭಾಷೆ)
                </div>
                {ALL_REGIONAL_LANGUAGES.map((lang) => {
                  const isSelected = lang.code === language;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => {
                        onSelectLanguage(lang.code);
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs font-bold transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-orange-500 text-white font-black'
                          : 'text-slate-700 hover:bg-orange-50 hover:text-orange-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        <span className={`text-[11px] ${isSelected ? 'text-orange-100' : 'text-slate-400'}`}>
                          ({lang.nameEn})
                        </span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Loyalty Tier Button */}
          <button
            onClick={onOpenLoyalty}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition text-xs font-black"
          >
            <Award className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">{t.loyalty}</span>
          </button>

          {/* Cart Icon */}
          <button
            onClick={onOpenCart}
            className="relative p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                {cartCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
