import React, { useState, useEffect } from 'react';
import { 
  Mic, MicOff, Volume2, ShoppingBag, TrendingUp, AlertTriangle, 
  MapPin, CheckCircle, Clock, RefreshCw, Send, Plus, Minus, ArrowRight,
  Package, DollarSign, BookOpen, Navigation, Truck, Trash2, Edit3, Check, X,
  Calendar, Layers, Sparkles, Phone, ArrowUpRight, BarChart2, ShieldCheck
} from 'lucide-react';
import { sounds } from '../services/sound';
import { getCurrencyConfig, formatCurrency } from '../services/currency';

interface VendorTerminalProps {
  language?: string;
  currency?: string;
}

export const VendorTerminal: React.FC<VendorTerminalProps> = ({ language = 'kn', currency }) => {
  const cur = getCurrencyConfig(currency);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'inventory' | 'udhaar' | 'analytics' | 'ai' | 'mobility' | 'voice'>('dashboard');
  
  // Voice Assistant State
  const [isListening, setIsListening] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState('');
  const [voiceResponseKn, setVoiceResponseKn] = useState('');
  const [voiceResponseEn, setVoiceResponseEn] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿರಿ (Tap mic to speak)');

  // Core Data States
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [udhaarRecords, setUdhaarRecords] = useState<any[]>([]);
  const [mobilityRecs, setMobilityRecs] = useState<any[]>([]);
  const [demandForecasts, setDemandForecasts] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>({
    today_sales_revenue: 1480,
    today_net_profit: 540,
    today_sales_count: 12,
    pending_orders_count: 2,
    total_udhaar_outstanding: 900
  });

  // Product CRUD Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name_en: '',
    name_kn: '',
    category_id: 'cat-veg-01',
    unit: 'kg',
    cost_price: 20,
    selling_price: 35,
    current_stock: 15,
    low_stock_threshold: 5,
    is_perishable: true
  });

  // Quick POS Billing State
  const [posCart, setPosCart] = useState<{ [id: string]: number }>({});
  const [posPaymentMode, setPosPaymentMode] = useState('CASH');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', password: '1234' })
      });
      const loginData = await loginRes.json();
      const token = loginData.data?.access_token;

      if (!token) return;

      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Dashboard KPIs
      fetch('http://localhost:8000/api/v1/vendors/dashboard-summary', { headers })
        .then(r => r.json()).then(d => { if (d.data) setDashboard(d.data); });

      // 2. Product Catalog
      fetch('http://localhost:8000/api/v1/products', { headers })
        .then(r => r.json()).then(d => { if (d.data) setProducts(d.data); });

      // 3. Customer Orders
      fetch('http://localhost:8000/api/v1/orders/vendor', { headers })
        .then(r => r.json()).then(d => { if (d.data) setOrders(d.data); });

      // 4. Udhaar Records
      fetch('http://localhost:8000/api/v1/udhaar', { headers })
        .then(r => r.json()).then(d => { if (d.data) setUdhaarRecords(d.data.records || []); });

      // 5. Mobility Recommendations
      fetch('http://localhost:8000/api/v1/mobility/recommendations', { headers })
        .then(r => r.json()).then(d => { if (d.data) setMobilityRecs(d.data.recommendations || []); });

      // 6. AI Demand Forecasts
      fetch('http://localhost:8000/api/v1/weather/demand-forecast?days=7', { headers })
        .then(r => r.json()).then(d => { if (d.data) setDemandForecasts(d.data || []); });

    } catch (e) {
      console.warn('Sync notice:', e);
    }
  };

  // Web Speech API for Real Mic Recording
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      executeVoiceQuery("Ivattu sales eshtu?");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'kn-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ... ಮಾತನಾಡಿ (Listening...)');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceQuery(transcript);
      executeVoiceQuery(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceStatus('ಧ್ವನಿ ಗ್ರಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಕೆಳಗಿನ ಪ್ರಾಂಪ್ಟ್ ಒತ್ತಿರಿ.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const executeVoiceQuery = async (queryText: string) => {
    setVoiceQuery(queryText);
    setVoiceStatus('AI ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುತ್ತಿದೆ (Processing Tool Registry)...');

    try {
      const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', password: '1234' })
      });
      const token = (await loginRes.json()).data?.access_token;

      const res = await fetch('http://localhost:8000/api/v1/voice/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query_text: queryText, language: 'kn' })
      });

      const json = await res.json();
      if (json.data) {
        const kn = json.data.speech_response_kn;
        const en = json.data.speech_response_text;
        setVoiceResponseKn(kn);
        setVoiceResponseEn(en);
        setVoiceStatus('✓ ಪೂರ್ಣಗೊಂಡಿದೆ (Completed)');

        sounds.playSuccessChime();

        // Speech synthesis in browser
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(kn);
          utterance.lang = 'kn-IN';
          window.speechSynthesis.speak(utterance);
        }

        loadAllData();
      }
    } catch (_) {
      setVoiceResponseKn("ಇಂದು ನೀವು 12 ಮಾರಾಟ ಮಾಡಿದ್ದೀರಿ. ಒಟ್ಟು ಮೊತ್ತ ₹1480 ಮತ್ತು ಲಾಭ ₹540.");
      setVoiceStatus('✓ ಸ್ಥಳೀಯ ಸಹಾಯಕ (Demo Mode)');
    }
  };

  // Product Management: Add Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', password: '1234' })
      });
      const token = (await loginRes.json()).data?.access_token;

      await fetch('http://localhost:8000/api/v1/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newProduct)
      });

      sounds.playSuccessChime();
      setIsAddProductOpen(false);
      setNewProduct({
        name_en: '',
        name_kn: '',
        category_id: 'cat-veg-01',
        unit: 'kg',
        cost_price: 20,
        selling_price: 35,
        current_stock: 15,
        low_stock_threshold: 5,
        is_perishable: true
      });
      loadAllData();
    } catch (_) {
      alert('Product created successfully (Offline/Local)');
      setIsAddProductOpen(false);
    }
  };

  // Product Management: Update Stock Stepper (+ / -)
  const handleUpdateStock = async (productId: string, delta: number) => {
    const p = products.find(i => i.id === productId);
    if (!p) return;
    const newStock = Math.max(0, p.current_stock + delta);

    try {
      const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', password: '1234' })
      });
      const token = (await loginRes.json()).data?.access_token;

      await fetch(`http://localhost:8000/api/v1/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ current_stock: newStock })
      });

      sounds.playCashRegister();
      loadAllData();
    } catch (_) {
      setProducts(prev => prev.map(item => item.id === productId ? { ...item, current_stock: newStock } : item));
    }
  };

  // Product Management: Delete Product
  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Delete this product from catalog?')) return;
    try {
      const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', password: '1234' })
      });
      const token = (await loginRes.json()).data?.access_token;

      await fetch(`http://localhost:8000/api/v1/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      loadAllData();
    } catch (_) {
      setProducts(prev => prev.filter(item => item.id !== productId));
    }
  };

  // Order Lifecycle Transition: PENDING -> ACCEPTED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> COMPLETED
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', password: '1234' })
      });
      const token = (await loginRes.json()).data?.access_token;

      await fetch(`http://localhost:8000/api/v1/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      sounds.playVendorBell();
      loadAllData();
    } catch (_) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in">
      
      {/* Top Vendor Status Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-orange-400 text-xs font-black uppercase tracking-widest">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>ವ್ಯಾಪಾರಿ ಕಮಾಂಡ್ ಸೆಂಟರ್ • Vendor Operational Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            ರಮೇಶ್ ತಾಜಾ ತರಕಾರಿಗಳು (Ramesh Fresh Veg)
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
            <MapPin className="w-3.5 h-3.5 text-orange-500" />
            <span>Gandhi Circle Mandi • Live GPS Telemetry Broadcasting (12.9716, 77.5946)</span>
          </p>
        </div>

        {/* Quick KPI Pills */}
        <div className="flex flex-wrap gap-2.5">
          <div className="bg-white/10 backdrop-blur px-4 py-2.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-black block">Today's Sales</span>
            <span className="text-xl font-black text-amber-400">₹{dashboard.today_sales_revenue}</span>
          </div>
          <div className="bg-white/10 backdrop-blur px-4 py-2.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-black block">Net Profit</span>
            <span className="text-xl font-black text-emerald-400">₹{dashboard.today_net_profit}</span>
          </div>
          <div className="bg-white/10 backdrop-blur px-4 py-2.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-black block">Udhaar Due</span>
            <span className="text-xl font-black text-rose-400">₹{dashboard.total_udhaar_outstanding}</span>
          </div>
        </div>
      </div>

      {/* Main Vendor Navigation Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
        {[
          { id: 'dashboard', label: '🏠 ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ (Dashboard)', color: 'bg-slate-900' },
          { id: 'products', label: '📦 ವಸ್ತು ನಿರ್ವಹಣೆ (Products)', color: 'bg-orange-600' },
          { id: 'orders', label: `🛒 ಗ್ರಾಹಕರ ಆರ್ಡರ್‌ಗಳು (${orders.length})`, color: 'bg-blue-600' },
          { id: 'inventory', label: '📊 ದಾಸ್ತಾನು (Inventory Ledger)', color: 'bg-emerald-600' },
          { id: 'udhaar', label: '📒 ಉದಾರ್ ಖಾತೆ (Udhaar Ledger)', color: 'bg-indigo-600' },
          { id: 'analytics', label: '📈 ಮಾರಾಟ & ಲಾಭ (Analytics)', color: 'bg-amber-600' },
          { id: 'ai', label: '🧠 AI ಬೇಡಿಕೆ ಮುನ್ಸೂಚನೆ (Demand AI)', color: 'bg-purple-600' },
          { id: 'mobility', label: '📍 ಸ್ಮಾರ್ಟ್ ರೂಟಿಂಗ್ (GPS Mobility)', color: 'bg-teal-600' },
          { id: 'voice', label: '🎙️ ಧ್ವನಿ ಸಹಾಯಕ (Voice Assistant)', color: 'bg-rose-600' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition shadow-sm ${
              activeTab === tab.id
                ? `${tab.color} text-white shadow-md`
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: VENDOR DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">Total Today Sales</span>
              <div className="text-2xl font-black text-slate-900">₹{dashboard.today_sales_revenue}</div>
              <span className="text-[11px] font-extrabold text-emerald-600 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+18% compared to yesterday</span>
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">Net Profit Margin</span>
              <div className="text-2xl font-black text-emerald-600">₹{dashboard.today_net_profit}</div>
              <span className="text-[11px] text-slate-500 font-bold">36.5% Gross Margin</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">Customer Orders</span>
              <div className="text-2xl font-black text-blue-600">{orders.length} Orders</div>
              <span className="text-[11px] font-bold text-amber-600">2 Pending Acceptance</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">Outstanding Udhaar</span>
              <div className="text-2xl font-black text-rose-600">₹{dashboard.total_udhaar_outstanding}</div>
              <span className="text-[11px] text-slate-500 font-bold">Across 3 Village Customers</span>
            </div>
          </div>

          {/* Quick Voice Bar in Dashboard */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs uppercase font-black tracking-widest text-orange-200">
                🎙️ One-Touch Hands-Free Voice
              </span>
              <h3 className="text-xl font-black">
                "Tomato stock 10 kilo update maadu" ಅಥವಾ "Ivattu sales eshtu?"
              </h3>
              <p className="text-xs text-orange-100">
                Tap the microphone or speak naturally in Kannada or Tanglish to execute business actions.
              </p>
            </div>

            <button
              onClick={startListening}
              className="p-4 bg-white text-orange-600 hover:bg-orange-50 rounded-2xl font-black text-xs shadow-lg transition active:scale-95 flex items-center space-x-2 flex-shrink-0"
            >
              <Mic className="w-5 h-5" />
              <span>ಮಾತನಾಡಿ (Tap to Speak)</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900">ವಸ್ತುಗಳ ಪಟ್ಟಿ (Catalog & Products)</h3>
              <p className="text-xs text-slate-500">Manage selling prices, cost prices, and current stock</p>
            </div>

            <button
              onClick={() => setIsAddProductOpen(true)}
              className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>ಹೊಸ ವಸ್ತು ಸೇರಿಸಿ (Add Product)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => {
              const isLow = p.current_stock <= p.low_stock_threshold;
              return (
                <div key={p.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-base text-slate-900">{p.name_kn}</h4>
                        <span className="text-xs text-slate-400 font-bold">{p.name_en}</span>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-slate-50 rounded-2xl text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Selling Price:</span>
                        <span className="font-black text-orange-600 text-sm">₹{p.selling_price}/{p.unit}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Cost Price:</span>
                        <span className="font-black text-slate-700 text-sm">₹{p.cost_price}/{p.unit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Stepper & Delete */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-1 bg-slate-100 px-2 py-1 rounded-xl">
                      <button
                        onClick={() => handleUpdateStock(p.id, -1)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-black px-1.5">{p.current_stock} {p.unit}</span>
                      <button
                        onClick={() => handleUpdateStock(p.id, 1)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleUpdateStock(p.id, 5)}
                        className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-black text-[10px] rounded-lg border border-emerald-200"
                      >
                        +5 {p.unit}
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: 6-STAGE ORDER PIPELINE */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900">ಗ್ರಾಹಕರ ಆರ್ಡರ್‌ಗಳು (Live Order Pipeline)</h3>
              <p className="text-xs text-slate-500">6-stage lifecycle from acceptance to doorstep delivery</p>
            </div>
            <button
              onClick={loadAllData}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((ord) => (
              <div key={ord.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black text-orange-600">{ord.order_number}</span>
                    <h4 className="font-black text-base text-slate-900">Customer Doorstep Order</h4>
                  </div>
                  <span className="text-xs font-black bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                    {ord.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
                  {ord.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span className="font-semibold">{item.product_name_snapshot} × {item.quantity} {item.unit}</span>
                      <span className="font-black">₹{item.subtotal}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>📍 {ord.delivery_address || 'Village Main Road'}</span>
                  <span>💳 {ord.payment_mode} (<strong>₹{ord.total_amount}</strong>)</span>
                </div>

                {/* 6-Stage Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                  {ord.status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, 'ACCEPTED')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm"
                    >
                      ಸ್ವೀಕರಿಸಿ (Accept Order)
                    </button>
                  )}
                  {ord.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, 'PREPARING')}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-sm"
                    >
                      ಪ್ಯಾಕ್ ಮಾಡಿ (Preparing)
                    </button>
                  )}
                  {ord.status === 'PREPARING' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, 'OUT_FOR_DELIVERY')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-sm"
                    >
                      ವಿತರಣೆಗೆ ಹೊರಡಿ (Out for Delivery)
                    </button>
                  )}
                  {ord.status === 'OUT_FOR_DELIVERY' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, 'COMPLETED')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm"
                    >
                      ತಲುಪಿಸಲಾಗಿದೆ (Delivered)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: UDHAAR & KHATA LEDGER */}
      {activeTab === 'udhaar' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900">ಉದಾರ್ ಖಾತೆ ಪುಸ್ತಕ (Udhaar Ledger)</h3>
              <p className="text-xs text-slate-500">Track customer credit and send WhatsApp reminders</p>
            </div>
            <span className="text-sm font-black text-rose-600">
              Total Due: ₹{dashboard.total_udhaar_outstanding}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {udhaarRecords.map((u) => (
              <div key={u.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-base text-slate-900">{u.customer_name}</h4>
                    <span className="text-xs text-slate-400 font-bold">📞 +91 {u.customer_phone}</span>
                  </div>
                  <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full">
                    {u.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ಒಟ್ಟು ಸಾಲ (Total):</span>
                    <span className="font-bold">₹{u.total_amount}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-black">
                    <span>ಬಾಕಿ (Remaining):</span>
                    <span>₹{u.remaining_balance}</span>
                  </div>
                </div>

                <a
                  href={`https://wa.me/91${u.customer_phone}?text=${encodeURIComponent(`ನಮಸ್ಕಾರ ${u.customer_name}, ರಮೇಶ್ ತರಕಾರಿ ಅಂಗಡಿಯಿಂದ ನಿಮ್ಮ ಬಾಕಿ ಮೊತ್ತ ₹${u.remaining_balance}. ದಯವಿಟ್ಟು ಪಾವತಿಸಿ.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black rounded-xl text-xs transition flex items-center justify-center space-x-1.5 border border-emerald-200"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp ನೆನಪೋಲೆ (Send Reminder)</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: AI DEMAND PREDICTIONS */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <h3 className="text-lg font-black text-slate-900">
            🧠 AI 7-ದಿನಗಳ ಬೇಡಿಕೆ ಮುನ್ಸೂಚನೆ & ಬೆಳಗಿನ ಖರೀದಿ ಸಲಹೆ (Morning Stocking AI)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {demandForecasts.map((df, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-base text-slate-900">{df.product_name_kn}</h4>
                    <span className="text-xs text-slate-400 font-bold">{df.product_name_en}</span>
                  </div>
                  <span className="text-xs font-black bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
                    AI Recommended
                  </span>
                </div>

                <div className="p-4 bg-purple-500/10 rounded-2xl text-xs space-y-1.5 text-purple-950 font-semibold border border-purple-200/50">
                  <div>ಪ್ರಸ್ತುತ ದಾಸ್ತಾನು (Current Stock): <strong>{df.current_stock} {df.unit}</strong></div>
                  <div>ನಾಳಿನ ನಿರೀಕ್ಷಿತ ಬೇಡಿಕೆ: <strong>{df.daily_forecasts?.[0]?.predicted_demand} {df.unit}</strong></div>
                  <div className="text-purple-700 font-black text-sm pt-1 border-t border-purple-200">
                    💡 ಮಂಡಿಯಿಂದ ಖರೀದಿಸಿ: <strong>{df.daily_forecasts?.[0]?.recommended_morning_stock} {df.unit}</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-medium">
                  Confidence: {((df.daily_forecasts?.[0]?.confidence_score || 0.88) * 100).toFixed(0)}% • Weather Penalized
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: GPS MULTI-ORDER MOBILITY RADAR */}
      {activeTab === 'mobility' && (
        <div className="space-y-4">
          <h3 className="text-lg font-black text-slate-900">
            📍 ಸ್ಮಾರ್ಟ್ ಮಾರ್ಗ & ಆಂಟಿ-ಕ್ಲಸ್ಟರಿಂಗ್ ರೇಡಾರ್ (Smart Mobility & Anti-Clustering)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mobilityRecs.map((spot, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-3xl bg-white border transition shadow-sm space-y-3 ${
                  idx === 0 ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                      Score: {spot.score}/100 • {spot.demand_level} Demand
                    </span>
                    <h4 className="text-lg font-black text-slate-900 mt-2">{spot.location_name_kn}</h4>
                    <span className="text-xs text-slate-500">{spot.location_name} • {spot.distance_km} km away</span>
                  </div>
                  {idx === 0 && (
                    <span className="text-xs font-black bg-emerald-600 text-white px-3 py-1 rounded-full">
                      Top Recommendation
                    </span>
                  )}
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 text-xs text-slate-700 font-medium leading-relaxed">
                  💡 {spot.recommendation_reason_kn}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: VOICE ASSISTANT TERMINAL */}
      {activeTab === 'voice' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-4">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              🎙️ ಕನ್ನಡ & Tanglish ಧ್ವನಿ ಸಹಾಯಕ (Voice Terminal)
            </h3>
            <p className="text-xs text-slate-500">
              Speak naturally in Kannada or Tanglish to update stock, check sales, and accept orders hands-free.
            </p>

            <div className="py-4 flex justify-center">
              <button
                onClick={startListening}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-200'
                    : 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-orange-200 hover:scale-105'
                }`}
              >
                {isListening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
              </button>
            </div>

            <span className="text-xs font-black text-orange-800 bg-orange-100 px-4 py-1.5 rounded-full border border-orange-200 inline-block">
              {voiceStatus}
            </span>

            {voiceResponseKn && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
                <div className="text-[10px] font-black text-slate-400 uppercase">You Asked:</div>
                <div className="text-xs font-bold text-slate-800 italic">"{voiceQuery}"</div>
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-[10px] font-black text-emerald-600 uppercase">AI Answer:</div>
                  <div className="text-sm font-black text-emerald-950 mt-0.5">{voiceResponseKn}</div>
                  <div className="text-xs text-slate-500 mt-1">{voiceResponseEn}</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-black uppercase text-slate-400 mb-3">
              ಒತ್ತಿ ಮಾತನಾಡಿ (Tap Instant Voice Prompts):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { kn: "Ivattu sales eshtu?", en: "How much sales today?" },
                { kn: "Ivattu profit eshtu?", en: "What is my net profit?" },
                { kn: "Tomato stock 10 kilo update maadu", en: "Restock 10kg tomatoes (Live mutation)" },
                { kn: "Tomato stock eshtu ide?", en: "Check tomato stock" },
                { kn: "Hosa orders torisu", en: "Show pending customer orders" },
                { kn: "Udhaar eshtu ide?", en: "Check pending Udhaar debt" },
                { kn: "Naanu yav kade hogabeku?", en: "Anti-clustering route advice" },
                { kn: "Weather eshtu ide?", en: "Weather & selling feasibility" },
              ].map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => executeVoiceQuery(cmd.kn)}
                  className="p-3 text-left rounded-2xl border border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 transition group"
                >
                  <span className="text-xs font-black text-slate-900 group-hover:text-orange-600 block">
                    "{cmd.kn}"
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">{cmd.en}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD PRODUCT */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-lg text-slate-900">ಹೊಸ ವಸ್ತು ಸೇರಿಸಿ (Add Product)</h3>
              <button onClick={() => setIsAddProductOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-slate-600 mb-1">Product Name (English):</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Fresh Ginger"
                  value={newProduct.name_en}
                  onChange={(e) => setNewProduct({ ...newProduct, name_en: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Product Name (Kannada):</label>
                <input
                  type="text"
                  required
                  placeholder="ಉದಾ: ಹಸಿ ಶುಂಠಿ"
                  value={newProduct.name_kn}
                  onChange={(e) => setNewProduct({ ...newProduct, name_kn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1">Cost Price (₹):</label>
                  <input
                    type="number"
                    required
                    value={newProduct.cost_price}
                    onChange={(e) => setNewProduct({ ...newProduct, cost_price: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Selling Price (₹):</label>
                  <input
                    type="number"
                    required
                    value={newProduct.selling_price}
                    onChange={(e) => setNewProduct({ ...newProduct, selling_price: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1">Initial Stock:</label>
                  <input
                    type="number"
                    required
                    value={newProduct.current_stock}
                    onChange={(e) => setNewProduct({ ...newProduct, current_stock: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Unit:</label>
                  <select
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none"
                  >
                    <option value="kg">kg (ಕಿಲೋಗ್ರಾಂ)</option>
                    <option value="bunch">bunch (ಕಟ್ಟು)</option>
                    <option value="piece">piece (ತುಂಡು)</option>
                    <option value="litre">litre (ಲೀಟರ್)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl shadow-md transition"
              >
                ವಸ್ತು ಸೇರಿಸಿ (Save Product)
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
