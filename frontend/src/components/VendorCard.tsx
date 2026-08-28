import React, { useState } from 'react';
import { Star, MapPin, Clock, ArrowRight, Bell, Zap, ShieldCheck, Phone } from 'lucide-react';
import { Vendor } from '../types';
import { sounds } from '../services/sound';

interface VendorCardProps {
  vendor: Vendor;
  onSelect: (vendor: Vendor) => void;
  language: string;
}

export const VendorCard: React.FC<VendorCardProps> = ({ vendor, onSelect, language }) => {
  const [bellRung, setBellRung] = useState(false);
  const isBike = vendor.business_category.toLowerCase().includes('fruit') || vendor.vendor_id.includes('2');
  const estMinutes = Math.max(2, Math.round(vendor.distance_km * 4.5));

  const handleRingBell = (e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playVendorBell();
    setBellRung(true);
    setTimeout(() => setBellRung(false), 2500);

    if ('speechSynthesis' in window) {
      const msg = language === 'kn'
        ? `${vendor.business_name} ಅವರ ಗಾಡಿ ಬೆಲ್ ಬಾರಿಸಲಾಗಿದೆ!`
        : `${vendor.business_name}'s cart bell is ringing!`;
      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.lang = language === 'kn' ? 'kn-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div
      onClick={() => onSelect(vendor)}
      className="group relative bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-slate-200/80 hover:border-orange-400/80 shadow-md hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden"
    >
      {/* Subtle Background Mesh Glow on Hover */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-orange-400/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all duration-500 pointer-events-none" />

      {/* Top Header Pill Bar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <span className="w-9 h-9 rounded-2xl bg-orange-500/10 border border-orange-200 text-orange-600 flex items-center justify-center text-lg font-black group-hover:scale-110 transition-transform">
            {isBike ? '🛵' : '🛒'}
          </span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 block">
              {vendor.business_category}
            </span>
            <div className="flex items-center space-x-1 text-[11px] font-extrabold text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>Live Moving</span>
            </div>
          </div>
        </div>

        {/* ETA & Distance Badge */}
        <div className="text-right">
          <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-900 border border-amber-200/80 px-2.5 py-1 rounded-xl text-[11px] font-black shadow-sm">
            <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
            <span>{estMinutes} min ETA</span>
          </span>
        </div>
      </div>

      {/* Vendor Title & Subtitle */}
      <div className="space-y-1 my-1">
        <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
          {language === 'kn' && vendor.business_name_kn ? vendor.business_name_kn : vendor.business_name}
        </h4>
        <p className="text-xs text-slate-500 flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>{vendor.distance_km} km from your doorstep</span>
        </p>
      </div>

      {/* Fresh Produce Preview Chips */}
      <div className="my-3 py-2 px-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-slate-600 font-semibold truncate">
          <span>🌿 Farm Mandi Stock</span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 font-bold">{vendor.product_count || 8} Fresh Items</span>
        </div>
        <span className="flex items-center space-x-1 text-xs font-black text-amber-600 bg-amber-100/60 px-2 py-0.5 rounded-lg">
          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
          <span>{vendor.rating_avg}</span>
        </span>
      </div>

      {/* Action CTA Buttons */}
      <div className="pt-3 border-t border-slate-100 flex items-center space-x-2">
        
        {/* Ring Cart Bell */}
        <button
          onClick={handleRingBell}
          title="Ring Cart Arrival Bell"
          className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border border-amber-200 transition active:scale-95 flex items-center justify-center flex-shrink-0"
        >
          <Bell className={`w-4 h-4 ${bellRung ? 'animate-spin text-orange-600' : 'text-amber-700'}`} />
        </button>

        {/* View Produce CTA */}
        <button
          onClick={() => onSelect(vendor)}
          className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-orange-600 text-white font-black text-xs rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-amber-500 shadow-md group-hover:shadow-orange-500/25"
        >
          <span>{language === 'kn' ? 'ಸರಕುಗಳನ್ನು ನೋಡಿ' : 'Browse Produce'}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

    </div>
  );
};
