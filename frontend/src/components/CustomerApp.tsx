import React, { useState, useEffect, useMemo } from 'react';
import {
  Home, Receipt, NotebookPen, User as UserIcon, ShoppingBag, Plus, Minus, Trash2,
  Star, MapPin, Clock, X, ArrowRight, QrCode, Banknote, NotebookTabs, Search,
  ChevronLeft, CheckCircle2, BadgeIndianRupee, Smartphone, Languages, LogOut, RefreshCw,
  Truck, PackageCheck
} from 'lucide-react';
import { Vendor, Product, Order, CartItem } from '../types';
import { api } from '../services/api';
import { customerAppApi, AppSession, subscribeToOrderUpdates, LiveOrderEvent } from '../services/auth';
import { getAppStrings, getProductLocalizedName } from '../services/i18n';
import { sounds } from '../services/sound';

interface CustomerAppProps {
  session: AppSession;
  onLogout: () => void;
  onLanguageChange: (lang: string) => void;
}

type Tab = 'home' | 'orders' | 'udhaar' | 'profile';

const TRACK_STEPS = ['PENDING', 'ACCEPTED', 'PACKED', 'OUT_FOR_DELIVERY', 'COMPLETED'] as const;

/** Vertical status timeline: placed → packed → out for delivery → delivered. */
const OrderTimeline: React.FC<{ status: Order['status']; t: Record<string, string> }> = ({ status, t }) => {
  const idx = TRACK_STEPS.indexOf(status as typeof TRACK_STEPS[number]);
  if (idx === -1) return null; // CANCELLED or unknown → no timeline
  const labels = [t.stepPlaced, t.stepPacked, t.stepOutForDelivery, t.stepDelivered];
  return (
    <div className="mt-3 pl-1">
      {TRACK_STEPS.slice(0, 4).map((step, i) => {
        const done = i < idx;
        const current = i === idx;
        const last = i === 3;
        return (
          <div key={step} className="flex items-start space-x-2.5">
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                done ? 'bg-emerald-500' : current ? 'bg-orange-500 ring-4 ring-orange-100' : 'bg-slate-200'
              }`}>
                {done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                {current && (i === 3
                  ? <PackageCheck className="w-3 h-3 text-white" />
                  : <Truck className={`w-3 h-3 text-white ${current && i === 2 ? 'animate-pulse' : ''}`} />)}
              </div>
              {!last && <div className={`w-0.5 h-5 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
            </div>
            <span className={`text-[11px] font-black leading-5 ${
              current ? 'text-orange-600' : done ? 'text-slate-600' : 'text-slate-300'
            }`}>
              {labels[i]}{current && i === 0 ? '…' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const FALLBACK_VENDORS: Vendor[] = [
  {
    vendor_id: 'vendor-1', business_name: 'Ramesh Fresh Vegetables Cart', business_name_kn: 'ರಮೇಶ್ ತಾಜಾ ತರಕಾರಿ ಗಾಡಿ',
    business_category: 'Vegetables', latitude: 12.9751, longitude: 77.5971, distance_km: 0.4,
    rating_avg: 4.9, is_accepting_orders: true, working_hours: '06:30 AM - 07:30 PM', product_count: 8,
  },
  {
    vendor_id: 'vendor-2', business_name: 'Manjunath Fruits Moped', business_name_kn: 'ಮಂಜುನಾಥ್ ಹಣ್ಣಿನ ಬೈಕ್',
    business_category: 'Fruits', latitude: 12.9682, longitude: 77.5905, distance_km: 0.8,
    rating_avg: 4.8, is_accepting_orders: true, working_hours: '07:00 AM - 08:00 PM', product_count: 6,
  },
];

export const CustomerApp: React.FC<CustomerAppProps> = ({ session, onLogout, onLanguageChange }) => {
  const t = getAppStrings(session.language);
  const [tab, setTab] = useState<Tab>('home');

  // data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [udhaar, setUdhaar] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  // storefront
  const [storeVendor, setStoreVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [qty, setQty] = useState<{ [id: string]: number }>({});

  // cart + checkout
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [address, setAddress] = useState('Doorstep · Main Road');
  const [payMode, setPayMode] = useState<'UPI' | 'CASH' | 'UDHAAR'>('UPI');
  const [placing, setPlacing] = useState(false);
  const [upiResult, setUpiResult] = useState<any>(null);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  // misc
  const [search, setSearch] = useState('');
  const [liveStatuses, setLiveStatuses] = useState<{ [orderId: string]: { status: string; at: number } }>({});
  const [liveOnline, setLiveOnline] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<{ [orderId: string]: boolean }>({});

  useEffect(() => {
    api.getNearbyVendors(12.9716, 77.5946).then(v => setVendors(v.length ? v : FALLBACK_VENDORS));
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshData = async () => {
    try {
      const [o, u, p] = await Promise.all([
        customerAppApi.getMyOrders(session.access_token),
        customerAppApi.getMyUdhaar(session.access_token),
        customerAppApi.getProfile(session.access_token),
      ]);
      setOrders(o);
      setUdhaar(u);
      setProfile(p);
    } catch { /* backend offline: demo mode */ }
  };

  // Live push channel from the vendor's status updates (auto-reconnects)
  useEffect(() => {
    const unsubscribe = subscribeToOrderUpdates(
      session.user_id,
      (ev: LiveOrderEvent) => {
        setLiveStatuses(prev => ({ ...prev, [ev.order_id]: { status: ev.status, at: Date.now() } }));
        sounds.playSuccessChime();
      },
      setLiveOnline,
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user_id]);

  // Periodic refresh as a safety net (also catches CANCELLED + payment changes)
  useEffect(() => {
    const id = window.setInterval(refreshData, 30000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Orders merged with any fresher live WebSocket status. */
  const liveOrders: Order[] = useMemo(
    () => orders.map(o => {
      const live = liveStatuses[o.id];
      return live && live.status !== o.status ? { ...o, status: live.status as Order['status'] } : o;
    }),
    [orders, liveStatuses]
  );
  const activeOrders = liveOrders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status));
  const pastOrders = liveOrders.filter(o => ['COMPLETED', 'CANCELLED'].includes(o.status));

  const totalUdhaar = useMemo(
    () => udhaar.filter(r => r.remaining_balance > 0).reduce((s, r) => s + r.remaining_balance, 0),
    [udhaar]
  );

  const openStore = async (v: Vendor) => {
    setStoreVendor(v);
    setProducts(await api.getVendorCatalog(v.vendor_id));
  };

  const addToCart = (p: Product) => {
    const q = qty[p.id] || 1;
    setCart(prev => {
      const i = prev.findIndex(x => x.product.id === p.id);
      if (i > -1) { const next = [...prev]; next[i] = { ...next[i], quantity: next[i].quantity + q }; return next; }
      return [...prev, { product: p, quantity: q }];
    });
    setQty(prev => ({ ...prev, [p.id]: 1 }));
    sounds.playCashRegister();
  };

  const cartTotal = cart.reduce((s, i) => s + i.product.selling_price * i.quantity, 0);

  const placeOrder = async () => {
    if (!cart.length) return;
    setPlacing(true);
    const vendorId = cart[0].product.vendor_id;
    const items = cart.map(i => ({ product_id: i.product.id, quantity: i.quantity }));
    try {
      let order: Order | null = null;
      if (payMode === 'UDHAAR') {
        order = await customerAppApi.placeUdhaarOrder(session.access_token, vendorId, items, address);
      } else {
        const res = await api.createOrder(session.access_token, vendorId, items, payMode, address);
        order = res?.data || null;
      }
      if (order) {
        if (payMode === 'UPI') {
          try { setUpiResult(await customerAppApi.payOrder(session.access_token, order.id, 'UPI')); } catch { /* demo */ }
        }
        setSuccessOrder(order);
        setCart([]);
        setCartOpen(false);
        sounds.playSuccessChime();
        refreshData();
      }
    } catch (e: any) {
      alert(e.message || 'Order failed');
    } finally {
      setPlacing(false);
    }
  };

  const payExistingOrder = async (orderId: string, mode: 'UPI' | 'CASH') => {
    try {
      const res = await customerAppApi.payOrder(session.access_token, orderId, mode);
      if (res?.upi_intent_uri) setUpiResult(res);
      refreshData();
    } catch (e: any) { alert(e.message || 'Payment failed'); }
  };

  const repayUdhaar = async (recordId: string, mode: 'UPI' | 'CASH') => {
    try {
      const res = await customerAppApi.repayUdhaar(session.access_token, recordId, mode);
      if (res?.upi_intent_uri) setUpiResult(res);
      else if (mode === 'UPI') sounds.playSuccessChime();
      refreshData();
    } catch (e: any) { alert(e.message || 'Repayment failed'); }
  };

  const changeLanguage = async (lang: string) => {
    onLanguageChange(lang);
    try { await customerAppApi.updateLanguage(session.access_token, lang); } catch { /* demo */ }
  };

  const filteredVendors = vendors.filter(v =>
    !search ||
    v.business_name.toLowerCase().includes(search.toLowerCase()) ||
    v.business_category.toLowerCase().includes(search.toLowerCase())
  );

  // ============================ STOREFRONT ============================
  const storefrontView = storeVendor ? (
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        <div className="bg-white px-4 pt-3 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <button onClick={() => setStoreVendor(null)} className="p-2 -ml-2 rounded-xl hover:bg-slate-100">
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-slate-900 truncate">{storeVendor.business_name}</h2>
              <p className="text-[11px] font-bold text-slate-400 flex items-center space-x-2">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" /><span>{storeVendor.rating_avg}</span>
                <MapPin className="w-3 h-3" /><span>{storeVendor.distance_km} km</span>
                <Clock className="w-3 h-3" /><span>{storeVendor.working_hours}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-3.5 flex items-center justify-between">
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm text-slate-900 truncate">{getProductLocalizedName(p, session.language)}</h4>
                <p className="text-[11px] text-slate-400 font-bold">
                  ₹{p.selling_price}/{p.unit} • {t.items}: {p.current_stock}
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-2">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl">
                  <button onClick={() => setQty(s => ({ ...s, [p.id]: Math.max(1, (s[p.id] || 1) - 1) }))} className="p-1.5 text-slate-500"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="w-5 text-center text-xs font-black">{qty[p.id] || 1}</span>
                  <button onClick={() => setQty(s => ({ ...s, [p.id]: (s[p.id] || 1) + 1 }))} className="p-1.5 text-slate-500"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={() => addToCart(p)} className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black rounded-xl active:scale-95 transition">
                  {t.addToCart}
                </button>
              </div>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="p-3 bg-white border-t border-slate-100">
            <button
              onClick={() => setCartOpen(true)}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl shadow-lg shadow-orange-100 flex items-center justify-center space-x-2 active:scale-[0.98] transition"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t.cart} · ₹{cartTotal}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    ) : null;

  // ============================ MAIN APP ============================
  return (
    <>
      {storefrontView}
      {!storeVendor && (
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
      {/* ===== HOME ===== */}
      {tab === 'home' && (
        <>
          <div className="px-4 pt-5 pb-3 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400">{t.welcome} 👋</p>
                <h2 className="text-lg font-black text-slate-900">{session.name || session.phone}</h2>
              </div>
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2.5 bg-orange-500 text-white rounded-2xl shadow-md shadow-orange-200 active:scale-95 transition"
              >
                <ShoppingBag className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
            <div className="mt-3.5 flex items-center bg-slate-100 rounded-2xl px-3.5 py-2.5 space-x-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.searchVendors}
                className="flex-1 bg-transparent outline-none text-sm font-semibold text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
            <h3 className="pt-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">{t.nearbyVendors}</h3>
            {filteredVendors.map(v => (
              <button
                key={v.vendor_id}
                onClick={() => openStore(v)}
                className="w-full bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between text-left active:scale-[0.99] transition shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-extrabold text-sm text-slate-900 truncate">{v.business_name}</h4>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">LIVE</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                    {v.business_category} • {v.distance_km} km • ⭐ {v.rating_avg}
                  </p>
                </div>
                <span className="ml-3 px-3.5 py-2 bg-orange-50 text-orange-600 text-xs font-black rounded-xl border border-orange-100">
                  {t.viewStore}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ===== ORDERS ===== */}
      {tab === 'orders' && (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <h2 className="pt-5 pb-1 text-xl font-black text-slate-900">{t.myOrders}</h2>
          {orders.length === 0 ? (
            <div className="pt-20 text-center">
              <Receipt className="w-12 h-12 mx-auto text-slate-200" />
              <p className="mt-3 font-black text-slate-500">{t.noOrders}</p>
              <p className="text-xs text-slate-400 font-semibold mt-1">{t.noOrdersSub}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.length > 0 && (
                <div className="flex items-center space-x-1.5 pb-1 pt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${liveOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {liveOnline ? t.liveTracking : t.liveOffline}
                  </span>
                  <span className="flex-1 h-px bg-slate-100" />
                </div>
              )}
              {liveOrders.map(o => {
                const isActive = !['COMPLETED', 'CANCELLED'].includes(o.status);
                const expanded = expandedOrders[o.id] !== false;
                const justUpdated = !!liveStatuses[o.id] && Date.now() - liveStatuses[o.id].at < 60000;
                return (
                <div key={o.id} className={`bg-white rounded-2xl border p-4 ${isActive && justUpdated ? 'border-orange-200 shadow-sm shadow-orange-50' : 'border-slate-100'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-sm text-slate-900">{o.order_number}</p>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                        {new Date(o.created_at).toLocaleDateString()} • {o.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">₹{o.total_amount}</p>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        o.payment_status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {o.payment_status === 'COMPLETED' ? t.paid : t.pending}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <button
                      onClick={() => setExpandedOrders(s => ({ ...s, [o.id]: !s[o.id] }))}
                      className="mt-2.5 flex items-center space-x-1 text-[10px] font-black text-orange-600 active:scale-95 transition"
                    >
                      <Truck className="w-3 h-3" />
                      <span>{expanded ? t.hideDetails : t.viewDetails}</span>
                    </button>
                  )}
                  {isActive && expanded && (
                    <>
                      <OrderTimeline status={o.status} t={t} />
                      {justUpdated && <p className="mt-1.5 text-[9px] font-black text-emerald-500">✓ {t.statusUpdated}</p>}
                    </>
                  )}
                  {o.payment_status !== 'COMPLETED' && o.payment_mode !== 'UDHAAR' && (
                    <div className="mt-3 flex space-x-2">
                      <button onClick={() => payExistingOrder(o.id, 'UPI')} className="flex-1 py-2.5 bg-orange-500 text-white text-xs font-black rounded-xl active:scale-95 transition">
                        {t.payNow} · UPI
                      </button>
                      <button onClick={() => payExistingOrder(o.id, 'CASH')} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-black rounded-xl active:scale-95 transition">
                        {t.cash}
                      </button>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== UDHAAR ===== */}
      {tab === 'udhaar' && (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <h2 className="pt-5 pb-1 text-xl font-black text-slate-900">{t.myUdhaar}</h2>
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-200">
            <p className="text-[11px] font-bold opacity-80">{t.owed}</p>
            <p className="text-3xl font-black mt-0.5">₹{totalUdhaar.toFixed(0)}</p>
            <p className="text-[11px] font-semibold opacity-80 mt-1">
              {udhaar.filter(r => r.remaining_balance > 0).length} {t.items} • {t.udhaarPay}
            </p>
          </div>

          {udhaar.length === 0 ? (
            <div className="pt-14 text-center">
              <NotebookTabs className="w-12 h-12 mx-auto text-slate-200" />
              <p className="mt-3 font-black text-slate-500">{t.noUdhaar}</p>
              <p className="text-xs text-slate-400 font-semibold mt-1">{t.noUdhaarSub}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {udhaar.map(r => (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-sm text-slate-900">{r.customer_name}</p>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">{r.notes || 'Vendor credit account'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">₹{r.remaining_balance}</p>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        r.status === 'SETTLED' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {r.status === 'SETTLED' ? t.settled : t.owed}
                      </span>
                    </div>
                  </div>
                  {r.remaining_balance > 0 && (
                    <div className="mt-3 flex space-x-2">
                      <button onClick={() => repayUdhaar(r.id, 'UPI')} className="flex-1 py-2.5 bg-violet-600 text-white text-xs font-black rounded-xl active:scale-95 transition flex items-center justify-center space-x-1.5">
                        <Smartphone className="w-3.5 h-3.5" /><span>{t.repay} · UPI</span>
                      </button>
                      <button onClick={() => repayUdhaar(r.id, 'CASH')} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-black rounded-xl active:scale-95 transition">
                        {t.cash}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== PROFILE ===== */}
      {tab === 'profile' && (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <h2 className="pt-5 pb-3 text-xl font-black text-slate-900">{t.profile}</h2>
          <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center">
              <UserIcon className="w-7 h-7 text-orange-600" />
            </div>
            <div>
              <p className="font-black text-slate-900">{profile?.name || session.name || 'Customer'}</p>
              <p className="text-xs font-bold text-slate-400">+91 {session.phone}</p>
              <p className="text-[11px] font-bold text-amber-600 mt-0.5">⭐ {profile?.loyalty_points ?? 0} loyalty points</p>
            </div>
          </div>

          <h3 className="mt-5 mb-2 text-[11px] font-black text-slate-400 uppercase tracking-wider">{t.language}</h3>
          <div className="bg-white rounded-2xl border border-slate-100 p-2 grid grid-cols-3 gap-1.5">
            {['en', 'kn', 'hi', 'te', 'ta', 'mr', 'bn', 'gu', 'pa', 'ml', 'or', 'as'].map(code => (
              <button
                key={code}
                onClick={() => changeLanguage(code)}
                className={`py-2 rounded-xl text-xs font-black transition ${
                  session.language === code ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600'
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] font-semibold text-slate-400 px-1">
            All 23 Indian languages available at first launch; quick-switch here for the popular ones.
          </p>

          <button
            onClick={onLogout}
            className="mt-5 w-full py-3.5 bg-white border border-rose-100 text-rose-600 font-black rounded-2xl flex items-center justify-center space-x-2 active:scale-[0.98] transition"
          >
            <LogOut className="w-4 h-4" /><span>{t.logout}</span>
          </button>
        </div>
      )}

      {/* ===== BOTTOM TAB BAR (native style) ===== */}
      <div className="bg-white/95 backdrop-blur border-t border-slate-100 px-2 pt-1.5 pb-2 flex justify-around">
        {([
          ['home', Home, t.home],
          ['orders', Receipt, t.orders],
          ['udhaar', NotebookPen, t.udhaar],
          ['profile', UserIcon, t.profile],
        ] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key as Tab); sounds.playTap(); }}
            className={`flex flex-col items-center px-4 py-1 rounded-2xl transition ${
              tab === key ? 'text-orange-600' : 'text-slate-400'
            }`}
          >
            <Icon className={`w-5 h-5 ${tab === key ? 'scale-110' : ''} transition`} />
            <span className="text-[10px] font-black mt-0.5">{label}</span>
            {tab === key && <span className="w-1 h-1 rounded-full bg-orange-500 mt-0.5" />}
          </button>
        ))}
      </div>

      </div>
      )}

      {/* ===== CART SHEET ===== */}
      {cartOpen && (
        <div className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-end" onClick={() => setCartOpen(false)}>
          <div className="w-full bg-white rounded-t-3xl max-h-[85%] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900">{t.yourCart}</h3>
              <button onClick={() => setCartOpen(false)} className="p-1.5 rounded-full bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {cart.length === 0 ? (
                <p className="py-12 text-center text-sm font-bold text-slate-400">{t.emptyCart}</p>
              ) : cart.map(i => (
                <div key={i.product.id} className="flex items-center justify-between bg-slate-50 rounded-2xl p-3">
                  <div>
                    <p className="font-extrabold text-sm text-slate-900">{getProductLocalizedName(i.product, session.language)}</p>
                    <p className="text-[11px] font-bold text-slate-400">₹{i.product.selling_price} × {i.quantity} {i.product.unit}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-sm">₹{i.product.selling_price * i.quantity}</span>
                    <button onClick={() => setCart(c => c.filter(x => x.product.id !== i.product.id))} className="p-1.5 text-rose-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-100 space-y-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t.deliveryAddress}</label>
                  <input
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-800 outline-none border border-slate-100 focus:border-orange-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t.paymentMethod}</label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {([
                      ['UPI', QrCode, t.upi],
                      ['CASH', Banknote, t.cash],
                      ['UDHAAR', NotebookTabs, t.udhaarPay],
                    ] as const).map(([mode, Icon, label]) => (
                      <button
                        key={mode}
                        onClick={() => setPayMode(mode)}
                        className={`py-2.5 rounded-xl border-2 text-[10px] font-black flex flex-col items-center space-y-1 transition ${
                          payMode === mode ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-100 bg-white text-slate-500'
                        }`}
                      >
                        <Icon className="w-4 h-4" /><span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">{t.total}</p>
                    <p className="text-2xl font-black text-slate-900">₹{cartTotal}</p>
                  </div>
                  <button
                    onClick={placeOrder}
                    disabled={placing}
                    className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl shadow-lg shadow-orange-200 active:scale-95 transition disabled:opacity-60"
                  >
                    {placing ? '…' : t.placeOrder}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SUCCESS SHEET ===== */}
      {successOrder && (
        <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setSuccessOrder(null)}>
          <div className="w-full bg-white rounded-3xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-xl font-black text-slate-900">{t.orderPlaced}</h3>
            <p className="text-xs font-bold text-slate-400 mt-1">{successOrder.order_number} • {t.orderPlacedSub}</p>
            <p className="mt-3 text-3xl font-black text-slate-900">₹{successOrder.total_amount}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-[11px] font-black">
              {successOrder.payment_mode}
            </span>
            <button onClick={() => setSuccessOrder(null)} className="mt-5 w-full py-3.5 bg-slate-900 text-white font-black rounded-2xl active:scale-[0.98] transition">
              {t.thanks}
            </button>
          </div>
        </div>
      )}

      {/* ===== UPI SHEET ===== */}
      {upiResult && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setUpiResult(null)}>
          <div className="w-full bg-white rounded-3xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center space-x-1.5 text-[10px] font-black text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full mx-auto w-fit">
              <BadgeIndianRupee className="w-3 h-3" /><span>NPCI UPI • Demo Gateway</span>
            </div>
            <p className="mt-4 text-3xl font-black text-slate-900">₹{upiResult.amount ?? upiResult.settled_amount}</p>
            <p className="text-xs font-bold text-slate-400 mt-0.5">{upiResult.vpa || upiResult.vendor_name}</p>
            <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiResult.upi_intent_uri || upiResult.qr_payload || 'upi://pay')}`}
                alt="UPI QR" className="w-40 h-40 mx-auto rounded-xl bg-white p-1.5"
              />
              <p className="mt-1.5 text-[10px] font-bold text-slate-400">Scan with GPay / PhonePe / Paytm</p>
            </div>
            <p className="mt-3 text-[11px] font-black text-emerald-600">✓ {upiResult.payment_status} • {upiResult.transaction_id}</p>
            <button onClick={() => { setUpiResult(null); sounds.playSuccessChime(); }} className="mt-4 w-full py-3.5 bg-emerald-600 text-white font-black rounded-2xl active:scale-[0.98] transition">
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
