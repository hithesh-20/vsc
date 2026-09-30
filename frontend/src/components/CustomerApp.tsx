import React, { useState, useEffect, useMemo } from 'react';
import {
  Home, Receipt, NotebookPen, User as UserIcon, ShoppingBag, Plus, Minus, Trash2,
  Star, MapPin, Clock, X, ArrowRight, QrCode, Banknote, NotebookTabs, Search,
  ChevronLeft, ChevronRight, CheckCircle2, BadgeIndianRupee, Smartphone, Languages, LogOut,
  Truck, PackageCheck, Wallet, Sparkles, Store, Info, RefreshCw
} from 'lucide-react';
import { Vendor, Product, Order, CartItem } from '../types';
import { api } from '../services/api';
import { customerAppApi, AppSession, subscribeToOrderUpdates, LiveOrderEvent } from '../services/auth';
import { getAppStrings, getProductLocalizedName, INDIAN_LANGUAGES } from '../services/i18n';
import { productEmoji, vendorEmoji, buildStorefrontFilters, storefrontFilterLabel, categoryEmoji } from '../services/productEmoji';
import { ProductImage } from './ProductImage';
import { sounds } from '../services/sound';
import { FloatingVoiceAssistant } from './FloatingVoiceAssistant';

interface CustomerAppProps {
  session: AppSession;
  onLogout: () => void;
  onLanguageChange: (lang: string) => void;
}

type Tab = 'home' | 'orders' | 'udhaar' | 'profile';

const TRACK_STEPS = ['PENDING', 'ACCEPTED', 'PACKED', 'OUT_FOR_DELIVERY', 'COMPLETED'] as const;

/** Friendly status label + colors for pills. */
const statusMeta = (status: string, t: Record<string, string>) => {
  switch (status) {
    case 'PENDING': return { label: t.stepPlaced, pill: 'bg-amber-50 text-amber-600 border border-amber-100', bar: 'bg-amber-400' };
    case 'ACCEPTED': return { label: t.confirmed, pill: 'bg-sky-50 text-sky-600 border border-sky-100', bar: 'bg-sky-400' };
    case 'PACKED': return { label: t.stepPacked, pill: 'bg-indigo-50 text-indigo-600 border border-indigo-100', bar: 'bg-indigo-400' };
    case 'OUT_FOR_DELIVERY': return { label: t.stepOutForDelivery, pill: 'bg-orange-50 text-orange-600 border border-orange-100', bar: 'bg-orange-500' };
    case 'COMPLETED': return { label: t.stepDelivered, pill: 'bg-emerald-50 text-emerald-600 border border-emerald-100', bar: 'bg-emerald-500' };
    default: return { label: status, pill: 'bg-slate-50 text-slate-500 border border-slate-100', bar: 'bg-slate-300' };
  }
};

/** Compact 4-segment progress for a collapsed order card. */
const StatusProgress: React.FC<{ status: Order['status'] }> = ({ status }) => {
  const idx = TRACK_STEPS.indexOf(status as typeof TRACK_STEPS[number]);
  if (idx === -1) return null;
  return (
    <div className="flex items-center space-x-1 mt-2">
      {TRACK_STEPS.slice(0, 4).map((_, i) => (
        <div key={i} className={`h-1 flex-1 rounded-full transition ${i <= idx ? (status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-orange-500') : 'bg-slate-100'}`} />
      ))}
    </div>
  );
};

/** Vertical status timeline: placed → packed → out for delivery → delivered. */
const OrderTimeline: React.FC<{ status: Order['status']; t: Record<string, string> }> = ({ status, t }) => {
  const idx = TRACK_STEPS.indexOf(status as typeof TRACK_STEPS[number]);
  if (idx === -1) return null; // CANCELLED or unknown → no timeline
  const labels = [t.stepPlaced, t.confirmed, t.stepPacked, t.stepOutForDelivery, t.stepDelivered];
  const icons = [ShoppingBag, CheckCircle2, PackageCheck, Truck, PackageCheck];
  return (
    <div className="mt-3 pl-1">
      {TRACK_STEPS.map((step, i) => {
        const done = i < idx;
        const current = i === idx;
        const last = i === 4;
        const Icon = icons[i];
        return (
          <div key={step} className="flex items-start space-x-2.5">
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                done ? 'bg-emerald-500' : current ? 'bg-orange-500 ring-4 ring-orange-100' : 'bg-slate-200'
              }`}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  : <Icon className={`w-3 h-3 text-white ${current && i === 3 ? 'animate-pulse' : ''}`} />}
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
  const [storeCategory, setStoreCategory] = useState('All'); // storefront filter chip
  const [qty, setQty] = useState<{ [id: string]: number }>({}); // quantity picker in storefront

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
  const [category, setCategory] = useState('All');
  const [orderFilter, setOrderFilter] = useState<'active' | 'history'>('active');
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach(v => set.add(v.business_category));
    return ['All', ...Array.from(set)];
  }, [vendors]);

  const openStore = async (v: Vendor) => {
    setStoreVendor(v);
    setStoreCategory('All');
    setProducts(await api.getVendorCatalog(v.vendor_id));
  };

  const addToCart = (p: Product) => {
    const q = qty[p.id] || 1;
    // One cart = one vendor (like street shopping): ask before switching carts.
    const cartVendorId = cart[0]?.product.vendor_id;
    if (cartVendorId && cartVendorId !== p.vendor_id) {
      const other = vendors.find(v => v.vendor_id === cartVendorId)?.business_name || 'another vendor';
      const mine = storeVendor?.business_name || vendors.find(v => v.vendor_id === p.vendor_id)?.business_name || 'this vendor';
      const ok = window.confirm(`Your cart has items from ${other}. Empty it and start a new cart from ${mine}?`);
      if (!ok) return;
      setCart([{ product: p, quantity: q }]);
    } else {
      setCart(prev => {
        const i = prev.findIndex(x => x.product.id === p.id);
        if (i > -1) { const next = [...prev]; next[i] = { ...next[i], quantity: next[i].quantity + q }; return next; }
        return [...prev, { product: p, quantity: q }];
      });
    }
    setQty(prev => ({ ...prev, [p.id]: 1 }));
    sounds.playCashRegister();
  };

  const setCartItemQty = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((s, i) => s + i.product.selling_price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

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
      alert(`${t.orderFailed}: ${e.message || 'Order failed'}`);
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
  ).filter(v => category === 'All' || v.business_category === category);

  const initials = (session.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const quickLangs = ['en', 'kn', 'hi', 'te', 'ta', 'mr', 'bn', 'gu', 'pa', 'ml', 'or', 'as'];
  const langNative = (code: string) => INDIAN_LANGUAGES.find(l => l.code === code)?.native || code.toUpperCase();

  // Storefront category chips derived from the loaded catalog (backend category names)
  const storeChips = useMemo(() => buildStorefrontFilters(products), [products]);
  const filteredProducts = useMemo(
    () => storeCategory === 'All'
      ? products
      : products.filter(p => p.category_name && storefrontFilterLabel(p.category_name) === storeCategory),
    [products, storeCategory]
  );

  // ============================ STOREFRONT ============================
  const storefrontView = storeVendor ? (
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 px-4 pt-4 pb-5 rounded-b-[2rem]">
          <div className="flex items-center space-x-3">
            <button onClick={() => setStoreVendor(null)} className="p-2 -ml-2 rounded-xl bg-white/15 active:scale-95 transition">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
              {vendorEmoji(storeVendor.business_category)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-white truncate">{storeVendor.business_name}</h2>
              <div className="flex items-center space-x-2 text-[11px] font-bold text-white/85">
                <span className="flex items-center space-x-0.5"><Star className="w-3 h-3 fill-amber-300 text-amber-300" /><span>{storeVendor.rating_avg}</span></span>
                <span className="flex items-center space-x-0.5"><MapPin className="w-3 h-3" /><span>{storeVendor.distance_km} km</span></span>
                <span className="flex items-center space-x-0.5"><Clock className="w-3 h-3" /><span>{storeVendor.working_hours}</span></span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {/* Category filter chips: All / Vegetables / Spices / Staples / Dairy ... */}
          {storeChips.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
              {['All', ...storeChips].map(chip => (
                <button
                  key={chip}
                  onClick={() => { setStoreCategory(chip); sounds.playTap(); }}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap border transition active:scale-95 ${
                    storeCategory === chip
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-500 border-slate-100'
                  }`}
                >
                  {chip === 'All' ? `✦ ${chip}` : `${categoryEmoji(chip)} ${chip}`}
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            {storeCategory === 'All' ? `${products.length} ${t.items}` : `${filteredProducts.length} ${t.items}`}
          </p>
          {filteredProducts.map(p => {
            const low = p.current_stock > 0 && p.current_stock <= p.low_stock_threshold;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-3.5 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3 min-w-0">
                  <ProductImage src={p.image_url} name={p.name_en} className="w-12 h-12" />
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm text-slate-900 truncate">{getProductLocalizedName(p, session.language)}</h4>
                    <p className="text-[12px] text-slate-500 font-bold">₹{p.selling_price}<span className="text-slate-300">/{p.unit}</span></p>
                    {low && <p className="text-[10px] font-black text-rose-500 mt-0.5">⚠ {t.onlyLeft} {p.current_stock} {t.left}</p>}
                    {p.current_stock === 0 && <p className="text-[10px] font-black text-slate-400 mt-0.5">{t.outOfStock}</p>}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                  {p.current_stock > 0 && (
                    <>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl">
                        <button onClick={() => setQty(s => ({ ...s, [p.id]: Math.max(1, (s[p.id] || 1) - 1) }))} className="p-1.5 text-slate-500 active:scale-90 transition"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="w-5 text-center text-xs font-black">{qty[p.id] || 1}</span>
                        <button onClick={() => setQty(s => ({ ...s, [p.id]: (s[p.id] || 1) + 1 }))} className="p-1.5 text-slate-500 active:scale-90 transition"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                      <button onClick={() => addToCart(p)} className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black rounded-xl shadow-sm shadow-orange-100 active:scale-95 transition">
                        {t.addToCart}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {cart.length > 0 && (
          <div className="p-3 bg-white/95 backdrop-blur border-t border-slate-100">
            <button
              onClick={() => { setCartOpen(true); sounds.playTap(); }}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl shadow-lg shadow-orange-200 flex items-center justify-center space-x-2 active:scale-[0.98] transition"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t.viewCart} · {cartCount} {t.items} · ₹{cartTotal}</span>
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
          <div className="bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 px-5 pt-5 pb-14 rounded-b-[2.5rem] flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-white/80">{t.welcome} 👋</p>
                <h2 className="text-lg font-black text-white">{session.name || session.phone}</h2>
              </div>
              <button
                onClick={() => { setCartOpen(true); sounds.playTap(); }}
                className="relative p-2.5 bg-white/20 backdrop-blur text-white rounded-2xl active:scale-95 transition"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-orange-500 text-white">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
            <div className="mt-4 flex items-center bg-white rounded-2xl px-3.5 py-2.5 space-x-2 shadow-lg shadow-orange-900/10">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.searchVendors}
                className="flex-1 bg-transparent outline-none text-sm font-semibold text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {/* Quick stats */}
            <div className="-mt-9 grid grid-cols-3 gap-2 mb-4">
              <button onClick={() => setTab('orders')} className="bg-white rounded-2xl border border-slate-100 p-2.5 text-center shadow-sm active:scale-95 transition">
                <p className="text-lg font-black text-slate-900">{activeOrders.length}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">{t.activeTab}</p>
              </button>
              <button onClick={() => setTab('udhaar')} className="bg-white rounded-2xl border border-slate-100 p-2.5 text-center shadow-sm active:scale-95 transition">
                <p className="text-lg font-black text-violet-600">₹{totalUdhaar.toFixed(0)}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">{t.udhaar}</p>
              </button>
              <button onClick={() => setTab('profile')} className="bg-white rounded-2xl border border-slate-100 p-2.5 text-center shadow-sm active:scale-95 transition">
                <p className="text-lg font-black text-amber-500">{profile?.loyalty_points ?? 0}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">⭐ {t.profile}</p>
              </button>
            </div>

            {/* Live order banner */}
            {activeOrders.length > 0 && (
              <button
                onClick={() => setTab('orders')}
                className={`w-full mb-4 p-3.5 rounded-2xl text-left flex items-center justify-between active:scale-[0.99] transition shadow-sm ${
                  liveOnline ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${liveOnline ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    <Truck className={`w-5 h-5 ${liveOnline ? 'text-emerald-600' : 'text-amber-600'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center">
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${liveOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                      {t.yourActiveOrder}
                    </p>
                    <p className="font-black text-sm text-slate-900 truncate">
                      {statusMeta(activeOrders[0].status, t).label} • {activeOrders[0].order_number}
                    </p>
                  </div>
                </div>
                <span className="ml-2 px-3 py-1.5 bg-white text-orange-600 text-[11px] font-black rounded-xl border border-orange-100 flex items-center flex-shrink-0">
                  {t.trackNow} <ChevronRight className="w-3 h-3" />
                </span>
              </button>
            )}

            {/* Category chips */}
            <div className="flex space-x-2 overflow-x-auto pb-3 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => { setCategory(c); sounds.playTap(); }}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap border transition active:scale-95 ${
                    category === c
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-500 border-slate-100'
                  }`}
                >
                  {c === 'All' ? `✦ ${c}` : `${vendorEmoji(c)} ${c}`}
                </button>
              ))}
            </div>

            <h3 className="pb-2 text-[11px] font-black text-slate-400 uppercase tracking-wider">{t.nearbyVendors}</h3>
            {filteredVendors.length === 0 ? (
              <div className="pt-12 text-center">
                <Store className="w-12 h-12 mx-auto text-slate-200" />
                <p className="mt-3 font-black text-slate-500">{t.searchVendors}</p>
                <p className="text-xs text-slate-400 font-semibold mt-1">{t.allVendors}</p>
              </div>
            ) : filteredVendors.map(v => (
              <button
                key={v.vendor_id}
                onClick={() => openStore(v)}
                className="w-full bg-white rounded-2xl border border-slate-100 p-3.5 mb-2.5 flex items-center text-left active:scale-[0.99] transition shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100/60 flex items-center justify-center text-2xl flex-shrink-0">
                  {vendorEmoji(v.business_category)}
                </div>
                <div className="flex-1 min-w-0 ml-3">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-extrabold text-sm text-slate-900 truncate">{v.business_name}</h4>
                    {v.is_accepting_orders && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center flex-shrink-0">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 mr-1 animate-pulse" />LIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">
                    {v.business_category} • {v.product_count} {t.items}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-lg flex items-center space-x-0.5">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> {v.rating_avg}
                    </span>
                    <span className="text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-lg flex items-center space-x-0.5">
                      <MapPin className="w-2.5 h-2.5 text-orange-500" /> {v.distance_km} km
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center space-x-0.5">
                      <Clock className="w-2.5 h-2.5" /> {v.working_hours}
                    </span>
                  </div>
                </div>
                <span className="ml-2 px-3 py-2 bg-orange-50 text-orange-600 text-xs font-black rounded-xl border border-orange-100 flex-shrink-0 active:scale-95 transition">
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
          <h2 className="pt-5 pb-2 text-xl font-black text-slate-900">{t.myOrders}</h2>

          {orders.length > 0 && (
            <div className="flex bg-slate-100 rounded-2xl p-1 mb-3">
              {(['active', 'history'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setOrderFilter(f)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
                    orderFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {f === 'active' ? `${t.activeTab} (${activeOrders.length})` : `${t.history} (${pastOrders.length})`}
                </button>
              ))}
            </div>
          )}

          {orders.length === 0 ? (
            <div className="pt-20 text-center">
              <Receipt className="w-12 h-12 mx-auto text-slate-200" />
              <p className="mt-3 font-black text-slate-500">{t.noOrders}</p>
              <p className="text-xs text-slate-400 font-semibold mt-1">{t.noOrdersSub}</p>
            </div>
          ) : orderFilter === 'active' && activeOrders.length === 0 ? (
            <div className="pt-16 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-100" />
              <p className="mt-3 font-black text-slate-500">{t.noOrders}</p>
              <p className="text-xs text-slate-400 font-semibold mt-1">{t.noOrdersSub}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orderFilter === 'active' && activeOrders.length > 0 && (
                <div className="flex items-center space-x-1.5 pb-1 pt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${liveOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {liveOnline ? t.liveTracking : t.liveOffline}
                  </span>
                  <span className="flex-1 h-px bg-slate-100" />
                </div>
              )}
              {(orderFilter === 'active' ? activeOrders : pastOrders).map(o => {
                const isActive = !['COMPLETED', 'CANCELLED'].includes(o.status);
                const expanded = expandedOrders[o.id] !== false;
                const justUpdated = !!liveStatuses[o.id] && Date.now() - liveStatuses[o.id].at < 60000;
                const meta = statusMeta(o.status, t);
                return (
                <div key={o.id} className={`bg-white rounded-2xl border p-4 ${isActive && justUpdated ? 'border-orange-200 shadow-sm shadow-orange-50' : 'border-slate-100 shadow-sm'}`}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-black text-sm text-slate-900">{o.order_number}</p>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                        {new Date(o.created_at).toLocaleDateString()} • {o.payment_mode}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-black text-slate-900">₹{o.total_amount}</p>
                      <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full ${meta.pill}`}>
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  {isActive && <StatusProgress status={o.status} />}

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
                  {!isActive && o.status === 'COMPLETED' && (
                    <div className="mt-2 flex items-center space-x-1.5 text-[10px] font-black text-emerald-500">
                      <CheckCircle2 className="w-3 h-3" /><span>{t.stepDelivered} ✓</span>
                    </div>
                  )}
                  {o.payment_status !== 'COMPLETED' && o.payment_mode !== 'UDHAAR' && (
                    <div className="mt-3 flex space-x-2">
                      <button onClick={() => payExistingOrder(o.id, 'UPI')} className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black rounded-xl active:scale-95 transition shadow-sm shadow-orange-100">
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
          <h2 className="pt-5 pb-2 text-xl font-black text-slate-900">{t.myUdhaar}</h2>
          <div className="mb-4 p-5 rounded-3xl bg-gradient-to-br from-violet-600 via-violet-600 to-purple-500 text-white shadow-lg shadow-violet-200 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full pointer-events-none" />
            <div className="absolute -right-2 top-10 w-16 h-16 bg-white/10 rounded-full pointer-events-none" />
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold opacity-80 flex items-center"><Wallet className="w-3.5 h-3.5 mr-1" />{t.owed}</p>
              <NotebookTabs className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-3xl font-black mt-1">₹{totalUdhaar.toFixed(0)}</p>
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
              {udhaar.map(r => {
                const paidPct = r.amount_due > 0 ? Math.min(100, Math.round((r.amount_paid / r.amount_due) * 100)) : 100;
                return (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-black text-sm text-slate-900 truncate">{r.customer_name}</p>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">{r.notes || 'Vendor credit account'}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-black text-slate-900">₹{r.remaining_balance}</p>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        r.status === 'SETTLED' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {r.status === 'SETTLED' ? t.settled : t.owed}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-wide mb-1">
                      <span>{t.paid} ₹{r.amount_paid}</span><span>{paidPct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${r.status === 'SETTLED' ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${paidPct}%` }} />
                    </div>
                  </div>
                  {r.remaining_balance > 0 && (
                    <div className="mt-3 flex space-x-2">
                      <button onClick={() => repayUdhaar(r.id, 'UPI')} className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-purple-500 text-white text-xs font-black rounded-xl active:scale-95 transition flex items-center justify-center space-x-1.5 shadow-sm shadow-violet-100">
                        <Smartphone className="w-3.5 h-3.5" /><span>{t.repay} · UPI</span>
                      </button>
                      <button onClick={() => repayUdhaar(r.id, 'CASH')} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-black rounded-xl active:scale-95 transition">
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

      {/* ===== PROFILE ===== */}
      {tab === 'profile' && (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <h2 className="pt-5 pb-3 text-xl font-black text-slate-900">{t.profile}</h2>

          <div className="p-4 bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl flex items-center space-x-3.5 shadow-lg shadow-orange-100">
            <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-black text-white">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="font-black text-white truncate">{profile?.name || session.name || 'Customer'}</p>
              <p className="text-xs font-bold text-white/85">+91 {session.phone}</p>
              <span className="inline-flex items-center space-x-1 mt-1 text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" /><span>{profile?.loyalty_points ?? 0} ⭐</span>
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center shadow-sm">
              <Receipt className="w-4 h-4 mx-auto text-orange-500" />
              <p className="text-base font-black text-slate-900 mt-1">{orders.length}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">{t.orders}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center shadow-sm">
              <NotebookTabs className="w-4 h-4 mx-auto text-violet-500" />
              <p className="text-base font-black text-slate-900 mt-1">{udhaar.filter(r => r.remaining_balance > 0).length}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">{t.udhaar}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center shadow-sm">
              <Sparkles className="w-4 h-4 mx-auto text-amber-500" />
              <p className="text-base font-black text-slate-900 mt-1">{profile?.loyalty_points ?? 0}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Points</p>
            </div>
          </div>

          <h3 className="mt-5 mb-2 text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center"><Languages className="w-3.5 h-3.5 mr-1" />{t.language}</h3>
          <div className="bg-white rounded-2xl border border-slate-100 p-2 grid grid-cols-4 gap-1.5 shadow-sm">
            {quickLangs.map(code => (
              <button
                key={code}
                onClick={() => { changeLanguage(code); sounds.playTap(); }}
                className={`py-2 rounded-xl text-xs font-black transition active:scale-95 ${
                  session.language === code ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600'
                }`}
              >
                {langNative(code)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] font-semibold text-slate-400 px-1 flex items-start">
            <Info className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
            All 23 Indian languages available at first launch; quick-switch here for the popular ones.
          </p>

          <button
            onClick={onLogout}
            className="mt-5 w-full py-3.5 bg-white border border-rose-100 text-rose-600 font-black rounded-2xl flex items-center justify-center space-x-2 active:scale-[0.98] transition shadow-sm"
          >
            <LogOut className="w-4 h-4" /><span>{t.logout}</span>
          </button>
        </div>
      )}

      {/* ===== BOTTOM TAB BAR (native style) ===== */}
      <div className="bg-white/95 backdrop-blur border-t border-slate-100 px-2 pt-1.5 pb-2 flex justify-around flex-shrink-0">
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
          <div className="w-full bg-white rounded-t-3xl max-h-[88%] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900">{t.yourCart}</h3>
                {cart.length > 0 && <p className="text-[10px] font-bold text-slate-400">{vendors.find(v => v.vendor_id === cart[0].product.vendor_id)?.business_name}</p>}
              </div>
              <button onClick={() => setCartOpen(false)} className="p-1.5 rounded-full bg-slate-100 active:scale-90 transition"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {cart.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingBag className="w-12 h-12 mx-auto text-slate-200" />
                  <p className="mt-3 text-sm font-black text-slate-400">{t.emptyCart}</p>
                  <p className="text-xs text-slate-300 font-semibold mt-1">{t.emptyCartSub}</p>
                </div>
              ) : cart.map(i => (
                <div key={i.product.id} className="flex items-center justify-between bg-slate-50 rounded-2xl p-3">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <ProductImage src={i.product.image_url} name={i.product.name_en} className="w-10 h-10" wrapperClassName="bg-white border border-slate-100" emojiClassName="text-lg" />
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm text-slate-900 truncate">{getProductLocalizedName(i.product, session.language)}</p>
                      <p className="text-[11px] font-bold text-slate-400">₹{i.product.selling_price} × {i.quantity} {i.product.unit}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl">
                      <button onClick={() => setCartItemQty(i.product.id, -1)} className="p-1.5 text-slate-500 active:scale-90 transition"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-5 text-center text-xs font-black">{i.quantity}</span>
                      <button onClick={() => setCartItemQty(i.product.id, 1)} className="p-1.5 text-slate-500 active:scale-90 transition"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <button onClick={() => setCart(c => c.filter(x => x.product.id !== i.product.id))} className="p-1.5 text-rose-400 active:scale-90 transition"><Trash2 className="w-4 h-4" /></button>
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
                      ['UPI', QrCode, t.upi, 'GPay · PhonePe'],
                      ['CASH', Banknote, t.cash, 'At delivery'],
                      ['UDHAAR', NotebookTabs, t.udhaarPay, 'Pay later'],
                    ] as const).map(([mode, Icon, label, sub]) => (
                      <button
                        key={mode}
                        onClick={() => { setPayMode(mode); sounds.playTap(); }}
                        className={`py-2.5 rounded-xl border-2 flex flex-col items-center space-y-0.5 transition active:scale-95 ${
                          payMode === mode ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-100 bg-white text-slate-500'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] font-black leading-tight text-center px-1">{label}</span>
                        <span className={`text-[8px] font-bold ${payMode === mode ? 'text-orange-400' : 'text-slate-300'}`}>{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400">
                    <span>{t.itemTotal}</span><span className="text-slate-600">₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-400">
                    <span>{t.estDelivery}</span><span className="text-emerald-500 font-black">{t.freeDelivery}</span>
                  </div>
                  <div className="border-t border-dashed border-slate-200 pt-1.5 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">{t.toPay}</span>
                    <span className="text-xl font-black text-slate-900">₹{cartTotal}</span>
                  </div>
                </div>
                <button
                  onClick={placeOrder}
                  disabled={placing}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl shadow-lg shadow-orange-200 active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center space-x-2"
                >
                  {placing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BadgeIndianRupee className="w-4 h-4" />}
                  <span>{placing ? '…' : `${t.placeOrder} · ₹${cartTotal}`}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SUCCESS SHEET ===== */}
      {successOrder && (
        <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6" onClick={() => setSuccessOrder(null)}>
          <div className="w-full bg-white rounded-t-3xl sm:rounded-3xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center animate-soft-pulse">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-xl font-black text-slate-900">{t.orderPlaced}</h3>
            <p className="text-xs font-bold text-slate-400 mt-1">{successOrder.order_number} • {t.orderPlacedSub}</p>
            <p className="mt-3 text-3xl font-black text-slate-900">₹{successOrder.total_amount}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-[11px] font-black">
              {successOrder.payment_mode}
            </span>
            <div className="mt-5 flex space-x-2">
              <button onClick={() => { setSuccessOrder(null); setTab('orders'); sounds.playTap(); }} className="flex-1 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl active:scale-[0.98] transition shadow-sm shadow-orange-100">
                {t.trackNow}
              </button>
              <button onClick={() => setSuccessOrder(null)} className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-black rounded-2xl active:scale-[0.98] transition">
                {t.thanks}
              </button>
            </div>
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
        </div>          )}

      {/* Universal AI voice assistant — ask anything by voice */}
      <FloatingVoiceAssistant language={session.language} />
    </>
  );
};
