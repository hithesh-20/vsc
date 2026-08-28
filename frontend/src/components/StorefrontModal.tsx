import React, { useEffect, useState } from 'react';
import { X, Plus, Minus, Star, Clock, MapPin, CheckCircle, Phone, Bell, Zap, ShieldCheck } from 'lucide-react';
import { Vendor, Product } from '../types';
import { api } from '../services/api';
import { sounds } from '../services/sound';

interface StorefrontModalProps {
  vendor: Vendor | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  language: string;
}

export const StorefrontModal: React.FC<StorefrontModalProps> = ({
  vendor,
  onClose,
  onAddToCart,
  language
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<{ [id: string]: number }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [bellRung, setBellRung] = useState(false);

  useEffect(() => {
    if (vendor) {
      setIsLoading(true);
      api.getVendorCatalog(vendor.vendor_id).then((data) => {
        setProducts(data);
        setIsLoading(false);
      });
    }
  }, [vendor]);

  if (!vendor) return null;

  const handleQuantityChange = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const handleAdd = (product: Product) => {
    const qty = quantities[product.id] || 1;
    onAddToCart(product, qty);
    sounds.playCashRegister();
  };

  const handleRingBell = () => {
    sounds.playVendorBell();
    setBellRung(true);
    setTimeout(() => setBellRung(false), 2500);

    if ('speechSynthesis' in window) {
      const msg = language === 'kn'
        ? `${vendor.business_name} ಅವರ ಗಾಡಿ ನಿಮ್ಮ ಹತ್ತಿರ ಬರುತ್ತಿದೆ!`
        : `${vendor.business_name}'s cart bell is ringing!`;
      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.lang = language === 'kn' ? 'kn-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        {/* Header with Live Cart Status Radar */}
        <div className="p-6 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase bg-white/20 backdrop-blur px-2.5 py-0.5 rounded-full flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
              <span>{vendor.business_category}</span>
            </span>
            <span className="text-[10px] font-black uppercase bg-emerald-500/80 px-2.5 py-0.5 rounded-full text-white">
              ⚡ Live Street Cart
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black">
            {language === 'kn' && vendor.business_name_kn ? vendor.business_name_kn : vendor.business_name}
          </h3>

          <div className="flex flex-wrap items-center gap-4 text-xs text-orange-100 mt-2">
            <span className="flex items-center space-x-1 font-bold text-amber-200">
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span>{vendor.rating_avg} Rating</span>
            </span>
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{vendor.distance_km} km away</span>
            </span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{vendor.working_hours}</span>
            </span>
          </div>

          {/* Action Row: Ring Bell & Call */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleRingBell}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-black text-xs rounded-xl backdrop-blur flex items-center space-x-1.5 transition active:scale-95"
            >
              <Bell className={`w-3.5 h-3.5 ${bellRung ? 'animate-spin' : ''}`} />
              <span>{bellRung ? '🔔 Bell Ringing!' : 'Ring Cart Bell'}</span>
            </button>

            <a
              href="tel:9876543210"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center space-x-1.5 transition"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Vendor</span>
            </a>
          </div>
        </div>

        {/* Product Catalog List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-base text-slate-900">
              {language === 'kn' ? 'ತಾಜಾ ಮಂಡಿ ಸರಕುಗಳು (Available Fresh Stock)' : 'Today\'s Fresh Produce'}
            </h4>
            <span className="text-xs text-slate-400 font-bold">
              {products.length} {language === 'kn' ? 'ವಸ್ತುಗಳು ಲಭ್ಯವಿದೆ' : 'items ready to deliver'}
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              ದಾಸ್ತಾನು ಲೋಡ್ ಆಗುತ್ತಿದೆ (Loading catalog)...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {products.map((product) => {
                const qty = quantities[product.id] || 1;
                const isLow = product.current_stock <= product.low_stock_threshold;

                return (
                  <div
                    key={product.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-orange-300 transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-orange-600">
                          ₹{product.selling_price}/{product.unit}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isLow ? 'Limited Stock' : 'Farm Fresh'}
                        </span>
                      </div>

                      <h5 className="font-extrabold text-sm text-slate-900 mt-1">
                        {language === 'kn' && product.name_kn ? product.name_kn : product.name_en}
                      </h5>
                      <span className="text-xs text-slate-400 font-medium">
                        Stock: {product.current_stock} {product.unit}
                      </span>
                    </div>

                    {/* Quantity Selector & Add Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200">
                        <button
                          onClick={() => handleQuantityChange(product.id, -1)}
                          className="text-slate-500 hover:text-slate-800 p-0.5"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black w-5 text-center text-slate-900">
                          {qty}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(product.id, 1)}
                          className="text-slate-500 hover:text-slate-800 p-0.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleAdd(product)}
                        className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{language === 'kn' ? 'ಸೇರಿಸಿ' : 'Add'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 flex-shrink-0">
          <div className="flex items-center space-x-1 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero Plastic Packaging • Direct Mandi Price</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition"
          >
            {language === 'kn' ? 'ಮುಚ್ಚಿ' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
