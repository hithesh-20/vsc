import React, { useState, useEffect } from 'react';
import { VendorMobileApp } from './components/VendorMobileApp';
import { AcademicDocsModal } from './components/AcademicDocsModal';
import { VillageCartMap } from './components/VillageCartMap';
import { StorefrontModal } from './components/StorefrontModal';
import { CartDrawer } from './components/CartDrawer';
import { LoyaltyModal } from './components/LoyaltyModal';
import { EmergencySosModal } from './components/EmergencySosModal';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { 
  Smartphone, Maximize2, Minimize2, BookOpen, MapPin, Radio, ShieldCheck, 
  Sparkles, CloudSun, Languages, CheckCircle2, ShoppingBag, Store, UserCheck, 
  Award, ShieldAlert, Phone, Clock
} from 'lucide-react';
import { ALL_REGIONAL_LANGUAGES, VENDOR_TRANSLATIONS, formatLocalizedNumber } from './services/i18n';
import { SUPPORTED_CURRENCIES, getStoredCurrency, setStoredCurrency } from './services/currency';
import { Vendor, Product, Order } from './types';
import { api } from './services/api';
import { sounds } from './services/sound';

export const App: React.FC = () => {
  // App Role: 'vendor_ramesh' | 'vendor_manjunath' | 'customer_priya'
  const [activeRole, setActiveRole] = useState<'vendor_ramesh' | 'vendor_manjunath' | 'customer_priya'>('vendor_ramesh');
  
  // Display View: 'phone_frame' (Phone Simulator) or 'fullscreen_app' (Edge-to-edge Native App)
  const [viewMode, setViewMode] = useState<'phone_frame' | 'fullscreen_app'>('phone_frame');

  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('kn');
  const [currentCurrency, setCurrentCurrency] = useState<string>(getStoredCurrency());
  const [weatherAdvisory, setWeatherAdvisory] = useState<any>(null);

  // Customer Marketplace Modal States
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [cartItems, setCartItems] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoyaltyOpen, setIsLoyaltyOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isOrderTrackerOpen, setIsOrderTrackerOpen] = useState(false);

  const handleCurrencyChange = (newCode: string) => {
    setCurrentCurrency(newCode);
    setStoredCurrency(newCode);
  };

  const t = VENDOR_TRANSLATIONS[currentLanguage] || VENDOR_TRANSLATIONS.kn;

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/weather/current?lat=12.9716&lon=77.5946')
      .then(r => r.json())
      .then(d => { if (d.data) setWeatherAdvisory(d.data); })
      .catch(() => {});

    api.getNearbyVendors(12.9716, 77.5946).then(setVendors).catch(() => {});
  }, []);

  const handleAddToCart = (product: Product, quantity: number) => {
    setCartItems(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx].quantity += quantity;
        return next;
      }
      return [...prev, { product, quantity }];
    });
  };

  const handleRoleSwitch = (role: 'vendor_ramesh' | 'vendor_manjunath' | 'customer_priya') => {
    setActiveRole(role);
    sounds.playTap();
    if (role === 'vendor_ramesh') {
      localStorage.setItem('vs_vendor_user', JSON.stringify({
        name: 'ರಮೇಶ್',
        phone: '9876543210',
        business_name: 'ರಮೇಶ್ ತಾಜಾ ತರಕಾರಿಗಳು',
        category: 'Vegetables',
        vehicle_type: 'ನೂಕುಗಾಡಿ',
        upi_id: 'ramesh.veg@okhdfcbank',
        apmc_license: 'KA-MND-2026-8891'
      }));
    } else if (role === 'vendor_manjunath') {
      localStorage.setItem('vs_vendor_user', JSON.stringify({
        name: 'ಮಂಜುನಾಥ್',
        phone: '9880222333',
        business_name: 'ಮಂಜುನಾಥ್ ಚಾಟ್ & ತಿಂಡಿ ಗಾಡಿ',
        category: 'Chaat & Snacks',
        vehicle_type: 'ತಿಂಡಿ ವಾಹನ',
        upi_id: 'manju.chaat@okhdfcbank',
        apmc_license: 'KA-MND-2026-9902'
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white font-sans">
      
      {/* 1. TOP PLATFORM CONTROLLER BAR */}
      <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-2.5 sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo & Tag */}
          <div className="flex items-center space-x-3">
            <img 
              src="/vendorsathi_logo.jpg" 
              alt="VendorSaathi Logo" 
              className="w-9 h-9 rounded-xl object-cover shadow-md shadow-orange-500/20 ring-2 ring-orange-500/50" 
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-white text-base tracking-wide">VendorSaathi</span>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>v1.0 Mobile</span>
                </span>
              </div>
            </div>
          </div>

          {/* Role Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-2xl border border-slate-700/80">
            <button
              onClick={() => handleRoleSwitch('vendor_ramesh')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center space-x-1.5 ${
                activeRole === 'vendor_ramesh'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>{currentLanguage === 'kn' ? 'ರಮೇಶ್ (ತರಕಾರಿ)' : 'Ramesh (Vendor)'}</span>
            </button>

            <button
              onClick={() => handleRoleSwitch('vendor_manjunath')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center space-x-1.5 ${
                activeRole === 'vendor_manjunath'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>{currentLanguage === 'kn' ? 'ಮಂಜುನಾಥ್ (ತಿಂಡಿ)' : 'Manjunath (Chaat)'}</span>
            </button>

            <button
              onClick={() => handleRoleSwitch('customer_priya')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center space-x-1.5 ${
                activeRole === 'customer_priya'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{currentLanguage === 'kn' ? 'ಪ್ರಿಯಾ (ಗ್ರಾಹಕಿ)' : 'Priya (Customer)'}</span>
            </button>
          </div>

          {/* Right Controls: Display Mode & Language Toggle */}
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle: Simulator vs Fullscreen */}
            <button
              onClick={() => setViewMode(prev => prev === 'phone_frame' ? 'fullscreen_app' : 'phone_frame')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-2xl border border-slate-700 flex items-center space-x-1.5 transition"
              title="Toggle Phone Simulator vs Fullscreen"
            >
              {viewMode === 'phone_frame' ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-orange-400" />
                  <span className="hidden sm:inline">Full App</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                  <span className="hidden sm:inline">Phone Frame</span>
                </>
              )}
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setCurrentLanguage(prev => prev === 'kn' ? 'en' : 'kn')}
              className="bg-orange-500/20 text-orange-400 border border-orange-500/40 hover:bg-orange-500/30 text-xs font-black px-3 py-2 rounded-2xl flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{currentLanguage === 'kn' ? 'English' : 'ಕನ್ನಡ'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. DYNAMIC WEATHER BANNER */}
      {weatherAdvisory && (
        <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-2 text-xs font-bold text-orange-300 flex items-center justify-center space-x-2 backdrop-blur">
          <CloudSun className="w-4 h-4 text-orange-400 flex-shrink-0 animate-pulse" />
          <span>
            {currentLanguage === 'kn'
              ? `${weatherAdvisory.weather_condition_kn || 'ಸ್ವಚ್ಛ ಬಿಸಿಲು'} (${formatLocalizedNumber(weatherAdvisory.temperature_celsius, currentLanguage)}°C) • ${weatherAdvisory.advisory_kn || 'ಇಂದು ಬೀದಿಬದಿ ಗಾಡಿ ವ್ಯಾಪಾರಕ್ಕೆ ಅತ್ಯುತ್ತಮ ಹವಾಮಾನ.'}`
              : `${weatherAdvisory.weather_condition || 'Clear Sky'} (${formatLocalizedNumber(weatherAdvisory.temperature_celsius, currentLanguage)}°C) • ${weatherAdvisory.advisory || 'Excellent conditions for pushcart street vending today.'}`}
          </span>
        </div>
      )}

      {/* 3. MAIN APP CANVAS */}
      <main className="flex-1 py-4 sm:py-6 flex justify-center items-start relative px-2">
        {/* Glow ambient background effects */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* CONTAINER: Phone Frame vs Fullscreen Native View */}
        <div className={
          viewMode === 'phone_frame'
            ? "relative max-w-[430px] w-full mx-auto bg-slate-900 sm:rounded-[48px] p-2.5 shadow-[0_30px_90px_-15px_rgba(234,88,12,0.35)] ring-1 ring-slate-800 h-[860px] max-h-[92vh] flex flex-col overflow-hidden"
            : "relative max-w-2xl w-full mx-auto bg-white rounded-3xl shadow-2xl p-2 min-h-[85vh] flex flex-col overflow-hidden"
        }>
          
          {/* Top Hardware Bezel (Only in Phone Frame mode) */}
          {viewMode === 'phone_frame' && (
            <div className="bg-white rounded-t-[38px] pt-3 px-6 pb-2 flex items-center justify-between border-b border-orange-100 select-none flex-shrink-0 z-30">
              <span className="text-[11px] font-black text-slate-900 tracking-tight">9:41 AM</span>
              <div className="w-24 h-5 bg-slate-950 rounded-full flex items-center justify-between px-2.5 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-slate-800 ring-1 ring-slate-700 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-blue-500/80" />
                </div>
                <div className="w-8 h-1 bg-slate-800 rounded-full" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div className="flex items-center space-x-1.5 text-slate-800 text-[10px] font-black">
                <span>5G</span>
                <span>📶</span>
                <span className="text-emerald-600 font-extrabold">98% 🔋</span>
              </div>
            </div>
          )}

          {/* APP SCREEN CONTAINER */}
          <div className="bg-white overflow-hidden rounded-b-[38px] flex-1 flex flex-col min-h-0 text-slate-900">
            {activeRole === 'customer_priya' ? (
              // CUSTOMER PORTAL SCREEN
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-slate-50">
                {/* Customer Header */}
                <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
                  <div>
                    <h2 className="font-extrabold text-base text-slate-900">
                      {currentLanguage === 'kn' ? 'ಗ್ರಾಹಕರ ಪೋರ್ಟಲ್ (ಪ್ರಿಯಾ ಶರ್ಮಾ)' : 'Customer Portal (Priya Sharma)'}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {currentLanguage === 'kn' ? 'ಹತ್ತಿರದ ತಳ್ಳುಗಾಡಿಗಳು ಮತ್ತು ಲೈವ್ ಜಿಪಿಎಸ್' : 'Nearby Street Vendors & Live GPS'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsLoyaltyOpen(true)}
                      className="p-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold flex items-center space-x-1"
                    >
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>150 Pts</span>
                    </button>
                    <button
                      onClick={() => setIsCartOpen(true)}
                      className="p-2 bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1 relative"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {cartItems.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                          {cartItems.reduce((s, i) => s + i.quantity, 0)}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Village Cart Live Interactive GPS Map */}
                <div className="p-3">
                  <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm mb-3">
                    <div className="flex items-center justify-between px-2 py-1 mb-1">
                      <span className="font-extrabold text-xs text-slate-800 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-orange-600" />
                        <span>{currentLanguage === 'kn' ? 'ಲೈವ್ ತಳ್ಳುಗಾಡಿ ನಕ್ಷೆ' : 'Live Street Cart Tracker'}</span>
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        2 Carts Active
                      </span>
                    </div>
                    <VillageCartMap
                      vendors={vendors}
                      onSelectVendor={(v) => setSelectedVendor(v)}
                      language={currentLanguage}
                    />
                  </div>

                  {/* Vendor Cards List */}
                  <div className="space-y-2.5">
                    <h3 className="font-black text-xs text-slate-700 uppercase tracking-wider px-1">
                      {currentLanguage === 'kn' ? 'ಹತ್ತಿರದ ವ್ಯಾಪಾರಿಗಳು' : 'Active Street Vendors'}
                    </h3>
                    {vendors.map((v) => (
                      <div
                        key={v.vendor_id}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-orange-300 transition flex items-center justify-between"
                      >
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">
                            {currentLanguage === 'kn' && v.business_name_kn ? v.business_name_kn : v.business_name}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">{v.business_category} • {v.distance_km} km</p>
                        </div>
                        <button
                          onClick={() => setSelectedVendor(v)}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                        >
                          {currentLanguage === 'kn' ? 'ಅಂಗಡಿ ನೋಡಿ' : 'View Store'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* 1-Tap SOS Emergency Button */}
                  <div className="mt-4">
                    <button
                      onClick={() => setIsSosOpen(true)}
                      className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center space-x-2 transition"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>{currentLanguage === 'kn' ? 'ತುರ್ತು ಸುರಕ್ಷತೆ (1-Tap SOS)' : 'Emergency Roadside SOS'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // VENDOR MOBILE APP (Ramesh / Manjunath)
              <VendorMobileApp 
                key={activeRole}
                language={currentLanguage} 
                currency={currentCurrency} 
                onCurrencyChange={handleCurrencyChange}
              />
            )}

            {/* Bottom Home Indicator Bar (In phone frame mode) */}
            {viewMode === 'phone_frame' && (
              <div className="bg-white pb-2 pt-1 flex justify-center flex-shrink-0 border-t border-orange-50">
                <div className="w-36 h-1.5 bg-slate-300 rounded-full" />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 4. FOOTER WITH QUICK LINKS */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-3 text-xs text-center shadow-md">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-bold text-slate-300 text-[11px]">
            🇮🇳 VendorSaathi • AI Voice Commerce & Mobility for Local Vendors
          </p>
          <div className="flex items-center space-x-3 text-[11px]">
            <button
              onClick={() => setIsDocsOpen(true)}
              className="text-orange-400 hover:text-orange-300 font-bold flex items-center space-x-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Project Docs & Viva Guide</span>
            </button>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-semibold">Backend Active 🟢</span>
          </div>
        </div>
      </footer>

      {/* Modals for Customer Flow */}
      <StorefrontModal
        vendor={selectedVendor}
        onClose={() => setSelectedVendor(null)}
        onAddToCart={handleAddToCart}
        language={currentLanguage}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={(pId, delta) => {
          setCartItems(prev => {
            const next = prev.map(item => {
              if (item.product.id === pId) {
                return { ...item, quantity: Math.max(1, item.quantity + delta) };
              }
              return item;
            });
            return next;
          });
        }}
        onRemoveItem={(pId) => {
          setCartItems(prev => prev.filter(i => i.product.id !== pId));
        }}
        onOrderPlaced={(order) => {
          setActiveOrder(order);
          setCartItems([]);
          setIsCartOpen(false);
          setIsOrderTrackerOpen(true);
        }}
        language={currentLanguage}
      />

      <LoyaltyModal
        isOpen={isLoyaltyOpen}
        onClose={() => setIsLoyaltyOpen(false)}
        points={150}
        language={currentLanguage}
      />

      <EmergencySosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        language={currentLanguage}
      />

      <OrderTrackerModal
        order={activeOrder}
        isOpen={isOrderTrackerOpen}
        onClose={() => setIsOrderTrackerOpen(false)}
        language={currentLanguage}
      />

      <AcademicDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

    </div>
  );
};

export default App;
