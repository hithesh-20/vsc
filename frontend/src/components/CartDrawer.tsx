import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, QrCode, CheckCircle2, Copy, Check } from 'lucide-react';
import { CartItem, Order } from '../types';
import { api } from '../services/api';
import { sounds } from '../services/sound';
import { getProductLocalizedName } from '../services/i18n';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  customerToken: string;
  onOrderSuccess: (order: Order) => void;
  language: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onClearCart,
  customerToken,
  onOrderSuccess,
  language
}) => {
  const [paymentMode, setPaymentMode] = useState<'COD' | 'UPI'>('UPI');
  const [address, setAddress] = useState('Doorstep Point (Village Main Road)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);

  if (!isOpen) return null;

  const totalAmount = items.reduce(
    (sum, item) => sum + item.product.selling_price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (items.length === 0) return;

    const vendorId = items[0].product.vendor_id;
    const payloadItems = items.map((i) => ({
      product_id: i.product.id,
      quantity: i.quantity
    }));

    if (paymentMode === 'UPI') {
      setPendingOrderData({ vendorId, payloadItems, totalAmount });
      setShowUpiModal(true);
      return;
    }

    // COD Direct Checkout
    setIsSubmitting(true);
    try {
      const res = await api.createOrder(customerToken, vendorId, payloadItems, paymentMode, address);
      if (res.data) {
        sounds.playVendorBell();
        onOrderSuccess(res.data);
        onClearCart();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmUpiPayment = async () => {
    if (!pendingOrderData) return;
    setIsSubmitting(true);
    try {
      const res = await api.createOrder(
        customerToken,
        pendingOrderData.vendorId,
        pendingOrderData.payloadItems,
        'UPI',
        address
      );
      if (res.data) {
        sounds.playSuccessChime();
        setShowUpiModal(false);
        onOrderSuccess(res.data);
        onClearCart();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText('ramesh.fresh@upi');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
        <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-500 to-amber-500 text-white">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5" />
              <h3 className="font-black text-lg">
                {language === 'kn' ? 'ನಿಮ್ಮ ಬುಟ್ಟಿ (Cart)' : 'Your Fresh Cart'}
              </h3>
              <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-bold">
                {items.length} {language === 'kn' ? 'ವಸ್ತುಗಳು' : 'items'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="py-20 text-center text-slate-400 space-y-3">
                <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
                <p className="text-sm font-bold">
                  {language === 'kn' ? 'ಬುಟ್ಟಿ ಖಾಲಿಯಾಗಿದೆ' : 'Your cart is empty'}
                </p>
                <p className="text-xs">
                  {language === 'kn' ? 'ತಾಜಾ ತರಕಾರಿ ಮತ್ತು ಹಣ್ಣುಗಳನ್ನು ಸೇರಿಸಿ' : 'Add fresh produce from nearby street carts'}
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-orange-200 transition"
                >
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {getProductLocalizedName(item.product, language)}
                    </h4>
                    <span className="text-xs text-slate-500">
                      {item.quantity} {item.product.unit} × ₹{item.product.selling_price}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="font-black text-sm text-slate-900">
                      ₹{item.product.selling_price * item.quantity}
                    </span>
                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Footer */}
          {items.length > 0 && (
            <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-4">
              
              {/* Delivery Address */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1 tracking-wider">
                  {language === 'kn' ? 'ವಿತರಣಾ ಸ್ಥಳ (Delivery Location)' : 'Delivery Point'}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1.5 tracking-wider">
                  {language === 'kn' ? 'ಪಾವತಿ ವಿಧಾನ (Payment Mode)' : 'Select Payment Mode'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMode('UPI')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition flex items-center justify-center space-x-2 ${
                      paymentMode === 'UPI'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>UPI / QR Code</span>
                  </button>

                  <button
                    onClick={() => setPaymentMode('COD')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition flex items-center justify-center space-x-2 ${
                      paymentMode === 'COD'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>💵 Cash on Delivery</span>
                  </button>
                </div>
              </div>

              {/* Total & Action */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-400 font-bold block">Total Mandi Price:</span>
                  <span className="text-2xl font-black text-slate-900">₹{totalAmount}</span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="py-3 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-2xl shadow-xl shadow-orange-200 flex items-center space-x-2 transition active:scale-95 disabled:opacity-50 text-xs sm:text-sm"
                >
                  <span>{language === 'kn' ? 'ಆರ್ಡರ್ ಮಾಡಿ' : 'Place Order'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* UPI NPCI QR CODE PAYMENT MODAL */}
      {showUpiModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-5 text-center animate-in zoom-in-95 border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
                <span>NPCI Bharat QR Gateway</span>
              </div>
              <button
                onClick={() => setShowUpiModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">₹{totalAmount}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Ramesh Fresh Vegetables Street Cart</p>
            </div>

            {/* Generated Interactive QR Code Graphic */}
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center space-y-2">
              <div className="w-44 h-44 bg-white p-2 rounded-xl shadow-inner flex items-center justify-center border border-slate-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=ramesh.fresh@upi&pn=RameshFreshVegetables&am=${totalAmount}&cu=INR`)}`}
                  alt="UPI QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[11px] font-bold text-slate-500">Scan with Google Pay, PhonePe, Paytm</span>
            </div>

            {/* Copy UPI ID */}
            <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-xl text-xs">
              <span className="font-mono text-slate-700 font-bold">ramesh.fresh@upi</span>
              <button
                onClick={copyUpiId}
                className="text-orange-600 font-black hover:text-orange-700 flex items-center space-x-1"
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUpi ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {/* Confirm Payment CTA */}
            <button
              onClick={handleConfirmUpiPayment}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition shadow-lg shadow-emerald-200 text-xs flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ಪಾವತಿ ಪೂರ್ಣಗೊಂಡಿದೆ (Verify & Complete Order)</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
