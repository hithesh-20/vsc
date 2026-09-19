import React, { useState, useEffect } from 'react';
import { AlertOctagon, PhoneCall, Volume2, ShieldAlert, X, MapPin, Copy, Check, HeartHandshake, Wrench } from 'lucide-react';
import { sounds } from '../services/sound';
import { VENDOR_TRANSLATIONS } from '../services/i18n';

interface EmergencySosModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorLocation: [number, number];
  vendorUser: any;
  language?: string;
}

export const EmergencySosModal: React.FC<EmergencySosModalProps> = ({
  isOpen,
  onClose,
  vendorLocation = [12.9716, 77.5946] as [number, number],
  vendorUser = {} as any,
  language = 'kn'
}) => {
  const t = VENDOR_TRANSLATIONS[language] || VENDOR_TRANSLATIONS.en || VENDOR_TRANSLATIONS.kn;
  const [copied, setCopied] = useState(false);
  const [sirenPlaying, setSirenPlaying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Auto-trigger safety siren on modal open
      sounds.playEmergencySiren();
      setSirenPlaying(true);
    } else {
      setSirenPlaying(false);
    }
  }, [isOpen]);

  const mapsUrl = `https://www.google.com/maps?q=${vendorLocation[0]},${vendorLocation[1]}`;

  const copyEmergencyLink = () => {
    navigator.clipboard.writeText(`🚨 EMERGENCY VENDOR ALERT!\nVendor: ${vendorUser?.business_name || 'Vendor Cart'} (${vendorUser?.phone || 'N/A'})\nLocation: ${mapsUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white border-2 border-rose-500 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 text-slate-900">
        
        {/* Siren Strobe Banner */}
        <div className="bg-rose-600 text-white p-3 rounded-2xl flex items-center justify-between shadow-lg shadow-rose-600/30 animate-pulse">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 animate-bounce" />
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">
                {t.emergencySosTitle || 'Street Safety & Emergency SOS'}
              </h3>
              <span className="text-[10px] font-bold opacity-90">Live GPS Alert Active</span>
            </div>
          </div>
          <button
            onClick={() => sounds.playEmergencySiren()}
            className="px-2.5 py-1 bg-white text-rose-700 font-black text-xs rounded-xl shadow active:scale-95 flex items-center space-x-1"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Siren</span>
          </button>
        </div>

        {/* Vendor Identity & Location Card */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-rose-200 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-black text-white text-sm">{vendorUser?.business_name || 'Vendor Cart'}</h4>
              <p className="text-xs text-slate-500">Cart ID: {vendorUser.apmc_license || 'VS-STREET-2026'}</p>
            </div>
            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black rounded-full">
              CRITICAL
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-xl flex items-center justify-between text-xs font-mono text-slate-700">
            <div className="flex items-center space-x-1.5 truncate">
              <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span className="truncate">{vendorLocation[0].toFixed(5)}, {vendorLocation[1].toFixed(5)}</span>
            </div>
            <button
              onClick={copyEmergencyLink}
              className="p-1.5 bg-rose-100 hover:bg-rose-200 rounded-lg text-slate-700 transition flex items-center space-x-1 flex-shrink-0"
              title="Copy Emergency GPS Link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-rose-300" />}
              <span className="text-[10px]">{copied ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* 1-Click Emergency Direct Calling */}
        <div className="space-y-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
            One-Touch Indian Emergency Helplines:
          </span>

          <div className="grid grid-cols-2 gap-2">
            <a
              href="tel:112"
              className="p-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs flex items-center justify-center space-x-2 shadow-md transition active:scale-95"
            >
              <PhoneCall className="w-4 h-4" />
              <span>National ERSS (112)</span>
            </a>

            <a
              href="tel:108"
              className="p-3 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black text-xs flex items-center justify-center space-x-2 shadow-md transition active:scale-95"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>Ambulance (108)</span>
            </a>

            <a
              href="tel:100"
              className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs flex items-center justify-center space-x-2 shadow-md transition active:scale-95"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Police (100)</span>
            </a>

            <a
              href="tel:1091"
              className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs flex items-center justify-center space-x-2 shadow-md transition active:scale-95"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Women Safety (1091)</span>
            </a>
          </div>

          {/* Statutory Street Vendors Act Legal Rights Protection */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[11px] space-y-1 text-amber-200">
            <div className="flex items-center space-x-1.5 font-black text-amber-400">
              <span>⚖️ Street Vendors Act, 2014 (Section 3(3))</span>
            </div>
            <p className="text-[10px] text-slate-700 leading-relaxed">
              No street vendor shall be evicted or relocated until the survey by the Town Vending Committee (TVC) has been completed and a certificate of vending is issued.
            </p>
          </div>
        </div>

        {/* Dismiss / Safe */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-rose-100 hover:bg-rose-200 text-slate-700 font-black text-xs rounded-2xl border border-rose-300 transition"
          >
            ✓ I am Safe / Dismiss SOS
          </button>
        </div>

      </div>
    </div>
  );
};
