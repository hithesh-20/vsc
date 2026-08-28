import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, PackageCheck, Truck, Phone, Navigation, ShieldCheck } from 'lucide-react';
import { Order } from '../types';

interface OrderTrackerModalProps {
  order: Order | null;
  onClose: () => void;
  language: 'en' | 'kn';
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({ order, onClose, language }) => {
  const [etaMinutes, setEtaMinutes] = useState(12);
  const [cartProgress, setCartProgress] = useState(30); // percentage along the road

  useEffect(() => {
    if (!order) return;
    const interval = setInterval(() => {
      setCartProgress((prev) => (prev >= 95 ? 30 : prev + 5));
      setEtaMinutes((prev) => (prev <= 2 ? 12 : prev - 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [order]);

  if (!order) return null;

  const steps = [
    { key: 'PENDING', label: 'Order Sent', label_kn: 'ಆರ್ಡರ್ ಕಳುಹಿಸಲಾಗಿದೆ', icon: Clock },
    { key: 'ACCEPTED', label: 'Accepted by Vendor', label_kn: 'ವ್ಯಾಪಾರಿ ಒಪ್ಪಿಕೊಂಡಿದ್ದಾರೆ', icon: CheckCircle2 },
    { key: 'PACKED', label: 'Packed Fresh', label_kn: 'ಪ್ಯಾಕ್ ಮಾಡಲಾಗಿದೆ', icon: PackageCheck },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery / Pickup', label_kn: 'ವಿತರಣೆಗೆ ಸಿದ್ಧವಾಗಿದೆ', icon: Truck },
    { key: 'COMPLETED', label: 'Delivered', label_kn: 'ತಲುಪಿಸಲಾಗಿದೆ', icon: CheckCircle2 }
  ];

  const currentIdx = steps.findIndex((s) => s.key === order.status);
  const activeStep = currentIdx >= 0 ? currentIdx : 2;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
        
        {/* Blinkit/Zepto Express Delivery Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xs font-extrabold uppercase tracking-widest text-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              <span>{language === 'kn' ? 'ಲೈವ್ ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಟ್ರ್ಯಾಕರ್' : '15-Min Express Street Delivery'}</span>
            </div>
            <h3 className="text-2xl font-black mt-1">
              {language === 'kn' ? `${etaMinutes} ನಿಮಿಷಗಳಲ್ಲಿ ಆಗಮಿಸಲಿದೆ` : `Arriving in ${etaMinutes} mins`}
            </h3>
            <p className="text-xs text-emerald-100">
              Order #{order.order_number} • Direct from Local Street Cart
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Animated Live Cart Route Simulation Bar */}
        <div className="p-6 bg-slate-900 text-white space-y-3">
          <div className="flex justify-between text-xs font-bold text-slate-400">
            <span>📍 Gandhi Circle Mandi</span>
            <span className="text-emerald-400">⚡ Live Cart En Route ({cartProgress}%)</span>
            <span>🏠 Your Doorstep</span>
          </div>

          <div className="relative w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-700 rounded-full"
              style={{ width: `${cartProgress}%` }}
            />
            {/* Animated Delivery Cart Icon */}
            <div
              className="absolute top-1/2 -translate-y-1/2 text-sm transition-all duration-700"
              style={{ left: `calc(${cartProgress}% - 14px)` }}
            >
              🛒
            </div>
          </div>
        </div>

        {/* Order Details & Stepper */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-80">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-amber-800 font-semibold">
                {language === 'kn' ? 'ಪಾವತಿ ಸ್ಥಿತಿ' : 'Payment Mode'}: <strong>{order.payment_mode} (₹{order.total_amount})</strong>
              </span>
              <div className="text-xs text-amber-900 mt-0.5">
                Delivery PIN: <strong className="text-sm tracking-widest text-slate-900 bg-amber-200/80 px-2 py-0.5 rounded">4821</strong>
              </div>
            </div>
            <a
              href="tel:9876543210"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-emerald-700 transition"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Vendor</span>
            </a>
          </div>

          {/* Vertical Stepper */}
          <div className="space-y-5 relative pl-4 border-l-2 border-slate-200 ml-4">
            {steps.map((step, idx) => {
              const isDone = idx <= activeStep;
              const isCurrent = idx === activeStep;
              const Icon = step.icon;

              return (
                <div key={step.key} className="relative flex items-center space-x-3">
                  <div
                    className={`absolute -left-[25px] w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-300 text-slate-400'
                    } ${isCurrent ? 'ring-4 ring-emerald-100 animate-pulse' : ''}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                      {language === 'kn' ? step.label_kn : step.label}
                    </h4>
                    {isCurrent && (
                      <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                        {language === 'kn' ? 'ಪ್ರಸ್ತುತ ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ...' : 'Live activity right now'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero Plastic Packaging • Direct Farm Quality</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition"
          >
            {language === 'kn' ? 'ಮುಚ್ಚಿ' : 'Close Tracker'}
          </button>
        </div>

      </div>
    </div>
  );
};
