import React, { useState, useEffect } from 'react';
import { 
  Home, Package, ShoppingBag, DollarSign, MoreHorizontal, Mic, MicOff,
  TrendingUp, AlertTriangle, MapPin, CheckCircle, Clock, RefreshCw, Send,
  Plus, Minus, ArrowRight, CloudSun, Phone, Navigation, ShieldCheck, Sparkles,
  CheckCircle2, X, ChevronRight, BarChart2, Radio, Bell, Trash2, CreditCard,
  Receipt, UserPlus, Check, Compass, Crosshair, Navigation2, Zap, Volume2,
  Share2, ArrowUpRight, LogIn, LogOut, User, Lock, Store, Database,
  Settings, Award, Info, HelpCircle, Layers, Calendar, BatteryCharging,
  Megaphone, ShieldAlert, Wifi, WifiOff, AlertOctagon, Tag
} from 'lucide-react';
import { sounds } from '../services/sound';
import { 
  ALL_REGIONAL_LANGUAGES, 
  VENDOR_TRANSLATIONS, 
  formatLocalizedNumber, 
  formatLocalizedCurrency 
} from '../services/i18n';
import { 
  SUPPORTED_CURRENCIES, 
  getStoredCurrency, 
  getCurrencyConfig, 
  setStoredCurrency,
  formatCurrency
} from '../services/currency';
import { VillageCartMap } from './VillageCartMap';
import { StreetMegaphoneModal } from './StreetMegaphoneModal';
import { EmergencySosModal } from './EmergencySosModal';

interface VendorMobileAppProps {
  language?: string;
  currency?: string;
  onCurrencyChange?: (code: string) => void;
}

export const VendorMobileApp: React.FC<VendorMobileAppProps> = ({ 
  language = 'kn',
  currency,
  onCurrencyChange
}) => {
  // Navigation Tabs: 'home' | 'map' | 'pos' | 'products' | 'orders' | 'payments' | 'more'
  const [navTab, setNavTab] = useState<'home' | 'map' | 'pos' | 'products' | 'orders' | 'payments' | 'more'>('home');
  const [moreSubTab, setMoreSubTab] = useState<'fleet' | 'mobility' | 'ai' | 'analytics' | 'weather' | 'profile' | 'sync' | 'academic' | 'settings'>('fleet');
  
  const t = VENDOR_TRANSLATIONS[language] || VENDOR_TRANSLATIONS.kn;
  const currentLangConfig = ALL_REGIONAL_LANGUAGES.find(l => l.code === language) || ALL_REGIONAL_LANGUAGES[0];

  // Global Multi-Currency State
  const [activeCurrency, setActiveCurrency] = useState<string>(() => currency || getStoredCurrency());
  const currencyConfig = getCurrencyConfig(activeCurrency);

  useEffect(() => {
    if (currency) setActiveCurrency(currency);
  }, [currency]);

  // Real-World Village Offline-First Outbox State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vs_offline_queue') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real-World Perishable Spoilage Rescue ("Shaam Ki Bikri" / Evening Clearance)
  const [isClearanceActive, setIsClearanceActive] = useState<boolean>(false);
  const [foodWastePreventedKg, setFoodWastePreventedKg] = useState<number>(14.5);
  const [capitalRescued, setCapitalRescued] = useState<number>(450);

  // Street Megaphone & Emergency SOS Modal States
  const [isMegaphoneOpen, setIsMegaphoneOpen] = useState<boolean>(false);
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);

  const handleForceSync = async () => {
    sounds.playCashRegister();
    if (offlineQueue.length > 0) {
      try {
        const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: loginPhone, password: loginPin })
        });
        const token = (await loginRes.json()).data?.access_token || authToken;
        await fetch('http://localhost:8000/api/v1/sync/batch-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ mutations: offlineQueue })
        });
      } catch (_) {}
      setOfflineQueue([]);
      localStorage.removeItem('vs_offline_queue');
    }
    loadAllData();
  };

  const toggleClearanceMode = () => {
    sounds.playVendorBell();
    const next = !isClearanceActive;
    setIsClearanceActive(next);
    if (next) {
      setFoodWastePreventedKg(prev => Math.round((prev + 3.8) * 10) / 10);
      setCapitalRescued(prev => prev + 150);
      sounds.playPaymentSoundbox(150, language, currencyConfig.symbol);
    }
  };

  // Auth State
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('vs_vendor_token') || 'demo_token');
  const [vendorUser, setVendorUser] = useState<any>(() => {
    const saved = localStorage.getItem('vs_vendor_user');
    return saved ? JSON.parse(saved) : {
      name: 'ರಮೇಶ್',
      phone: '9876543210',
      business_name: 'ರಮೇಶ್ ತಾಜಾ ತರಕಾರಿಗಳು',
      category: 'Vegetables',
      vehicle_type: 'ನೂಕುಗಾಡಿ',
      upi_id: 'ramesh.veg@okhdfcbank',
      apmc_license: 'KA-MND-2026-8891'
    };
  });
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginPhone, setLoginPhone] = useState('9876543210');
  const [loginPin, setLoginPin] = useState('1234');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // GPS & Live Location States
  const [vendorLocation, setVendorLocation] = useState<[number, number]>([12.9716, 77.5946]);
  const [locationAddress, setLocationAddress] = useState<string>('Gandhi Circle Mandi, Bengaluru');
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // Voice & Multilingual Interactive AI Assistant State
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState('');
  const [customTextInput, setCustomTextInput] = useState('');
  const [voiceResponseNative, setVoiceResponseNative] = useState('');
  const [voiceResponseEn, setVoiceResponseEn] = useState('');
  const [voiceAudioBase64, setVoiceAudioBase64] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState(t.micPrompt);
  const [voiceMessages, setVoiceMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    textNative: string;
    textEn?: string;
    audioB64?: string | null;
    detectedLang?: string;
    time: string;
    actionType?: 'sales' | 'stock' | 'map' | 'qr' | 'weather';
  }>>([
    {
      id: 'init-1',
      role: 'assistant',
      textNative: 'ನಮಸ್ಕಾರ ರಮೇಶ್ ಅವರೇ! ವೆಂಡರ್‌ಸಾಥಿ AI ಧ್ವನಿ ಸಹಾಯಕ ಸಿದ್ಧವಾಗಿದೆ. ನೀವು ಏನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?',
      textEn: 'Hello Ramesh! VendorSaathi Voice Assistant is ready. What would you like to know or record?',
      detectedLang: 'kn',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Product CRUD Modal
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
  const [posCart, setPosCart] = useState<{ [id: string]: { product: any; quantity: number } }>({});
  const [posPaymentMode, setPosPaymentMode] = useState<'CASH' | 'UPI' | 'UDHAAR'>('CASH');
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [lastBill, setLastBill] = useState<any>(null);

  // Settings Toggles
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [indicNumeralsEnabled, setIndicNumeralsEnabled] = useState(true);

  // Core Data States (Initialized with rich defaults so UI is NEVER blank)
  const [products, setProducts] = useState<any[]>([
    { id: 'p-tom-01', name_kn: 'ನಾಟಿ ಟೊಮೇಟೊ', name_hi: 'देशी टमाटर', name_ta: 'நாட்டு தக்காளி', name_te: 'నాటు టమాటా', name_en: 'Native Tomato', cost_price: 25, selling_price: 35, current_stock: 45, unit: 'kg', low_stock_threshold: 10 },
    { id: 'p-oni-02', name_kn: 'ಈರುಳ್ಳಿ', name_hi: 'पुणे प्याज', name_ta: 'வெங்காயம்', name_te: 'ఉల్లిపాయలు', name_en: 'Pune Onion', cost_price: 30, selling_price: 42, current_stock: 60, unit: 'kg', low_stock_threshold: 15 },
    { id: 'p-pot-03', name_kn: 'ಹಾಸನ ಆಲೂಗಡ್ಡೆ', name_hi: 'हसन आलू', name_ta: 'உருளைக்கிழங்கு', name_te: 'బంగాళాదుంప', name_en: 'Hassan Potato', cost_price: 28, selling_price: 38, current_stock: 50, unit: 'kg', low_stock_threshold: 12 },
    { id: 'p-chi-04', name_kn: 'ಹಸಿ ಮೆಣಸಿನಕಾಯಿ', name_hi: 'हरी मिर्च', name_ta: 'பச்சை மிளகாய்', name_te: 'పచ్చి మిర్చి', name_en: 'Green Chili', cost_price: 60, selling_price: 90, current_stock: 12, unit: 'kg', low_stock_threshold: 4 },
    { id: 'p-cor-05', name_kn: 'ತಾಜಾ ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು', name_hi: 'ताज़ा हरा धनिया', name_ta: 'கொத்தமல்லி தழை', name_te: 'కొత్తిమీర', name_en: 'Fresh Coriander', cost_price: 8, selling_price: 15, current_stock: 25, unit: 'bunch', low_stock_threshold: 8 },
    { id: 'p-app-06', name_kn: 'ಶಿಮ್ಲಾ ಸೇಬು', name_hi: 'शिमला सेब', name_ta: 'சிம்லா ஆப்பிள்', name_te: 'సిమ్లా ఆపిల్', name_en: 'Shimla Apple', cost_price: 120, selling_price: 160, current_stock: 18, unit: 'kg', low_stock_threshold: 5 }
  ]);

  const getLocalizedProductName = (p: any, lang: string) => {
    if (!p) return '';
    if (lang === 'en') return p.name_en;
    if (lang === 'kn') return p.name_kn || p.name_en;
    if (lang === 'hi') return p.name_hi || p.name_kn || p.name_en;
    if (lang === 'ta') return p.name_ta || p.name_kn || p.name_en;
    if (lang === 'te') return p.name_te || p.name_kn || p.name_en;
    return p.name_kn || p.name_en;
  };
  const [orders, setOrders] = useState<any[]>([
    {
      id: 'ord-vs-101',
      order_number: 'VS-ORD-9842',
      customer_name: 'ಅನಿತಾ ಶರ್ಮಾ',
      customer_phone: '9845012345',
      delivery_address: 'Flat 302, Green Villa Apt, 4th Cross (350m away)',
      status: 'PLACED',
      payment_mode: 'UPI',
      total_amount: 145,
      distance_km: 0.35,
      items: [
        { product_name_snapshot: 'ನಾಟಿ ಟೊಮೇಟೊ', quantity: 2, unit: 'kg', subtotal: 70 },
        { product_name_snapshot: 'ಈರುಳ್ಳಿ', quantity: 1, unit: 'kg', subtotal: 42 },
        { product_name_snapshot: 'ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು', quantity: 2, unit: 'bunch', subtotal: 30 }
      ]
    },
    {
      id: 'ord-vs-102',
      order_number: 'VS-ORD-7719',
      customer_name: 'Rajesh Kumar',
      customer_phone: '9988776655',
      delivery_address: 'House #45, 2nd Main Road, BTM (600m away)',
      status: 'ACCEPTED',
      payment_mode: 'CASH',
      total_amount: 210,
      distance_km: 0.6,
      items: [
        { product_name_snapshot: 'ಆಲೂಗಡ್ಡೆ', quantity: 3, unit: 'kg', subtotal: 114 },
        { product_name_snapshot: 'ಹಸಿ ಮೆಣಸಿನಕಾಯಿ', quantity: 1, unit: 'kg', subtotal: 90 }
      ]
    }
  ]);
  const [udhaarRecords, setUdhaarRecords] = useState<any[]>([
    { id: 'u-1', customer_name: 'ಗೋವಿಂದಪ್ಪ', customer_phone: '9845112233', remaining_balance: 350, status: 'PENDING' },
    { id: 'u-2', customer_name: 'ಲಕ್ಷ್ಮಿ ಟೀ ಸ್ಟಾಲ್', customer_phone: '9880223344', remaining_balance: 420, status: 'PENDING' },
    { id: 'u-3', customer_name: 'ಮಂಜುಳಾ', customer_phone: '9900334455', remaining_balance: 130, status: 'PENDING' }
  ]);
  const [mobilityRecs, setMobilityRecs] = useState<any[]>([
    {
      location_name: 'BTM 2nd Stage Water Tank Junction',
      location_name_kn: 'ಬಿಟಿಎಂ 2ನೇ ಹಂತ ವಾಟರ್ ಟ್ಯಾಂಕ್ ವೃತ್ತ',
      distance_km: 0.6,
      score: 94,
      demand_level: 'Very High',
      active_competitors_count: 0,
      estimated_turnover_inr: 1850,
      high_demand_products: ['Tomato', 'Onion', 'Coriander', 'Green Chili'],
      saturated_products: [],
      recommendation_reason: 'High pedestrian evening traffic with zero competitor vegetable stalls in 400m radius.',
      recommendation_reason_kn: 'ಸಂಜೆ ಹೆಚ್ಚಿನ ಪಾದಚಾರಿ ದಟ್ಟಣೆ ಮತ್ತು 400 ಮೀಟರ್ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಯಾವುದೇ ತರಕಾರಿ ಮಾರಾಟಗಾರರಿಲ್ಲ.'
    },
    {
      location_name: 'Koramangala 4th Block Park Gate',
      location_name_kn: 'ಕೋರಮಂಗಲ 4ನೇ ಬ್ಲಾಕ್ ಪಾರ್ಕ್ ಗೇಟ್',
      distance_km: 1.2,
      score: 88,
      demand_level: 'High',
      active_competitors_count: 1,
      estimated_turnover_inr: 1420,
      high_demand_products: ['Shimla Apple', 'Orange', 'Pomegranate'],
      saturated_products: ['Tomato'],
      recommendation_reason: 'Morning walkers seeking fresh fruit baskets.',
      recommendation_reason_kn: 'ಬೆಳಗಿನ ವಾಯುವಿಹಾರಿಗಳು ತಾಜಾ ಹಣ್ಣುಗಳನ್ನು ಹುಡುಕುತ್ತಿದ್ದಾರೆ.'
    }
  ]);
  const [clusterWarning, setClusterWarning] = useState<string | null>(null);
  const [demandForecasts, setDemandForecasts] = useState<any[]>([
    {
      product_name_en: 'Tomato (Native)',
      product_name_kn: 'ನಾಟಿ ಟೊಮೇಟೊ',
      current_stock: 45,
      unit: 'kg',
      daily_forecasts: [{ predicted_demand: 55, recommended_morning_stock: 60 }]
    },
    {
      product_name_en: 'Pune Onion',
      product_name_kn: 'ಈರುಳ್ಳಿ',
      current_stock: 60,
      unit: 'kg',
      daily_forecasts: [{ predicted_demand: 70, recommended_morning_stock: 75 }]
    },
    {
      product_name_en: 'Fresh Coriander',
      product_name_kn: 'ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು',
      current_stock: 25,
      unit: 'bunch',
      daily_forecasts: [{ predicted_demand: 40, recommended_morning_stock: 45 }]
    }
  ]);
  const [weatherData, setWeatherData] = useState<any>({
    temperature_celsius: 28,
    weather_condition: 'Partly Sunny',
    weather_condition_kn: 'ಭಾಗಶಃ ಬಿಸಿಲು',
    advisory: 'Excellent conditions for pushcart street vending today. Keep leafy vegetables lightly sprinkled with water.',
    advisory_kn: 'ಇಂದು ಬೀದಿಬದಿ ಗಾಡಿ ವ್ಯಾಪಾರಕ್ಕೆ ಅತ್ಯುತ್ತಮ ಹವಾಮಾನ. ಸೊಪ್ಪುಗಳಿಗೆ ಹಗುರವಾಗಿ ನೀರು ಚಿಮುಕಿಸಿ.'
  });
  const [dashboard, setDashboard] = useState<any>({
    today_sales_revenue: 1480,
    today_net_profit: 540,
    today_sales_count: 12,
    pending_orders_count: 2,
    total_udhaar_outstanding: 900
  });

  // Swiggy / Zomato Partner Mode States
  const [isDutyOnline, setIsDutyOnline] = useState(true);
  const [incomingOrderAlert, setIncomingOrderAlert] = useState<{
    isOpen: boolean;
    order: any | null;
    timeLeft: number;
  }>({
    isOpen: false,
    order: null,
    timeLeft: 30
  });

  // Micro-Vendor Smart Soundbox & UPI QR Code State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrDisplayAmount, setQrDisplayAmount] = useState<number>(0);

  // AI Spatial-Temporal Fleet & People Management State (Ramesh vs Suresh collision deconfliction)
  const [fleetDispatchData, setFleetDispatchData] = useState<any>({
    dispatch_status: "OPTIMAL_COORDINATED",
    active_fleet_count: 3,
    peer_slots: [
      {
        id: "slot-01",
        vendor_name: "Ramesh Kumar (You)",
        vendor_name_kn: "ರಮೇಶ್ ಕುಮಾರ್",
        category: "ತರಕಾರಿಗಳು",
        target_location: "BTM 2nd Stage Water Tank Junction",
        target_location_kn: "ಬಿಟಿಎಂ 2ನೇ ಹಂತ ವಾಟರ್ ಟ್ಯಾಂಕ್ ವೃತ್ತ",
        time_window: "4:00 PM - 6:00 PM",
        status: "COMPLETED_SOLD_OUT",
        status_label: "✅ Sold Out (100% Demand Met)",
        revenue_earned_inr: 1850,
        demand_depleted_percent: 88,
        saturation_cooldown_hours_left: 3.5,
        inventory_sold: "Native Tomato (45kg), Pune Onion (60kg)"
      },
      {
        id: "slot-02",
        vendor_name: "Suresh Gowda (Peer Vendor)",
        vendor_name_kn: "ಸುರೇಶ್ ಗೌಡ (ಸಹ-ಮಾರಾಟಗಾರ)",
        category: "ತರಕಾರಿಗಳು",
        target_location: "BTM 2nd Stage (Original Intent)",
        target_location_kn: "ಬಿಟಿಎಂ 2ನೇ ಹಂತ",
        time_window: "6:30 PM - 8:30 PM",
        status: "AI_REROUTED",
        status_label: "🔄 AI Rerouted to Prevent Loss",
        conflict_warning: "⚠️ BTM 2nd Stage was covered by Ramesh at 4:00 PM. Neighborhood is 88% saturated.",
        conflict_warning_kn: "⚠️ ಬಿಟಿಎಂ 2ನೇ ಹಂತವನ್ನು ಸಂಜೆ 4:00 ಕ್ಕೆ ರಮೇಶ್ ಆವರಿಸಿದ್ದಾರೆ. ಅಲ್ಲಿ ತರಕಾರಿ ಬೇಡಿಕೆ ಖಾಲಿಯಾಗಿದೆ.",
        optimized_route_recommendation: {
          strategy_1_reroute: {
            destination: "HSR Layout Sector 2 Main Road",
            destination_kn: "ಎಚ್‌ಎಸ್‌ಆರ್ ಲೇಔಟ್ ಸೆಕ್ಟರ್ 2 ಮುಖ್ಯ ರಸ್ತೆ",
            time_window: "6:30 PM - 8:30 PM",
            category: "Vegetables",
            expected_revenue_inr: 2150,
            unmet_demand_score: 96,
            reason: "High residential dinner rush with 0 active vegetable carts."
          },
          strategy_2_product_pivot: {
            destination: "BTM 2nd Stage Water Tank Junction",
            category: "ಹಣ್ಣುಗಳು & Snacks",
            products: ["Shimla Apple", "Banana", "Chili Bajji"],
            expected_revenue_inr: 1600,
            reason: "Vegetable demand is full, but evening fruit and snack demand is 95% open!"
          }
        }
      },
      {
        id: "slot-03",
        vendor_name: "Manjunath (Peer Vendor)",
        vendor_name_kn: "ಮಂಜುನಾಥ್ (ಸಹ-ಮಾರಾಟಗಾರ)",
        category: "ಹಣ್ಣುಗಳು",
        target_location: "Koramangala 4th Block Park Gate",
        target_location_kn: "ಕೋರಮಂಗಲ 4ನೇ ಬ್ಲಾಕ್ ಪಾರ್ಕ್ ಗೇಟ್",
        time_window: "5:30 PM - 7:30 PM",
        status: "ACTIVE_ON_DUTY",
        status_label: "🟢 On Duty (Zero Conflict)",
        revenue_earned_inr: 1420,
        demand_depleted_percent: 45,
        saturation_cooldown_hours_left: 0.0,
        inventory_sold: "Apple, Pomegranate, Banana"
      }
    ],
    mutual_gain_summary: {
      without_ai_coordination: {
        ramesh_revenue_inr: 1850,
        suresh_revenue_inr: 150,
        total_combined_inr: 2000,
        suresh_spoilage_loss_inr: 900,
        outcome_summary: "Ramesh earns well, Suresh suffers heavy unsold vegetable spoilage."
      },
      with_ai_coordination: {
        ramesh_revenue_inr: 1850,
        suresh_revenue_inr: 2150,
        total_combined_inr: 4000,
        suresh_spoilage_loss_inr: 0,
        community_profit_uplift_percent: 100.0,
        spoilage_prevented_kg: 45.0,
        outcome_summary: "Both Ramesh & Suresh earn peak profits with zero market cannibalization!"
      }
    }
  });

  // Offline Sync State
  const [lastSyncTime, setLastSyncTime] = useState('Just Now');

  // Trigger Incoming Customer Order (Swiggy / Zomato style popup with sound)
  const triggerSimulateIncomingOrder = () => {
    sounds.playVendorBell();
    const mockIncoming = {
      id: `ord-in-${Date.now()}`,
      order_number: `VS-ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_name: 'ಅನಿತಾ ಶರ್ಮಾ',
      customer_phone: '9845012345',
      delivery_address: 'Flat 302, Green Villa Apt, 4th Cross (350m away)',
      distance_km: 0.35,
      items: [
        { product_name_snapshot: 'ನಾಟಿ ಟೊಮೇಟೊ', quantity: 2, unit: 'kg', subtotal: 70 },
        { product_name_snapshot: 'ಆಲೂಗಡ್ಡೆ', quantity: 1, unit: 'kg', subtotal: 35 },
        { product_name_snapshot: 'ಕೊತ್ತಂಬರಿ', quantity: 2, unit: 'bunch', subtotal: 30 }
      ],
      total_amount: 135,
      payment_mode: 'CASH ON DELIVERY (COD)',
      status: 'PENDING'
    };

    setIncomingOrderAlert({
      isOpen: true,
      order: mockIncoming,
      timeLeft: 30
    });
  };

  // Timer countdown for incoming order acceptance
  useEffect(() => {
    let timer: any = null;
    if (incomingOrderAlert.isOpen && incomingOrderAlert.timeLeft > 0) {
      timer = setInterval(() => {
        setIncomingOrderAlert(prev => {
          if (prev.timeLeft <= 1) {
            return { ...prev, isOpen: false, timeLeft: 0 };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [incomingOrderAlert.isOpen, incomingOrderAlert.timeLeft]);

  const handleAcceptIncomingOrder = () => {
    if (incomingOrderAlert.order) {
      sounds.playVendorBell();
      setOrders(prev => [incomingOrderAlert.order, ...prev]);
      setIncomingOrderAlert({ isOpen: false, order: null, timeLeft: 0 });
      setNavTab('orders');
    }
  };

  // Nearby simulated carts for map
  const [nearbyCarts] = useState<any[]>([
    {
      vendor_id: 'v-comp-01',
      business_name: 'Manjunath Fruits & Veg',
      business_name_kn: 'ಮಂಜುನಾಥ್ ಹಣ್ಣು & ತರಕಾರಿ ಗಾಡಿ',
      business_category: 'Vegetables',
      latitude: 12.9745,
      longitude: 77.5910,
      distance_km: 0.4,
      rating_avg: 4.8
    },
    {
      vendor_id: 'v-comp-02',
      business_name: 'Suresh Tea & Snacks Bike',
      business_name_kn: 'ಸುರೇಶ್ ಟೀ & ಸ್ನ್ಯಾಕ್ಸ್ ಬೈಕ್',
      business_category: 'Snacks',
      latitude: 12.9690,
      longitude: 77.5980,
      distance_km: 0.8,
      rating_avg: 4.6
    }
  ]);

  // Real GPS Detection
  const detectLiveGPS = () => {
    setIsGpsLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setVendorLocation([lat, lon]);
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            if (data.display_name) {
              setLocationAddress(data.display_name.split(',').slice(0, 3).join(', '));
            }
          } catch (_) {
            setLocationAddress(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
          }
          setIsGpsLoading(false);
          sounds.playVendorBell();
        },
        () => {
          setIsGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsGpsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    detectLiveGPS();
  }, [authToken]);

  const loadAllData = async () => {
    try {
      const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, password: loginPin })
      });
      const loginData = await loginRes.json();
      const token = loginData.data?.access_token || authToken;

      if (!token) return;

      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Dashboard
      fetch('http://localhost:8000/api/v1/vendors/dashboard-summary', { headers })
        .then(r => r.json()).then(d => { if (d.data) setDashboard(d.data); });

      // 2. Products
      fetch('http://localhost:8000/api/v1/products', { headers })
        .then(r => r.json()).then(d => { if (Array.isArray(d.data) && d.data.length > 0) setProducts(d.data); });

      // 3. Orders
      fetch('http://localhost:8000/api/v1/orders/vendor', { headers })
        .then(r => r.json()).then(d => { if (Array.isArray(d.data) && d.data.length > 0) setOrders(d.data); });

      // 4. Udhaar
      fetch('http://localhost:8000/api/v1/udhaar', { headers })
        .then(r => r.json()).then(d => { if (Array.isArray(d.data?.records) && d.data.records.length > 0) setUdhaarRecords(d.data.records); });

      // 5. Mobility & Anti-Clustering
      fetch('http://localhost:8000/api/v1/mobility/recommendations', { headers })
        .then(r => r.json()).then(d => {
          if (Array.isArray(d.data?.recommendations) && d.data.recommendations.length > 0) {
            setMobilityRecs(d.data.recommendations);
            if (d.data.cluster_warning) setClusterWarning(d.data.cluster_warning);
          }
        });

      // 6. AI Demand
      fetch('http://localhost:8000/api/v1/weather/demand-forecast?days=7', { headers })
        .then(r => r.json()).then(d => { if (Array.isArray(d.data) && d.data.length > 0) setDemandForecasts(d.data); });

      // 7. Weather
      fetch('http://localhost:8000/api/v1/weather/current?lat=12.9716&lon=77.5946')
        .then(r => r.json()).then(d => { if (d.data) setWeatherData(d.data); });

      // 8. Spatial-Temporal Fleet Dispatch & Anti-Saturation
      fetch('http://localhost:8000/api/v1/mobility/fleet-dispatch', { headers })
        .then(r => r.json()).then(d => { if (d.data) setFleetDispatchData(d.data); });

      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.warn('Vendor sync warning:', e);
    }
  };

  // Vendor Authentication Handler
  const handleVendorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, password: loginPin })
      });
      const data = await res.json();

      if (data.data?.access_token) {
        setAuthToken(data.data.access_token);
        localStorage.setItem('vs_vendor_token', data.data.access_token);
        const userObj = {
          name: 'ರಮೇಶ್',
          phone: loginPhone,
          business_name: t.vendorTitle,
          category: 'Vegetables',
          vehicle_type: 'ನೂಕುಗಾಡಿ',
          upi_id: `${loginPhone}@upi`,
          apmc_license: 'KA-MND-2026-8891'
        };
        setVendorUser(userObj);
        localStorage.setItem('vs_vendor_user', JSON.stringify(userObj));
        sounds.playSuccessChime();
        setIsLoginOpen(false);
        loadAllData();
      } else {
        setLoginError('Invalid PIN or Phone Number. Try Demo PIN: 1234');
      }
    } catch (_) {
      setAuthToken('demo_token');
      setIsLoginOpen(false);
      sounds.playSuccessChime();
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sounds.playVendorBell();
    localStorage.removeItem('vs_vendor_token');
    localStorage.removeItem('vs_vendor_user');
    setAuthToken(null);
    setIsLoginOpen(true);
  };

  // Language detection helper for queries in Kannada, Tamil, Hindi, Telugu, etc.
  const detectScriptLanguage = (text: string, defaultLang: string = 'kn'): string => {
    if (!text) return defaultLang;
    // 1. Unicode Range Detection (High Precision)
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
    if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Punjabi
    if (/[\u0900-\u097F]/.test(text)) {
      if (/भाजी|किती|आहे|घ्या|विक्री|नफा|कांदा|बटाटा/.test(text)) return 'mr'; // Marathi
      return 'hi'; // Hindi
    }
    // 2. Transliterated / Phonetic Markers
    const low = text.toLowerCase();
    if (/vanakkam|virpanai|laabam|thakkali|evvalavu|kaaikari|urulaikilangu|vengayam|kadan|enna/.test(low)) return 'ta';
    if (/namaskara|eshtu|yestu|maraata|laabha|tarakari|eerulli|alugadde|dharane|beku/.test(low)) return 'kn';
    if (/namaskaram|ammakaalu|laabham|enta|kooragayalu|tamata|ullipaya|baaki/.test(low)) return 'te';
    if (/namaste|kitna|bikri|munafa|tamatar|pyaaz|aalu|udhaar|kya|chahiye/.test(low)) return 'hi';
    if (/what|today|sales|profit|stock|price|weather|order|orders|hello|help|cart/.test(low)) return 'en';

    return defaultLang;
  };

  // Multilingual Offline/Fallback Localizer
  const getMultilingualFallback = (query: string, lang: string) => {
    const q = query.toLowerCase();
    let actionType: 'sales' | 'stock' | 'map' | 'qr' | 'weather' | undefined;

    const dict: Record<string, { sales: string; profit: string; stock: string; map: string; qr: string; weather: string; help: string }> = {
      kn: {
        sales: `ಇಂದಿನ ಒಟ್ಟು ಮಾರಾಟ ₹${dashboard.today_sales_revenue}, ನಿವ್ವಳ ಲಾಭ ₹${dashboard.today_net_profit}.`,
        profit: `ಇಂದಿನ ನಿಮ್ಮ ನಿವ್ವಳ ಲಾಭ ₹${dashboard.today_net_profit}. ಮಾರಾಟ ಮೊತ್ತ ₹${dashboard.today_sales_revenue}.`,
        stock: 'ನಿಮ್ಮ ಗಾಡಿಯಲ್ಲಿ ನಾಟಿ ಟೊಮೇಟೊ 45 ಕೆಜಿ, ಈರುಳ್ಳಿ 60 ಕೆಜಿ ಮತ್ತು ಆಲೂಗಡ್ಡೆ 50 ಕೆಜಿ ದಾಸ್ತಾನು ಲಭ್ಯವಿದೆ.',
        map: 'ಮುಂದಿನ ಗರಿಷ್ಠ ಲಾಭದ ಸ್ಥಳ: ಬಿಟಿಎಂ 2ನೇ ಹಂತ ವಾಟರ್ ಟ್ಯಾಂಕ್ ವೃತ್ತ. ಅಲ್ಲಿ ಯಾವುದೇ ಸ್ಪರ್ಧಿಗಳಿಲ್ಲ.',
        qr: 'ಗ್ರಾಹಕರಿಗೆ ತೋರಿಸಲು ನಿಮ್ಮ ಯುಪಿಐ ಕ್ಯೂಆರ್ ಕೋಡ್ ಸಿದ್ಧವಾಗಿದೆ. ಯುಪಿಐ ಐಡಿ: ramesh.veg@okhdfcbank',
        weather: 'ಇಂದು 28°C ತಾಪಮಾನವಿದ್ದು, ಗಾಡಿ ವ್ಯಾಪಾರಕ್ಕೆ ಅತ್ಯುತ್ತಮ ಹವಾಮಾನವಿದೆ.',
        help: 'ನಮಸ್ಕಾರ! ನಾನು VendorSaathi AI ಧ್ವನಿ ಸಹಾಯಕ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?'
      },
      ta: {
        sales: `இன்று உங்கள் மொத்த விற்பனை ₹${dashboard.today_sales_revenue}, நிகர லாபம் ₹${dashboard.today_net_profit}.`,
        profit: `இன்றைய உங்கள் நிகர லாபம் ₹${dashboard.today_net_profit}. மொத்த விற்பனை ₹${dashboard.today_sales_revenue}.`,
        stock: 'உங்கள் வண்டியில் 45 கிலோ நாட்டு தக்காளி, 60 கிலோ வெங்காயம், 50 கிலோ உருளைக்கிழங்கு இருப்பு உள்ளது.',
        map: 'அடுத்த சிறந்த விற்பனை பகுதி: பிடிஎம் 2வது நிலை தண்ணீர் தொட்டி சந்திப்பு.',
        qr: 'வாடிக்கையாளர் ஸ்கேன் செய்ய உங்கள் பாரத் க்யூஆர் கோட் தயார். UPI ID: ramesh.veg@okhdfcbank',
        weather: 'வானிலை 28°C ஆக உள்ளது, தள்ளுவண்டி வியாபாரத்திற்கு ஏற்ற சாதகமான சூழல்.',
        help: 'வணக்கம்! நான் VendorSaathi AI குரல் உதவியாளர். நான் உங்களுக்கு எப்படி உதவ முடியும்?'
      },
      hi: {
        sales: `आज की कुल बिक्री ₹${dashboard.today_sales_revenue} और शुद्ध मुनाफा ₹${dashboard.today_net_profit} है।`,
        profit: `आज का आपका शुद्ध मुनाफा ₹${dashboard.today_net_profit} है। कुल बिक्री ₹${dashboard.today_sales_revenue} रही।`,
        stock: 'आपके ठेले में 45 किलो देशी टमाटर, 60 किलो प्याज और 50 किलो आलू स्टॉक में उपलब्ध है।',
        map: 'अगला सबसे अच्छा स्थान: बीटीएम द्वितीय चरण वाटर टैंक चौराहा है।',
        qr: 'ग्राहकों के भुगतान के लिए आपका भारत क्यूआर तैयार है। UPI ID: ramesh.veg@okhdfcbank',
        weather: 'वर्तमान तापमान 28°C है और मौसम साफ व व्यापार के अनुकूल है।',
        help: 'नमस्ते! मैं VendorSaathi AI वॉइस असिस्टेंट हूँ। मैं आपकी क्या मदद कर सकता हूँ?'
      },
      te: {
        sales: `ఈరోజు మొత్తం అమ్మకాలు ₹${dashboard.today_sales_revenue} మరియు నికర లాభం ₹${dashboard.today_net_profit}.`,
        profit: `ఈరోజు మీ నికర లాభం ₹${dashboard.today_net_profit}. మొత్తం అమ్మకాలు ₹${dashboard.today_sales_revenue}.`,
        stock: 'మీ బండిలో 45 కిలోల నాటు టమోటాలు, 60 కిలోల ఉల్లిపాయలు, 50 కిలోల బంగాళాదుంపలు స్టాక్ ఉన్నాయి.',
        map: 'తదుపరి ఉత్తమ వ్యాపార స్థలం: బీటీఎం 2వ స్టేజ్ వాటర్ ట్యాంక్ జంక్షన్.',
        qr: 'కస్టమర్ చెల్లింపు కోసం మీ భారత్ క్యూఆర్ కోడ్ సిద్ధంగా ఉంది. UPI ID: ramesh.veg@okhdfcbank',
        weather: 'ప్రస్తుత ఉష్ణోగ్రత 28°C, తోపుడు బండి వ్యాపారానికి అనుకూలమైన వాతావరణం.',
        help: 'నమస్కారం! నేను VendorSaathi AI వాయిస్ అసిస్టెంట్. నేను మీకు ఎలా సహాయపడగలను?'
      },
      en: {
        sales: `Today's total sales revenue is ₹${dashboard.today_sales_revenue} with net profit of ₹${dashboard.today_net_profit}.`,
        profit: `Your total net profit today is ₹${dashboard.today_net_profit} from ₹${dashboard.today_sales_revenue} in sales.`,
        stock: 'You have 45 kg Tomatoes, 60 kg Onions, and 50 kg Potatoes in cart stock.',
        map: 'Optimal next location is BTM 2nd Stage Water Tank Junction with zero competitor carts.',
        qr: 'Your BharatQR Standee is ready. UPI ID: ramesh.veg@okhdfcbank',
        weather: 'Current temperature is 28°C with clear skies, favorable for cart vending.',
        help: 'Hello! I am VendorSaathi AI Voice Assistant. How can I help your street business?'
      }
    };

    const targetPack = dict[lang] || dict.kn;
    const enPack = dict.en;

    if (/profit|ಲಾಭ|मुनाफा|லாபம்|లాభం|कमाई|nafa/.test(q)) {
      actionType = 'sales';
      return { nativeText: targetPack.profit, enText: enPack.profit, actionType };
    }
    if (/sales|ಮಾರಾಟ|बिक्री|விற்பனை|అమ్మకాలు|revenue|vikri/.test(q)) {
      actionType = 'sales';
      return { nativeText: targetPack.sales, enText: enPack.sales, actionType };
    }
    if (/stock|ದಾಸ್ತಾನು|स्टॉक|இருப்பு|స్టాక్|tomato|potato|onion|ಟೊಮೇಟೊ|टमाटर|தக்காளி|ಈರುಳ್ಳಿ|प्याज|வெங்காயம்/.test(q)) {
      actionType = 'stock';
      return { nativeText: targetPack.stock, enText: enPack.stock, actionType };
    }
    if (/map|route|ದಾರಿ|ನಕ್ಷೆ|कहाँ|எங்கே|రూట్|ಸ್ಥಳ|location/.test(q)) {
      actionType = 'map';
      return { nativeText: targetPack.map, enText: enPack.map, actionType };
    }
    if (/qr|upi|ಪಾವತಿ|क्रेडिट|payment|soundbox|பணம்|చెల్లింపు/.test(q)) {
      actionType = 'qr';
      return { nativeText: targetPack.qr, enText: enPack.qr, actionType };
    }
    if (/weather|ಹವಾಮಾನ|मौसम|வானிலை|వాతావరణం|rain|ಮಳೆ|बारिश/.test(q)) {
      actionType = 'weather';
      return { nativeText: targetPack.weather, enText: enPack.weather, actionType };
    }

    return { nativeText: targetPack.help, enText: enPack.help, actionType };
  };

  // Play Native Speech Audio in Target Language (MP3 base64 or WebSpeech Synthesis)
  const playNativeVoiceAudio = (audioBase64: string | null, text: string, langCode?: string) => {
    setIsSpeaking(true);
    const targetLang = langCode || language || 'kn';
    const langConfig = ALL_REGIONAL_LANGUAGES.find(l => l.code === targetLang) || currentLangConfig;

    if (audioBase64) {
      try {
        const audio = new Audio("data:audio/mp3;base64," + audioBase64);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => {
          speakUtterance(text, langConfig);
        };
        audio.play().catch(() => {
          speakUtterance(text, langConfig);
        });
        return;
      } catch (_) {
        speakUtterance(text, langConfig);
        return;
      }
    }

    speakUtterance(text, langConfig);
  };

  const speakUtterance = (text: string, langConfig: any) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langConfig.langTag;
      
      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find(v => v.lang === langConfig.langTag || v.lang.startsWith(langConfig.code));
      if (matched) utterance.voice = matched;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  // Web Speech API with Dynamic Regional Language Recognition
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      executeVoiceQuery(t.voicePrompts[0].text);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = currentLangConfig.langTag;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus(`${currentLangConfig.name}: ${t.micPrompt}...`);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceQuery(transcript);
      executeVoiceQuery(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceStatus(t.micPrompt);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const executeVoiceQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setVoiceQuery(queryText);
    setCustomTextInput('');
    setVoiceStatus('AI Processing Action...');

    // Detect language of query (Kannada, Tamil, Hindi, Telugu, etc.)
    const detectedInputLang = detectScriptLanguage(queryText, language);
    const langConfig = ALL_REGIONAL_LANGUAGES.find(l => l.code === detectedInputLang) || currentLangConfig;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = `user-${Date.now()}`;
    const userMessage: any = {
      id: userMsgId,
      role: 'user',
      textNative: queryText,
      detectedLang: detectedInputLang,
      time: timeStr
    };

    setVoiceMessages(prev => [...prev, userMessage]);

    // Local fallback in case network drops
    const { nativeText: fallbackNative, enText: fallbackEn, actionType } = getMultilingualFallback(queryText, detectedInputLang);

    try {
      const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, password: loginPin })
      });
      const token = (await loginRes.json()).data?.access_token || authToken;

      const res = await fetch('http://localhost:8000/api/v1/voice/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query_text: queryText, language: detectedInputLang })
      });

      const json = await res.json();
      if (json.data) {
        const detectedResponseLang = json.data.language || detectedInputLang;
        const nativeResponse = json.data.speech_response_native || json.data.speech_response_kn || fallbackNative;
        const enResponse = json.data.speech_response_text || fallbackEn;
        const audioB64 = json.data.audio_base64_response;

        setVoiceResponseNative(nativeResponse);
        setVoiceResponseEn(enResponse);
        setVoiceAudioBase64(audioB64);
        const respLangConfig = ALL_REGIONAL_LANGUAGES.find(l => l.code === detectedResponseLang) || langConfig;
        setVoiceStatus(`✓ Replied in ${respLangConfig.name}`);

        setVoiceMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            textNative: nativeResponse,
            textEn: enResponse,
            audioB64: audioB64,
            detectedLang: detectedResponseLang,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionType
          }
        ]);

        sounds.playSuccessChime();
        playNativeVoiceAudio(audioB64, detectedResponseLang === 'en' ? enResponse : nativeResponse, detectedResponseLang);
        loadAllData();
      } else {
        throw new Error('API returned empty');
      }
    } catch (_) {
      setVoiceResponseNative(fallbackNative);
      setVoiceResponseEn(fallbackEn);
      setVoiceStatus(`✓ Replied in ${langConfig.name}`);

      setVoiceMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          textNative: fallbackNative,
          textEn: fallbackEn,
          audioB64: null,
          detectedLang: detectedInputLang,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionType
        }
      ]);

      sounds.playSuccessChime();
      playNativeVoiceAudio(null, detectedInputLang === 'en' ? fallbackEn : fallbackNative, detectedInputLang);
    }
  };

  // Quick POS: Add to Cart
  const handlePosAddToCart = (product: any) => {
    sounds.playCashRegister();
    setPosCart(prev => {
      const existing = prev[product.id];
      const newQty = existing ? existing.quantity + 1 : 1;
      return { ...prev, [product.id]: { product, quantity: newQty } };
    });
  };

  // Quick POS: Complete Sale
  const handleCompletePosSale = async () => {
    const items = Object.values(posCart);
    if (items.length === 0) return;

    const discountMultiplier = isClearanceActive ? 0.7 : 1.0;
    const totalAmount = items.reduce((sum, item) => {
      const price = item.product.is_perishable && isClearanceActive 
        ? Math.round(item.product.selling_price * discountMultiplier) 
        : item.product.selling_price;
      return sum + (item.quantity * price);
    }, 0);
    const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.product.cost_price), 0);
    const netProfit = totalAmount - totalCost;

    const salePayload = {
      customer_name: posCustomerName || (posPaymentMode === 'UDHAAR' ? 'Gram Customer' : 'Walk-in Cash Customer'),
      total_amount: totalAmount,
      discount_amount: isClearanceActive ? Math.round(totalAmount * 0.3) : 0.0,
      payment_mode: posPaymentMode,
      cash_paid: posPaymentMode === 'CASH' ? totalAmount : 0.0,
      upi_paid: posPaymentMode === 'UPI' ? totalAmount : 0.0,
      udhaar_amount: posPaymentMode === 'UDHAAR' ? totalAmount : 0.0,
      items: items.map(i => ({
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.is_perishable && isClearanceActive 
          ? Math.round(i.product.selling_price * discountMultiplier) 
          : i.product.selling_price
      }))
    };

    try {
      const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, password: loginPin })
      });
      const token = (await loginRes.json()).data?.access_token || authToken;

      await fetch('http://localhost:8000/api/v1/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(salePayload)
      });

      sounds.playPaymentSoundbox(totalAmount, language, currencyConfig.symbol);
      setLastBill({
        totalAmount,
        netProfit,
        mode: posPaymentMode,
        itemsCount: items.length,
        time: new Date().toLocaleTimeString()
      });
      setPosCart({});
      setPosCustomerName('');
      setPosCustomerPhone('');
      loadAllData();
    } catch (_) {
      sounds.playPaymentSoundbox(totalAmount, language, currencyConfig.symbol);
      // Offline mutation queue for rural zones with spotty network
      const offlineSale = {
        entity_type: 'SALE',
        mutation_type: 'CREATE',
        payload: salePayload,
        created_at: new Date().toISOString()
      };
      const updatedQ = [...offlineQueue, offlineSale];
      setOfflineQueue(updatedQ);
      localStorage.setItem('vs_offline_queue', JSON.stringify(updatedQ));

      setLastBill({
        totalAmount,
        netProfit,
        mode: posPaymentMode,
        itemsCount: items.length,
        time: new Date().toLocaleTimeString()
      });
      setPosCart({});
      setPosCustomerName('');
      setPosCustomerPhone('');
    }
  };

  // Product CRUD: Add Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, password: loginPin })
      });
      const token = (await loginRes.json()).data?.access_token || authToken;

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
      loadAllData();
    } catch (_) {
      setIsAddProductOpen(false);
    }
  };

  // Product CRUD: Stock Stepper (+ / -)
  const handleUpdateStock = async (productId: string, delta: number) => {
    const p = products.find(i => i.id === productId);
    if (!p) return;
    const newStock = Math.max(0, p.current_stock + delta);

    try {
      const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, password: loginPin })
      });
      const token = (await loginRes.json()).data?.access_token || authToken;

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

  // Order Lifecycle Update
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, password: loginPin })
      });
      const token = (await loginRes.json()).data?.access_token || authToken;

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

  const posTotalAmount = Object.values(posCart).reduce((sum, item) => sum + (item.quantity * item.product.selling_price), 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white text-slate-900 relative">
      
      {/* 1. TOP MOBILE HEADER WITH REAL GPS STATUS, PROFILE BADGE & LOGIN TRIGGER */}
      <div className="bg-white px-4 py-3 border-b border-orange-100 flex-shrink-0 z-30 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-orange-500/30">
              {currentLangConfig.flag}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h2 className="font-black text-sm text-slate-900">{t.vendorTitle}</h2>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              </div>
              <p className="text-[11px] text-slate-500 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-orange-500" />
                <span className="truncate max-w-[180px]">{locationAddress}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Street Megaphone Loudspeaker Button */}
            <button
              onClick={() => setIsMegaphoneOpen(true)}
              className="w-9 h-9 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center active:scale-90 transition shadow-sm"
              title="Megaphone Loudspeaker"
            >
              <Megaphone className="w-4 h-4 text-orange-500 animate-pulse" />
            </button>

            {/* Street Safety SOS Button */}
            <button
              onClick={() => setIsSosOpen(true)}
              className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center active:scale-90 transition shadow-sm animate-pulse"
              title="Emergency SOS"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </button>

            {/* GPS Refresh Button */}
            <button
              onClick={detectLiveGPS}
              disabled={isGpsLoading}
              className="w-9 h-9 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 flex items-center justify-center active:scale-90 transition shadow-sm"
              title={t.locateMe}
            >
              <Crosshair className={`w-4 h-4 text-orange-500 ${isGpsLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Vendor Auth / Profile Button */}
            {authToken ? (
              <button
                onClick={() => { setNavTab('more'); setMoreSubTab('profile'); }}
                className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center active:scale-90 transition shadow-sm"
                title={t.vendorProfile}
              >
                <User className="w-4 h-4 text-emerald-600" />
              </button>
            ) : (
              <button
                onClick={() => setIsLoginOpen(true)}
                className="h-9 px-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-md active:scale-90 transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t.login}</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-World Zero-Connectivity & Village Offline Outbox Banner */}
        <div className={`flex items-center justify-between px-3.5 py-1.5 rounded-xl border text-[11px] font-bold ${
          isOnline
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-300 animate-pulse'
        }`}>
          <div className="flex items-center space-x-2">
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
            <span>
              {isOnline ? (t.onlineModeBanner || '🟢 Live Online Sync Active') : (t.offlineModeBanner || '🔴 Offline Safe Mode (Village Signal Drop)')}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {offlineQueue.length > 0 && (
              <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-black border border-amber-500/30">
                ⚡ {offlineQueue.length} Queued
              </span>
            )}
            <button
              onClick={handleForceSync}
              className="px-2 py-0.5 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 border border-orange-200 rounded-lg text-[10px] font-black transition flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3 text-emerald-400" />
              <span>{t.syncNow || 'Sync'}</span>
            </button>
          </div>
        </div>

        {/* Live Market Saturation Alert Banner */}
        {clusterWarning && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl flex items-center space-x-2 text-[11px] text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 animate-bounce" />
            <span className="font-bold">{clusterWarning}</span>
          </div>
        )}

        {/* Swiggy / Zomato Partner Duty Toggle */}
        <div className="flex items-center justify-between bg-orange-50/40 px-3.5 py-2 rounded-2xl border border-orange-100 text-xs">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isDutyOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
            <div>
              <span className="font-black text-white text-xs block">
                {isDutyOnline ? '🟢 Partner Status: ON DUTY' : '🔴 Partner Status: OFF DUTY'}
              </span>
              <span className="text-[10px] text-slate-500">
                {isDutyOnline ? 'Receiving Doorstep Customer Orders' : 'Orders Paused (Take Break)'}
              </span>
            </div>
          </div>
          <button
            onClick={() => { sounds.playVendorBell(); setIsDutyOnline(!isDutyOnline); }}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition shadow-md ${
              isDutyOnline
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200'
            }`}
          >
            {isDutyOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* 2. MAIN SCROLLABLE CONTENT BODY */}
      <div className="p-4 space-y-5 flex-1 overflow-y-auto">
        
        {/* TAB 1: HOME (DASHBOARD) */}
        {navTab === 'home' && (
          <div className="space-y-4 animate-in fade-in">

            {/* 🌟 1. EXECUTIVE PUSHCART SALES & PROFIT HUD CARD (PRIMARY HIGHLIGHT) */}
            <div className="bg-gradient-to-tr from-orange-600 via-amber-500 to-rose-500 text-white p-5 rounded-3xl shadow-xl shadow-orange-500/25 relative overflow-hidden space-y-4 border border-orange-400/40">
              {/* Giant Embossed Watermark Rupee */}
              <span className="absolute -right-3 -bottom-6 text-white/10 text-9xl font-black select-none pointer-events-none">
                ₹
              </span>

              {/* Vendor Verified Header */}
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-lg shadow-sm border border-white/30">
                    🛒
                  </div>
                  <div>
                    <h3 className="font-black text-xs text-white tracking-wide flex items-center space-x-1.5">
                      <span>{vendorUser?.business_name || 'Ramesh Fresh Cart'}</span>
                      <span className="bg-white/25 text-[9px] px-1.5 py-0.2 rounded-full">#12</span>
                    </h3>
                    <p className="text-[10px] text-orange-100 font-semibold">🌟 {t.vendorTitle}</p>
                  </div>
                </div>

                <div className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black text-white border border-white/30 flex items-center space-x-1 shadow-sm">
                  <span>🚀 +18%</span>
                </div>
              </div>

              {/* Main Total Sales Revenue Figure */}
              <div className="relative z-10 space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-100 block">
                  {t.todaySales}
                </span>
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow flex items-baseline space-x-2">
                  <span>{formatLocalizedCurrency(dashboard.today_sales_revenue, language, activeCurrency)}</span>
                </div>
              </div>

              {/* 3-Way Payment Split & Net Profit Pill Row */}
              <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/20 text-center relative z-10">
                <div className="bg-white/15 backdrop-blur-md p-2 rounded-2xl border border-white/10">
                  <span className="text-[9px] uppercase font-bold text-orange-100 block">💵 {t.cash}</span>
                  <span className="text-xs font-black text-white">₹860</span>
                </div>
                <div className="bg-white/15 backdrop-blur-md p-2 rounded-2xl border border-white/10">
                  <span className="text-[9px] uppercase font-bold text-orange-100 block">📲 {t.upi}</span>
                  <span className="text-xs font-black text-white">₹620</span>
                </div>
                <div className="bg-white/15 backdrop-blur-md p-2 rounded-2xl border border-white/10">
                  <span className="text-[9px] uppercase font-bold text-orange-100 block">🌿 {t.netProfit}</span>
                  <span className="text-xs font-black text-emerald-200">+{formatLocalizedCurrency(dashboard.today_net_profit, language, activeCurrency)}</span>
                </div>
              </div>
            </div>
            
            {/* 1-TAP REAL-WORLD PERISHABLE SPOILAGE RESCUE ("SHAAM KI BIKRI" / EVENING CLEARANCE) */}
            <div className={`p-4 rounded-3xl border transition-all space-y-3 ${
              isClearanceActive
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 border-orange-500 text-white shadow-xl shadow-orange-500/20'
                : 'bg-white border-orange-200/90 shadow-sm text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-white flex items-center space-x-1.5">
                      <span>{t.spoilageRescueTitle || 'Evening Clearance / Spoilage Rescue'}</span>
                      {isClearanceActive && (
                        <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                          ACTIVE (30% OFF)
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {t.spoilageRescueSubtitle || 'Prevent perishable food waste & rescue capital before sunset'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={toggleClearanceMode}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition shadow-md flex items-center space-x-1.5 active:scale-95 ${
                    isClearanceActive
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                      : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{isClearanceActive ? '✓ 30% Off ON' : '⚡ Clearance 30% Off'}</span>
                </button>
              </div>

              {/* Clearance Impact Counters */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-orange-100 text-xs">
                <div className="bg-orange-50/50 p-2 rounded-xl flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold">Food Saved:</span>
                  <span className="text-emerald-400 font-black text-xs">~{foodWastePreventedKg} kg Veggies</span>
                </div>
                <div className="bg-orange-50/50 p-2 rounded-xl flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold">Capital Rescued:</span>
                  <span className="text-amber-400 font-black text-xs">+{formatLocalizedCurrency(capitalRescued, language, activeCurrency)}</span>
                </div>
              </div>
            </div>

            {/* Daily Incentive Target Card with Multi-Currency */}
            <div className="bg-gradient-to-r from-purple-950/60 via-slate-950 to-indigo-950/60 p-4 rounded-3xl border border-purple-500/40 space-y-2.5 shadow-xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="p-2 rounded-xl bg-purple-500/20 text-amber-400">
                    <Award className="w-5 h-5 text-amber-400" />
                  </span>
                  <div>
                    <h4 className="font-black text-xs text-slate-900">Daily Mandi Milestone Target</h4>
                    <span className="text-[10px] text-purple-300">
                      Complete 11 orders for {formatCurrency(150, activeCurrency)} Mandi Fuel Bonus
                    </span>
                  </div>
                </div>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {formatCurrency(150, activeCurrency)} Bonus
                </span>
              </div>
              <div className="w-full bg-orange-100 h-2.5 rounded-full overflow-hidden border border-orange-200">
                <div className="bg-gradient-to-r from-purple-500 via-indigo-400 to-amber-400 h-full rounded-full w-[72%]" />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>{formatLocalizedNumber(8, language)} / {formatLocalizedNumber(11, language)} Orders Completed (72%)</span>
                <span className="text-emerald-400 font-extrabold">{formatLocalizedNumber(3, language)} More to Unlock Bonus!</span>
              </div>
            </div>
            
            {/* Quick KPI Grid with Localized Digits & Dynamic Multi-Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm text-slate-900 space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">{t.todaySales}</span>
                <div className="text-2xl font-black text-amber-400">
                  {formatLocalizedCurrency(dashboard.today_sales_revenue, language, activeCurrency)}
                </div>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+{formatLocalizedNumber('18', language)}% Today</span>
                </span>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm text-slate-900 space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">{t.netProfit}</span>
                <div className="text-2xl font-black text-emerald-400">
                  {formatLocalizedCurrency(dashboard.today_net_profit, language, activeCurrency)}
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  {formatLocalizedNumber('36.5', language)}% Margin
                </span>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm text-slate-900 space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">{t.orders}</span>
                <div className="text-2xl font-black text-blue-400">
                  {formatLocalizedNumber(orders.length, language)}
                </div>
                <span className="text-[10px] font-bold text-amber-400">
                  {formatLocalizedNumber(2, language)} Pending
                </span>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm text-slate-900 space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">{t.udhaarDue}</span>
                <div className="text-2xl font-black text-rose-400">
                  {formatLocalizedCurrency(dashboard.total_udhaar_outstanding, language, activeCurrency)}
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  {formatLocalizedNumber(3, language)} Customers
                </span>
              </div>
            </div>

            {/* AI Smart Route & Direct Google Maps Navigation Card */}
            {mobilityRecs.length > 0 && (
              <div className="bg-gradient-to-r from-blue-950/70 via-slate-950 to-teal-950/70 p-4 rounded-3xl border border-blue-500/40 space-y-3 shadow-xl">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                      <Navigation className="w-5 h-5 animate-pulse text-blue-400" />
                    </span>
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-wider text-blue-300">
                        🚀 AI Smart Route • Peak Demand Spot
                      </span>
                      <h4 className="font-black text-sm text-white mt-0.5">
                        {language === 'en' ? mobilityRecs[0].location_name : (mobilityRecs[0].location_name_kn || mobilityRecs[0].location_name)}
                      </h4>
                    </div>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-500/30">
                    Score: {formatLocalizedNumber(mobilityRecs[0].score, language)}/100
                  </span>
                </div>

                <div className="p-2.5 bg-orange-50/40 rounded-2xl flex items-center justify-between text-xs border border-orange-100 text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">Distance & ETA</span>
                    <strong className="text-white">{formatLocalizedNumber(mobilityRecs[0].distance_km, language)} km (~{formatLocalizedNumber(Math.max(3, Math.round(mobilityRecs[0].distance_km * 6)), language)} mins)</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">Est. Sales Surge</span>
                    <strong className="text-amber-400">{formatLocalizedCurrency(mobilityRecs[0].estimated_turnover_inr, language)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">Carry High Demand</span>
                    <strong className="text-emerald-400">{mobilityRecs[0].high_demand_products?.[0] || 'Tomato'}</strong>
                  </div>
                </div>

                {/* Direct Google Maps Navigation Button */}
                <button
                  onClick={() => {
                    sounds.playVendorBell();
                    const destLat = mobilityRecs[0].latitude || 12.9820;
                    const destLon = mobilityRecs[0].longitude || 77.6100;
                    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${vendorLocation[0]},${vendorLocation[1]}&destination=${destLat},${destLon}&travelmode=driving`;
                    window.open(mapsUrl, '_blank');
                  }}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center space-x-2"
                >
                  <Navigation className="w-4 h-4" />
                  <span>🚀 Open Google Maps Driving Navigation ➔</span>
                </button>
              </div>
            )}

            {/* Live GPS Map Preview Trigger */}
            <div className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm text-slate-900 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                    <Compass className="w-4 h-4 animate-spin text-orange-400" />
                  </span>
                  <div>
                    <h4 className="font-black text-xs text-slate-900">{t.liveMapTitle}</h4>
                    <span className="text-[10px] text-slate-500">GPS: {vendorLocation[0].toFixed(3)}, {vendorLocation[1].toFixed(3)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setNavTab('map')}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black transition flex items-center space-x-1"
                >
                  <span>{t.openMap}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick 1-Tap POS Fast Sale Banner */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-4 rounded-3xl text-white shadow-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-orange-200 block">
                  {t.posFastSaleTitle}
                </span>
                <h3 className="text-base font-black">{t.tabPos}</h3>
                <p className="text-[11px] text-orange-100">{t.posFastSaleSubtitle}</p>
              </div>
              <button
                onClick={() => setNavTab('pos')}
                className="px-4 py-2.5 bg-white text-orange-600 rounded-2xl font-black text-xs shadow-lg transition active:scale-95 flex items-center space-x-1"
              >
                <Receipt className="w-4 h-4" />
                <span>{t.openPos}</span>
              </button>
            </div>

            {/* Quick Action Grid */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider">{t.quickActions}</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setNavTab('products')}
                  className="p-4 bg-white hover:bg-orange-50/80 border border-orange-200/90 hover:border-orange-400 rounded-2xl text-left space-y-1 transition active:scale-95 shadow-sm hover:shadow group"
                >
                  <Package className="w-5 h-5 text-orange-500 group-hover:scale-110 transition" />
                  <h4 className="font-black text-xs text-slate-900 group-hover:text-orange-600 transition">{t.stockAction}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">{t.tabStock}</p>
                </button>

                <button
                  onClick={() => setNavTab('orders')}
                  className="p-4 bg-white hover:bg-orange-50/80 border border-orange-200/90 hover:border-orange-400 rounded-2xl text-left space-y-1 transition active:scale-95 shadow-sm hover:shadow group"
                >
                  <ShoppingBag className="w-5 h-5 text-blue-500 group-hover:scale-110 transition" />
                  <h4 className="font-black text-xs text-slate-900 group-hover:text-blue-600 transition">{t.ordersAction}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">{t.tabOrders}</p>
                </button>

                <button
                  onClick={() => setNavTab('payments')}
                  className="p-4 bg-white hover:bg-orange-50/80 border border-orange-200/90 hover:border-orange-400 rounded-2xl text-left space-y-1 transition active:scale-95 shadow-sm hover:shadow group"
                >
                  <DollarSign className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition" />
                  <h4 className="font-black text-xs text-slate-900 group-hover:text-emerald-600 transition">{t.udhaarAction}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">{t.sendWhatsappReminder}</p>
                </button>

                <button
                  onClick={() => { setNavTab('more'); setMoreSubTab('mobility'); }}
                  className="p-4 bg-white hover:bg-orange-50/80 border border-orange-200/90 hover:border-orange-400 rounded-2xl text-left space-y-1 transition active:scale-95 shadow-sm hover:shadow group"
                >
                  <Navigation2 className="w-5 h-5 text-purple-500 group-hover:scale-110 transition" />
                  <h4 className="font-black text-xs text-slate-900 group-hover:text-purple-600 transition">{t.routePrediction}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">{t.cannibalizationAlert}</p>
                </button>

                <button
                  onClick={() => setIsMegaphoneOpen(true)}
                  className="p-4 bg-white hover:bg-orange-50/80 border border-orange-300 hover:border-orange-500 rounded-2xl text-left space-y-1 transition active:scale-95 shadow-sm hover:shadow group"
                >
                  <Megaphone className="w-5 h-5 text-orange-500 group-hover:scale-110 transition animate-pulse" />
                  <h4 className="font-black text-xs text-slate-900 group-hover:text-orange-600 transition">{t.megaphoneTitle || 'Street Megaphone'}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Cart Loudspeaker Call</p>
                </button>

                <button
                  onClick={() => { setNavTab('more'); setMoreSubTab('ai'); }}
                  className="p-4 bg-white hover:bg-orange-50/80 border border-amber-300 hover:border-amber-500 rounded-2xl text-left space-y-1 transition active:scale-95 shadow-sm hover:shadow group"
                >
                  <Sparkles className="w-5 h-5 text-amber-500 group-hover:scale-110 transition" />
                  <h4 className="font-black text-xs text-slate-900 group-hover:text-amber-600 transition">{t.mandiBenchmarkTitle || 'Mandi Rates'}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Wholesale Benchmarks</p>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: LIVE GPS SATELLITE MAP */}
        {navTab === 'map' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-base text-slate-900">{t.liveMapTitle}</h3>
                <p className="text-[11px] text-slate-500">{locationAddress}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={detectLiveGPS}
                  className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white shadow-sm rounded-xl text-xs font-black flex items-center space-x-1"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>{t.locateMe}</span>
                </button>
                <button
                  onClick={() => {
                    sounds.playVendorBell();
                    const destLat = mobilityRecs[0]?.latitude || 12.9820;
                    const destLon = mobilityRecs[0]?.longitude || 77.6100;
                    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${vendorLocation[0]},${vendorLocation[1]}&destination=${destLat},${destLon}&travelmode=driving`;
                    window.open(mapsUrl, '_blank');
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-md flex items-center space-x-1 transition active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Google Maps ➔</span>
                </button>
              </div>
            </div>

            <VillageCartMap
              vendors={nearbyCarts}
              userLocation={vendorLocation}
              locationAddress={locationAddress}
              onSelectVendor={() => {}}
              onRefreshGps={detectLiveGPS}
              language={language as any}
            />

            {/* Live AI Fleet Deconfliction Quick Bar */}
            <div className="bg-gradient-to-r from-blue-50/80 via-white to-orange-50/50 p-4 rounded-3xl border border-blue-200/80 space-y-2.5 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-blue-500/20 rounded-xl text-blue-400">
                    <Clock className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="font-black text-xs text-slate-900">AI Fleet & People Management</h4>
                    <span className="text-[10px] text-blue-300">ರಮೇಶ್ vs ಸುರೇಶ್ AI ಮಾರ್ಗ</span>
                  </div>
                </div>
                <button
                  onClick={() => { setNavTab('more'); setMoreSubTab('fleet'); }}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] rounded-xl transition"
                >
                  View Fleet ➔
                </button>
              </div>
              <p className="text-[11px] text-slate-700">
                🔒 <strong>BTM 2nd Stage:</strong> Ramesh completed 4 PM run. Suresh automatically rerouted to <strong>HSR Layout (6:30 PM)</strong> for +₹2,150 profit!
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: QUICK POS FAST BILLING */}
        {navTab === 'pos' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-base text-slate-900">{t.tabPos}</h3>
                <p className="text-[11px] text-slate-500">{t.posFastSaleSubtitle}</p>
              </div>
              <button
                onClick={() => setPosCart({})}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-bold"
              >
                {t.clearBill}
              </button>
            </div>

            {/* Produce Tap Grid with Emojis & Interactive Steppers */}
            <div className="grid grid-cols-2 gap-2.5">
              {products.map((p) => {
                const inCart = posCart[p.id]?.quantity || 0;
                const emoji = (p.name_en.toLowerCase().includes('tomato') ? '🍅' :
                  p.name_en.toLowerCase().includes('onion') ? '🧅' :
                  p.name_en.toLowerCase().includes('potato') ? '🥔' :
                  p.name_en.toLowerCase().includes('chili') || p.name_en.toLowerCase().includes('chilli') ? '🌶️' :
                  p.name_en.toLowerCase().includes('coriander') ? '🌿' :
                  p.name_en.toLowerCase().includes('apple') ? '🍎' : '🥬');
                const marginPercent = Math.round(((p.selling_price - (p.cost_price || p.selling_price * 0.7)) / p.selling_price) * 100);

                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border-2 p-3 text-left transition-all duration-200 flex flex-col justify-between relative shadow-sm ${
                      inCart > 0
                        ? 'bg-orange-50/80 border-orange-500 shadow-md shadow-orange-500/10 ring-1 ring-orange-400'
                        : 'bg-white border-orange-100 hover:border-orange-300 hover:shadow'
                    }`}
                  >
                    <div>
                      {/* Emoji & Margin Badge Row */}
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="w-9 h-9 rounded-xl bg-orange-100/70 flex items-center justify-center text-xl shadow-inner">
                          {emoji}
                        </div>
                        {inCart > 0 ? (
                          <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-soft-pulse">
                            {formatLocalizedNumber(inCart, language)} {p.unit}
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                            +{marginPercent}% Mgn
                          </span>
                        )}
                      </div>

                      {/* Product Name */}
                      <h4 className="font-black text-xs text-slate-900 leading-tight">
                        {getLocalizedProductName(p, language)}
                      </h4>
                      
                    </div>

                    {/* Price and Add/Stepper Row */}
                    <div className="mt-2.5 pt-2 border-t border-orange-100/80 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-black text-orange-600 block leading-none">
                          {formatLocalizedCurrency(p.selling_price, language)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">per {p.unit}</span>
                      </div>

                      {inCart === 0 ? (
                        <button
                          onClick={() => handlePosAddToCart(p)}
                          className="w-7 h-7 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-90 text-white font-black flex items-center justify-center shadow-sm transition"
                          title="Add to bill"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="flex items-center space-x-1 bg-white rounded-lg border border-orange-300 p-0.5 shadow-sm">
                          <button
                            onClick={() => {
                              const next = inCart - 1;
                              if (next <= 0) {
                                const copy = { ...posCart };
                                delete copy[p.id];
                                setPosCart(copy);
                              } else {
                                setPosCart({ ...posCart, [p.id]: { product: p, quantity: next } });
                              }
                            }}
                            className="w-5 h-5 rounded bg-orange-50 hover:bg-orange-100 text-orange-700 flex items-center justify-center font-black active:scale-90"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[11px] font-black px-1 text-slate-900">{inCart}</span>
                          <button
                            onClick={() => handlePosAddToCart(p)}
                            className="w-5 h-5 rounded bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center font-black active:scale-90"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Running Bill Summary Card */}
            {posTotalAmount > 0 && (
              <div className="bg-white p-4 rounded-3xl border-2 border-orange-300 shadow-lg text-slate-900 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-500">{t.itemsInBill}:</span>
                  <span className="text-sm font-black text-slate-900">
                    {formatLocalizedNumber(Object.keys(posCart).length, language)}
                  </span>
                </div>

                {/* 3 Payment Mode Buttons */}
                <div className="flex items-center space-x-2">
                  {(['CASH', 'UPI', 'UDHAAR'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setPosPaymentMode(mode)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black transition active:scale-95 ${
                        posPaymentMode === mode
                          ? 'bg-orange-500 text-white shadow-md ring-2 ring-orange-300'
                          : 'bg-orange-50 text-slate-700 hover:bg-orange-100 border border-orange-200'
                      }`}
                    >
                      {mode === 'CASH' ? t.cash : mode === 'UPI' ? t.upi : t.udhaar}
                    </button>
                  ))}
                </div>

                {posPaymentMode === 'UPI' && (
                  <button
                    type="button"
                    onClick={() => {
                      setQrDisplayAmount(posTotalAmount);
                      setIsQrModalOpen(true);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5 animate-pulse"
                  >
                    <Radio className="w-4 h-4 text-blue-200" />
                    <span>📱 Show Dynamic UPI QR Standee ({formatLocalizedCurrency(posTotalAmount, language)})</span>
                  </button>
                )}

                {posPaymentMode === 'UDHAAR' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder={t.customerNamePlaceholder}
                      value={posCustomerName}
                      onChange={e => setPosCustomerName(e.target.value)}
                      className="w-full p-2.5 bg-white border border-orange-200 shadow-2xl text-slate-900 rounded-xl text-xs text-white outline-none"
                    />
                    <input
                      type="tel"
                      placeholder={t.customerPhonePlaceholder}
                      value={posCustomerPhone}
                      onChange={e => setPosCustomerPhone(e.target.value)}
                      className="w-full p-2.5 bg-white border border-orange-200 shadow-2xl text-slate-900 rounded-xl text-xs text-white outline-none"
                    />
                  </div>
                )}

                <button
                  onClick={handleCompletePosSale}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-xl transition active:scale-98 flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{t.recordPayment} ({formatLocalizedCurrency(posTotalAmount, language)})</span>
                </button>
              </div>
            )}

            {lastBill && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl text-xs text-emerald-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div>
                  <span className="font-black text-emerald-400 block text-sm">
                    ✓ {t.billRecorded}: {formatLocalizedCurrency(lastBill.totalAmount, language, activeCurrency)}
                  </span>
                  <span className="text-[11px] text-emerald-300/80">
                    {formatLocalizedNumber(lastBill.itemsCount, language)} Items • {lastBill.mode} • Net Profit: +{formatLocalizedCurrency(lastBill.netProfit, language, activeCurrency)}
                  </span>
                </div>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`🧾 *${t.vendorTitle}*\n\nDate: ${new Date().toLocaleDateString()} ${lastBill.time}\nTotal: ${currencyConfig.symbol}${lastBill.totalAmount}\nPayment Mode: ${lastBill.mode}\nStatus: PAID\n\nThank you! Generated by VendorSaathi.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow transition flex items-center space-x-1.5 flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t.sendWhatsappReminder}</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PRODUCTS & INVENTORY MANAGEMENT */}
        {navTab === 'products' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-base text-slate-900">{t.tabStock}</h3>
                <p className="text-[11px] text-slate-500">{t.stockAction}</p>
              </div>
              <button
                onClick={() => setIsAddProductOpen(true)}
                className="py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-md flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addItem}</span>
              </button>
            </div>

            <div className="space-y-3">
              {products.map((p) => {
                const isLow = p.current_stock <= p.low_stock_threshold;
                return (
                  <div key={p.id} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm text-slate-900 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-sm text-slate-900">{getLocalizedProductName(p, language)}</h4>
                        <span className="text-xs text-slate-500">
                          {formatLocalizedCurrency(p.selling_price, language)}/{p.unit}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isLow ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {isLow ? t.lowStock : t.inStock}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-orange-100 text-xs">
                      <span className="text-slate-500 font-bold">
                        {t.currentStock}: <strong>{formatLocalizedNumber(p.current_stock, language)} {p.unit}</strong>
                      </span>

                      <div className="flex items-center space-x-1 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-200 text-slate-800">
                        <button onClick={() => handleUpdateStock(p.id, -1)} className="p-1 hover:bg-orange-50 rounded text-slate-700">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black px-1.5 text-white">
                          {formatLocalizedNumber(p.current_stock, language)}
                        </span>
                        <button onClick={() => handleUpdateStock(p.id, 1)} className="p-1 hover:bg-orange-50 rounded text-slate-700">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleUpdateStock(p.id, 5)} className="ml-1.5 px-2 py-0.5 bg-orange-600 text-white rounded text-[10px] font-black">
                          +{formatLocalizedNumber(5, language)}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: CUSTOMER ORDERS 6-STAGE LIFECYCLE (SWIGGY/ZOMATO PARTNER STYLE) */}
        {navTab === 'orders' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-base text-slate-900">{t.tabOrders}</h3>
                <p className="text-[11px] text-slate-500">Swiggy & Zomato Style Partner Live Order Hub</p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={triggerSimulateIncomingOrder} 
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-xl shadow-md flex items-center space-x-1 animate-pulse"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Simulate Order</span>
                </button>
                <button onClick={loadAllData} className="p-1.5 bg-orange-50 rounded-xl text-slate-500">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {orders.map((ord) => (
                <div key={ord.id} className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm text-slate-900 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-black bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-md border border-orange-500/30">
                          {ord.order_number}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold">Doorstep Delivery</span>
                      </div>
                      <h4 className="font-black text-sm text-slate-900 mt-1">
                        {ord.customer_name || 'ಅನಿತಾ ಶರ್ಮಾ'}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-orange-400" />
                        <span>{ord.delivery_address || '4th Cross, Green Villa Apt (350m)'}</span>
                      </p>
                    </div>
                    <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full">
                      {ord.status}
                    </span>
                  </div>

                  {/* Swiggy/Zomato 4-Stage Stepper */}
                  <div className="grid grid-cols-4 gap-1 text-center text-[9px] font-black pt-1">
                    <div className={`p-1.5 rounded-lg border ${ord.status === 'PENDING' || ord.status === 'ACCEPTED' || ord.status === 'PREPARING' || ord.status === 'OUT_FOR_DELIVERY' || ord.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-orange-50/80 text-slate-400 border-orange-200'}`}>
                      1. Accepted
                    </div>
                    <div className={`p-1.5 rounded-lg border ${ord.status === 'PREPARING' || ord.status === 'OUT_FOR_DELIVERY' || ord.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-orange-50/80 text-slate-400 border-orange-200'}`}>
                      2. Weighed
                    </div>
                    <div className={`p-1.5 rounded-lg border ${ord.status === 'OUT_FOR_DELIVERY' || ord.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-orange-50/80 text-slate-400 border-orange-200'}`}>
                      3. Delivering
                    </div>
                    <div className={`p-1.5 rounded-lg border ${ord.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-orange-50/80 text-slate-400 border-orange-200'}`}>
                      4. Paid
                    </div>
                  </div>

                  {/* Order Items Basket */}
                  <div className="p-3 bg-orange-50/60 rounded-2xl text-xs space-y-1.5 border border-orange-100">
                    {ord.items?.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-slate-700">
                        <span>{item.product_name_snapshot} × {formatLocalizedNumber(item.quantity, language)} {item.unit}</span>
                        <span className="font-bold text-white">{formatLocalizedCurrency(item.subtotal, language)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-orange-100 flex justify-between font-black text-sm text-amber-400">
                      <span>Total Amount:</span>
                      <span>{formatLocalizedCurrency(ord.total_amount, language)}</span>
                    </div>
                  </div>

                  {/* Swiggy/Zomato Action Bar: Call Customer, Google Maps Nav, Next Lifecycle Action */}
                  <div className="flex items-center space-x-2 pt-1">
                    <a
                      href={`tel:${ord.customer_phone || '9845012345'}`}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-black text-emerald-800 flex items-center space-x-1 transition shadow-sm"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>

                    <button
                      onClick={() => {
                        sounds.playVendorBell();
                        const url = `https://www.google.com/maps/dir/?api=1&origin=${vendorLocation[0]},${vendorLocation[1]}&destination=12.9820,77.6100&travelmode=driving`;
                        window.open(url, '_blank');
                      }}
                      className="px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-xl text-xs font-black text-blue-800 flex items-center space-x-1 transition shadow-sm"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Maps</span>
                    </button>

                    <div className="flex-1">
                      {ord.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'ACCEPTED')}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md"
                        >
                          {t.acceptOrder}
                        </button>
                      )}
                      {ord.status === 'ACCEPTED' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'PREPARING')}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md"
                        >
                          {t.preparingOrder}
                        </button>
                      )}
                      {ord.status === 'PREPARING' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'OUT_FOR_DELIVERY')}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md"
                        >
                          {t.outForDelivery}
                        </button>
                      )}
                      {ord.status === 'OUT_FOR_DELIVERY' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'COMPLETED')}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md"
                        >
                          {t.deliveredOrder}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: PAYMENTS & UDHAAR KHATA */}
        {navTab === 'payments' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-base text-slate-900">{t.tabUdhaar}</h3>
                <p className="text-[11px] text-slate-500">Digital UPI Soundbox, PM SVANidhi & Khata Ledger</p>
              </div>
              <span className="text-xs font-black text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                Total: {formatLocalizedCurrency(dashboard.total_udhaar_outstanding, language)}
              </span>
            </div>

            {/* Micro-Vendor Smart Soundbox & UPI QR Standee Card */}
            <div className="bg-gradient-to-r from-blue-950/60 via-slate-950 to-indigo-950/60 p-4 rounded-3xl border border-blue-500/40 space-y-3 shadow-xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="p-2 rounded-2xl bg-blue-500/20 text-blue-400">
                    <Radio className="w-5 h-5 text-blue-400 animate-pulse" />
                  </span>
                  <div>
                    <h4 className="font-black text-xs text-slate-900">Cart Smart Soundbox & UPI QR Standee</h4>
                    <span className="text-[10px] text-slate-500 font-mono">ramesh.veg@okhdfcbank</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setQrDisplayAmount(100);
                    setIsQrModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center space-x-1"
                >
                  <span>Show QR Standee</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] bg-orange-50/50 p-2 rounded-xl border border-orange-100 text-slate-700">
                <div className="flex items-center space-x-2">
                  <span className="bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">GPay</span>
                  <span className="bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.5 rounded">PhonePe</span>
                  <span className="bg-sky-500/20 text-sky-300 font-bold px-1.5 py-0.5 rounded">Paytm</span>
                  <span className="bg-orange-500/20 text-orange-300 font-bold px-1.5 py-0.5 rounded">BHIM UPI</span>
                </div>
                <button
                  onClick={() => sounds.playPaymentSoundbox(100, language, '₹')}
                  className="text-amber-400 font-black hover:text-amber-300 flex items-center space-x-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Test Soundbox</span>
                </button>
              </div>
            </div>

            {/* PM SVANidhi Street Vendor Micro-Credit & Credit Health Card */}
            <div className="bg-gradient-to-r from-emerald-950/60 via-slate-950 to-teal-950/60 p-4 rounded-3xl border border-emerald-500/40 space-y-2.5 shadow-xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </span>
                  <div>
                    <h4 className="font-black text-xs text-slate-900">PM SVANidhi Micro-Credit Score</h4>
                    <span className="text-[10px] text-emerald-300">MoHUA Street Vendor Scheme • UPI Digital Footprint</span>
                  </div>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-black px-2.5 py-1 rounded-xl border border-emerald-500/30">
                  785 / 900 (Eligible)
                </span>
              </div>
              <div className="text-[11px] text-slate-700 pt-1 border-t border-orange-100 flex justify-between">
                <span>Eligible for: <strong className="text-white">₹20,000 2nd Tranche Loan</strong> (7% Interest Subsidy + ₹1,200 UPI Cashback)</span>
                <span className="text-emerald-400 font-black">Pre-Approved</span>
              </div>
            </div>

            <div className="space-y-3">
              {udhaarRecords.map((u) => (
                <div key={u.id} className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm text-slate-900 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-sm text-slate-900">{u.customer_name}</h4>
                      <span className="text-xs text-slate-500">📞 {u.customer_phone}</span>
                    </div>
                    <span className="text-[10px] font-black bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">
                      {u.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-orange-50/60 rounded-xl text-xs">
                    <span className="text-slate-500">{t.udhaarDue}:</span>
                    <span className="text-base font-black text-rose-400">{formatLocalizedCurrency(u.remaining_balance, language, activeCurrency)}</span>
                  </div>

                  <a
                    href={`https://wa.me/${u.customer_phone.length === 10 ? '91' + u.customer_phone : u.customer_phone.replace('+', '')}?text=${encodeURIComponent(`${u.customer_name}, ${t.vendorTitle}: ${t.udhaarDue} ${currencyConfig.symbol}${u.remaining_balance}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-black rounded-xl text-xs transition flex items-center justify-center space-x-1.5 border border-emerald-500/30"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t.sendWhatsappReminder}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: EXPANDED MORE HUB (8 ADVANCED MODULES) */}
        {navTab === 'more' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Scrollable Sub-nav Hub Bar */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 bg-orange-50/80 p-1.5 rounded-2xl border border-orange-200/90 text-xs font-black scrollbar-none">
              {[
                { id: 'fleet', label: '👥 Fleet & People AI' },
                { id: 'mobility', label: '📍 Route AI' },
                { id: 'ai', label: '🧠 AI Demand' },
                { id: 'analytics', label: '📈 Analytics' },
                { id: 'weather', label: '🌦️ Weather' },
                { id: 'profile', label: '🏪 Profile' },
                { id: 'sync', label: '📒 Cloud Sync' },
                { id: 'academic', label: '🎓 Tech Specs' },
                { id: 'settings', label: '⚙️ Settings' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setMoreSubTab(s.id as any)}
                  className={`px-3 py-2 rounded-xl whitespace-nowrap transition ${
                    moreSubTab === s.id
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* 0. AI SPATIAL-TEMPORAL FLEET & PEOPLE MANAGEMENT SUB-TAB (RAMESH VS SURESH DECONFLICTION) */}
            {moreSubTab === 'fleet' && (
              <div className="space-y-4 animate-in fade-in">
                {/* Header & Mission */}
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-500">👥 People & Fleet Dispatch AI</h4>
                    <p className="text-[11px] text-slate-700">Spatial-Temporal Saturation Deconfliction Engine</p>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full font-black flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Active Coordinated Fleet</span>
                  </span>
                </div>

                {/* THE RAMESH VS SURESH TIME-GAP COLLISION CASE STUDY CARD */}
                <div className="bg-gradient-to-r from-blue-950/70 via-slate-950 to-indigo-950/70 p-5 rounded-3xl border border-blue-500/40 space-y-3.5 shadow-2xl">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 bg-blue-500/20 rounded-2xl text-blue-400">
                      <Clock className="w-5 h-5 animate-spin" />
                    </span>
                    <div>
                      <h3 className="font-black text-sm text-white">Time-Gap Saturation Problem & AI Solution</h3>
                      <p className="text-[10px] text-blue-300">Ramesh (4:00 PM) vs Suresh (6:30 PM) Collision Resolved</p>
                    </div>
                  </div>

                  {/* Problem & AI Solution Comparative Matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {/* Without AI */}
                    <div className="p-3.5 bg-rose-950/30 border border-rose-500/30 rounded-2xl space-y-1.5">
                      <div className="flex items-center space-x-1 text-rose-400 font-black text-xs">
                        <span>❌ WITHOUT AI DISPATCH</span>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-tight">
                        Ramesh sells out BTM at 4 PM (₹1,850). Suresh arrives at 6:30 PM to the same spot.
                      </p>
                      <div className="text-[11px] font-black text-rose-300 pt-1 border-t border-rose-900/50">
                        Suresh earns: <strong className="text-rose-400">₹150</strong> (loses ₹900 to spoilage).
                      </div>
                    </div>

                    {/* With AI */}
                    <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-1.5">
                      <div className="flex items-center space-x-1 text-emerald-400 font-black text-xs">
                        <span>✅ WITH VENDORSATHI AI FLEET</span>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-tight">
                        System detects BTM saturation and reroutes Suresh to <strong>HSR Layout (6:30 PM)</strong>.
                      </p>
                      <div className="text-[11px] font-black text-emerald-300 pt-1 border-t border-emerald-900/50">
                        Suresh earns: <strong className="text-emerald-400">₹2,150</strong> (+45% higher profit, 0kg waste)!
                      </div>
                    </div>
                  </div>

                  {/* Mutual Community Profit Metrics */}
                  <div className="p-3 bg-orange-50/40 rounded-2xl flex items-center justify-between text-xs border border-orange-100">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold block">Combined Fleet Profit</span>
                      <span className="font-black text-amber-400 text-sm">₹4,000 Total (+100% Gain)</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold block">Spoilage Saved</span>
                      <span className="font-black text-emerald-400 text-sm">45 kg Fresh Produce</span>
                    </div>
                    <button
                      onClick={() => {
                        sounds.playSuccessChime();
                        alert("✅ AI Fleet Coordination Active: All peer schedules synchronized to prevent market exhaustion!");
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow transition active:scale-95"
                    >
                      Sync Fleet
                    </button>
                  </div>
                </div>

                {/* LIVE PEER VENDOR DISPATCH TIMELINE SCHEDULE */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      📋 Live Coordinated Peer Schedule
                    </span>
                    <button
                      onClick={() => {
                        sounds.playVendorBell();
                        loadAllData();
                      }}
                      className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh Slots</span>
                    </button>
                  </div>

                  {fleetDispatchData.peer_slots?.map((slot: any) => (
                    <div
                      key={slot.id}
                      className={`bg-white p-4 rounded-3xl border shadow-sm space-y-3 ${
                        slot.id === 'slot-01'
                          ? 'border-emerald-500/50'
                          : slot.id === 'slot-02'
                          ? 'border-amber-500/50'
                          : 'border-orange-100'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-sm text-slate-900">
                              {language === 'en' ? slot.vendor_name : (slot.vendor_name_kn || slot.vendor_name)}
                            </span>
                            <span className="text-[10px] text-orange-800 font-bold bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                              🕒 {slot.time_window}
                            </span>
                          </div>
                          <span className="text-xs text-slate-700 block mt-0.5">
                            📍 {language === 'en' ? slot.target_location : (slot.target_location_kn || slot.target_location)}
                          </span>
                        </div>

                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl ${
                          slot.status === 'COMPLETED_SOLD_OUT'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : slot.status === 'AI_REROUTED'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {slot.status_label}
                        </span>
                      </div>

                      {/* Conflict & Rerouting Box for Suresh */}
                      {slot.conflict_warning && (
                        <div className="p-3 bg-orange-50/60 rounded-2xl text-xs space-y-2 border border-amber-500/30">
                          <p className="text-amber-300 font-medium">
                            {language === 'en' ? slot.conflict_warning : (slot.conflict_warning_kn || slot.conflict_warning)}
                          </p>

                          <div className="bg-orange-50/80 p-2.5 rounded-xl space-y-1.5 border border-amber-200">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-black text-emerald-400">
                                🚀 Reroute: {language === 'en' ? slot.optimized_route_recommendation.strategy_1_reroute.destination : slot.optimized_route_recommendation.strategy_1_reroute.destination_kn}
                              </span>
                              <span className="font-black text-amber-400">
                                Est. ₹{slot.optimized_route_recommendation.strategy_1_reroute.expected_revenue_inr}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              {slot.optimized_route_recommendation.strategy_1_reroute.reason}
                            </p>
                            <a
                              href="https://www.google.com/maps/dir/?api=1&origin=12.9716,77.5946&destination=12.9121,77.6446&travelmode=driving"
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 text-[10px] text-blue-400 font-bold hover:underline pt-0.5"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>Open Suresh's Reroute in Google Maps ➔</span>
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Saturation Progress Meter */}
                      <div className="space-y-1 text-xs pt-1 border-t border-orange-100">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">Market Buying Capacity Depleted:</span>
                          <span className="font-black text-white">{slot.demand_depleted_percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-orange-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              slot.demand_depleted_percent > 80 ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${slot.demand_depleted_percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1. GPS Mobility & Product Cannibalization Sub-Tab */}
            {moreSubTab === 'mobility' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-slate-500">{t.routePrediction}</h4>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    Anti-Cannibalization Active
                  </span>
                </div>

                {mobilityRecs.map((spot, i) => (
                  <div key={i} className={`bg-white p-4 rounded-3xl border shadow-sm space-y-3 ${
                    spot.active_competitors_count > 0 ? 'border-amber-500/40' : 'border-emerald-500/40'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            spot.active_competitors_count > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            Score: {formatLocalizedNumber(spot.score, language)}/100 • {spot.demand_level}
                          </span>
                          {spot.active_competitors_count > 0 && (
                            <span className="text-[10px] font-black bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">
                              ⚠️ {formatLocalizedNumber(spot.active_competitors_count, language)} Same Category Sellers
                            </span>
                          )}
                        </div>
                        <h4 className="font-black text-sm text-white mt-1.5">{language === 'en' ? spot.location_name : (spot.location_name_kn || spot.location_name)}</h4>
                        <span className="text-xs text-slate-500">
                          {spot.location_name} • {formatLocalizedNumber(spot.distance_km, language)} km away • Est. Sales: {formatLocalizedCurrency(spot.estimated_turnover_inr, language)}
                        </span>
                      </div>
                    </div>

                    {/* High-demand produce to carry */}
                    <div className="p-2.5 bg-orange-50/60 rounded-xl space-y-1.5 text-xs">
                      <div className="text-emerald-400 font-bold flex items-center space-x-1">
                        <span>🥬 {t.highDemandItems}:</span>
                        <strong className="text-white">{spot.high_demand_products?.join(', ')}</strong>
                      </div>
                      {spot.saturated_products?.length > 0 && (
                        <div className="text-rose-400 font-bold flex items-center space-x-1 pt-1 border-t border-orange-100">
                          <span>❌ {t.avoidSelling}:</span>
                          <strong className="text-rose-300">{spot.saturated_products.join(', ')}</strong>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      💡 {language === 'en' ? spot.recommendation_reason : (spot.recommendation_reason_kn || spot.recommendation_reason)}
                    </p>

                    {/* Direct Google Maps Navigation Deep Link */}
                    <button
                      onClick={() => {
                        sounds.playVendorBell();
                        const mapsUrl = spot.google_maps_url || `https://www.google.com/maps/dir/?api=1&origin=${vendorLocation[0]},${vendorLocation[1]}&destination=${spot.latitude},${spot.longitude}&travelmode=driving`;
                        window.open(mapsUrl, '_blank');
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/50 hover:to-indigo-600/50 border border-blue-500/40 text-blue-300 hover:text-white font-black text-xs rounded-xl shadow transition active:scale-95 flex items-center justify-center space-x-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>🚀 Start Google Maps Turn-by-Turn Route ➔</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 2. AI Demand & Mandi Price Benchmark Sub-Tab */}
            {moreSubTab === 'ai' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-slate-500">{t.aiForecastAction}</h4>
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    APMC Mandi Benchmarks
                  </span>
                </div>

                {/* MANDI WHOLESALE PRICE BENCHMARK & FAIR MARGIN TABLE */}
                <div className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm text-slate-900 space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </span>
                    <div>
                      <h4 className="font-black text-xs text-slate-900">Daily Mandi Wholesale Price Index</h4>
                      <p className="text-[10px] text-slate-500">Prevents middleman exploitation with fair street margins</p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-800/80 text-xs">
                    <div className="py-2 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900 block">ನಾಟಿ ಟೊಮೇಟೊ</span>
                        <span className="text-[10px] text-slate-500">Mandi wholesale: {formatCurrency(18, activeCurrency)}/kg</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-400 block">Fair: {formatCurrency(28, activeCurrency)} - {formatCurrency(32, activeCurrency)}</span>
                        <span className="text-[10px] text-amber-400 font-bold">~38% Margin • High Spoilage</span>
                      </div>
                    </div>

                    <div className="py-2 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900 block">ಈರುಳ್ಳಿ</span>
                        <span className="text-[10px] text-slate-500">Mandi wholesale: {formatCurrency(24, activeCurrency)}/kg</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-400 block">Fair: {formatCurrency(35, activeCurrency)} - {formatCurrency(40, activeCurrency)}</span>
                        <span className="text-[10px] text-emerald-400 font-bold">~34% Margin • 14-day Life</span>
                      </div>
                    </div>

                    <div className="py-2 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900 block">ಆಲೂಗಡ್ಡೆ</span>
                        <span className="text-[10px] text-slate-500">Mandi wholesale: {formatCurrency(22, activeCurrency)}/kg</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-400 block">Fair: {formatCurrency(32, activeCurrency)} - {formatCurrency(36, activeCurrency)}</span>
                        <span className="text-[10px] text-emerald-400 font-bold">~36% Margin • Low Spoilage</span>
                      </div>
                    </div>

                    <div className="py-2 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900 block">ಹಸಿ ಮೆಣಸಿನಕಾಯಿ</span>
                        <span className="text-[10px] text-slate-500">Mandi wholesale: {formatCurrency(40, activeCurrency)}/kg</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-400 block">Fair: {formatCurrency(60, activeCurrency)} - {formatCurrency(70, activeCurrency)}</span>
                        <span className="text-[10px] text-rose-400 font-bold">~42% Margin • Fast Spoilage</span>
                      </div>
                    </div>
                  </div>
                </div>

                {demandForecasts.map((df, i) => (
                  <div key={i} className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm text-slate-900 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-sm text-slate-900">{language === 'en' ? df.product_name_en : (df.product_name_kn || df.product_name_en)}</h4>
                        <span className="text-xs text-slate-500">{df.product_name_en}</span>
                      </div>
                      <span className="text-[10px] font-black bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                        AI Recommended
                      </span>
                    </div>

                    <div className="p-3 bg-orange-50/60 rounded-xl text-xs space-y-1 text-purple-200">
                      <div>{t.currentStock}: <strong>{formatLocalizedNumber(df.current_stock, language)} {df.unit}</strong></div>
                      <div>Expected Tomorrow Demand: <strong>{formatLocalizedNumber(df.daily_forecasts?.[0]?.predicted_demand || 20, language)} {df.unit}</strong></div>
                      <div className="text-amber-400 font-black pt-1 border-t border-orange-100">
                        💡 {t.mandiPurchaseAdvice}: <strong>{formatLocalizedNumber(df.daily_forecasts?.[0]?.recommended_morning_stock || 15, language)} {df.unit}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Analytics Sub-Tab */}
            {moreSubTab === 'analytics' && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-500">Business Sales & Profit Breakdown</h4>
                <div className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm text-slate-900 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gross Sales Revenue:</span>
                    <span className="font-black text-amber-400 text-sm">{formatLocalizedCurrency(dashboard.today_sales_revenue, language, activeCurrency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cost of Goods Sold (COGS):</span>
                    <span className="font-black text-slate-700 text-sm">{formatLocalizedCurrency(dashboard.today_sales_revenue - dashboard.today_net_profit, language, activeCurrency)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-orange-100 text-emerald-400 font-black text-sm">
                    <span>{t.netProfit}:</span>
                    <span>{formatLocalizedCurrency(dashboard.today_net_profit, language, activeCurrency)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Rural Weather & Street Feasibility Sub-Tab */}
            {moreSubTab === 'weather' && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-500">🌦️ {t.weatherAdvisory}</h4>
                <div className="bg-white p-5 rounded-3xl border border-orange-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                        <CloudSun className="w-8 h-8 animate-pulse text-amber-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-900">
                          {weatherData?.temperature_celsius || 29}°C
                        </div>
                        <span className="text-xs text-slate-500">
                          {language === 'kn' ? (weatherData?.weather_condition_kn || 'ಸ್ವಚ್ಛ ಬಿಸಿಲು') : (weatherData?.weather_condition || 'Clear Sky')}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {t.weatherSafe}
                    </span>
                  </div>

                  <div className="p-3 bg-orange-50/60 rounded-2xl text-xs space-y-2 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t.rainRisk}:</span>
                      <span className="font-bold text-blue-400">{formatLocalizedNumber('10', language)}% (Low Risk)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t.windSpeed}:</span>
                      <span className="font-bold text-slate-800">{formatLocalizedNumber('12', language)} km/h</span>
                    </div>
                    <div className="pt-2 border-t border-orange-100 text-amber-300 font-medium leading-relaxed">
                      💡 <strong>{t.weatherAdvisory}:</strong> {language === 'kn' ? (weatherData?.advisory_kn || 'ವ್ಯಾಪಾರಕ್ಕೆ ಸೂಕ್ತವಾದ ಹವಾಮಾನ.') : (weatherData?.advisory || 'Excellent weather for roadside vending.')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Vendor Profile Sub-Tab */}
            {moreSubTab === 'profile' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-slate-500">🏪 {t.vendorProfile}</h4>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center space-x-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.logout}</span>
                  </button>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-orange-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-lg">
                      {currentLangConfig.flag}
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-900">{t.vendorTitle}</h3>
                      <span className="text-xs text-slate-500">Owner: Ramesh Kumar • 📞 +91 {vendorUser?.phone || '9876543210'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-orange-50/60 rounded-2xl">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Category:</span>
                      <span className="font-black text-slate-900">{vendorUser?.category || 'Vegetables'}</span>
                    </div>
                    <div className="p-3 bg-orange-50/60 rounded-2xl">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Vehicle:</span>
                      <span className="font-black text-slate-900">{vendorUser?.vehicle_type || 'Push Cart'}</span>
                    </div>
                    <div className="p-3 bg-orange-50/60 rounded-2xl">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">UPI QR ID:</span>
                      <span className="font-black text-emerald-400">{vendorUser?.upi_id || 'ramesh.veg@okhdfcbank'}</span>
                    </div>
                    <div className="p-3 bg-orange-50/60 rounded-2xl">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">APMC License:</span>
                      <span className="font-black text-amber-400">{vendorUser?.apmc_license || 'KA-MND-2026-8891'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Offline Sync & Cloud Backup Sub-Tab */}
            {moreSubTab === 'sync' && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-500">📒 {t.offlineActive}</h4>
                <div className="bg-white p-5 rounded-3xl border border-orange-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-black text-xs text-slate-900">{t.offlineActive}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Last Sync: {lastSyncTime}</span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {t.offlineDesc}
                  </p>

                  <button
                    onClick={() => {
                      sounds.playSuccessChime();
                      loadAllData();
                    }}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-2xl transition shadow-lg flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>{t.forceSync}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 7. Academic Architecture Blueprint Sub-Tab */}
            {moreSubTab === 'academic' && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-500">🎓 Academic & Viva Project Architecture Specs</h4>
                <div className="bg-white p-5 rounded-3xl border border-orange-200 shadow-sm space-y-3 text-xs">
                  <div className="p-3 bg-orange-50/60 rounded-2xl space-y-1">
                    <strong className="text-amber-400 block">1. ACID Transaction Integrity:</strong>
                    <p className="text-slate-700">Sales and stock mutations execute with strict database lock isolation preventing negative inventory.</p>
                  </div>
                  <div className="p-3 bg-orange-50/60 rounded-2xl space-y-1">
                    <strong className="text-purple-400 block">2. Random Forest Regressor Demand AI:</strong>
                    <p className="text-slate-700">Trained on 7-day rolling Mandi wholesale arrivals, holiday spikes, and precipitation penalties.</p>
                  </div>
                  <div className="p-3 bg-orange-50/60 rounded-2xl space-y-1">
                    <strong className="text-blue-400 block">3. Spatial Anti-Clustering Optimization:</strong>
                    <p className="text-slate-700">Calculates Haversine spatial density to prevent duplicate vendor clustering and maximize gross margins.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 8. Settings & Audio Preferences Sub-Tab */}
            {moreSubTab === 'settings' && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-500">⚙️ Settings & Audio Preferences</h4>
                <div className="bg-white p-5 rounded-3xl border border-orange-200 shadow-sm space-y-4 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900 block">Street Audio Feedback:</span>
                      <span className="text-[11px] text-slate-500">Cash register, cart bells, and chimes</span>
                    </div>
                    <button
                      onClick={() => {
                        setSoundEnabled(!soundEnabled);
                        if (!soundEnabled) sounds.playVendorBell();
                      }}
                      className={`px-3 py-1.5 rounded-xl font-black transition ${
                        soundEnabled ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm' : 'bg-orange-50 text-slate-600 border border-orange-200'
                      }`}
                    >
                      {soundEnabled ? 'Active (ON)' : 'Muted (OFF)'}
                    </button>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-orange-100">
                    <div>
                      <span className="font-bold text-slate-900 block">Indic Numerals:</span>
                      <span className="text-[11px] text-slate-500">Display numbers in {currentLangConfig.name}</span>
                    </div>
                    <button
                      onClick={() => setIndicNumeralsEnabled(!indicNumeralsEnabled)}
                      className={`px-3 py-1.5 rounded-xl font-black transition ${
                        indicNumeralsEnabled ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-orange-50 text-slate-500'
                      }`}
                    >
                      {indicNumeralsEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <div className="pt-3 border-t border-orange-100 space-y-2">
                    <button
                      onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                          vendor: vendorUser,
                          products,
                          orders,
                          udhaarRecords,
                          dashboard,
                          exportedAt: new Date().toISOString()
                        }, null, 2));
                        const dlAnchor = document.createElement('a');
                        dlAnchor.setAttribute("href", dataStr);
                        dlAnchor.setAttribute("download", `vendorsathi_backup_${Date.now()}.json`);
                        dlAnchor.click();
                        sounds.playSuccessChime();
                      }}
                      className="w-full py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-950 border border-orange-200 rounded-xl font-black text-xs transition flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <span>💾 Export Data Backup (JSON)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* 3. PROMINENT BOTTOM NAVIGATION BAR WITH RAISED VOICE MIC BUTTON */}
      <div className="flex-shrink-0 bg-white/95 backdrop-blur-xl border-t border-orange-200 px-2 py-1.5 flex items-center justify-around z-30 shadow-lg select-none">
        
        {/* Tab 1: Home */}
        <button
          onClick={() => setNavTab('home')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl transition active:scale-90 ${
            navTab === 'home' 
              ? 'bg-orange-100/90 text-orange-600 font-black shadow-sm' 
              : 'text-slate-500 hover:text-orange-600'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">{t.tabHome}</span>
        </button>

        {/* Tab 2: POS Quick Bill */}
        <button
          onClick={() => setNavTab('pos')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl transition active:scale-90 ${
            navTab === 'pos' 
              ? 'bg-orange-100/90 text-orange-600 font-black shadow-sm' 
              : 'text-slate-500 hover:text-orange-600'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">{t.tabPos}</span>
        </button>

        {/* Center Raised Voice Mic Button */}
        <div className="flex flex-col items-center -mt-5">
          <button
            onClick={() => setIsVoiceOpen(true)}
            aria-label={t.voiceModalTitle}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/40 hover:scale-105 active:scale-90 transition-all flex items-center justify-center ring-4 ring-white"
            title="Voice Assistant"
          >
            <Mic className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
          </button>
          <span className="text-[9px] font-extrabold text-orange-600 mt-0.5">{t.tabVoice || 'Voice'}</span>
        </div>

        {/* Tab 3: Stock */}
        <button
          onClick={() => setNavTab('products')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl transition active:scale-90 ${
            navTab === 'products' 
              ? 'bg-orange-100/90 text-orange-600 font-black shadow-sm' 
              : 'text-slate-500 hover:text-orange-600'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">{t.tabStock || t.stockManagement || 'Stock'}</span>
        </button>

        {/* Tab 4: More / Analytics */}
        <button
          onClick={() => setNavTab('more')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl transition active:scale-90 ${
            navTab === 'more' 
              ? 'bg-orange-100/90 text-orange-600 font-black shadow-sm' 
              : 'text-slate-500 hover:text-orange-600'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">{t.tabMore}</span>
        </button>

      </div>

      {/* 4. DEDICATED HYPER-INTERACTIVE MULTILINGUAL VOICE & CONVERSATIONAL AI COMPANION */}
      {isVoiceOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-orange-200 shadow-2xl text-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-5 space-y-3.5 flex flex-col h-[85vh] max-h-[700px] animate-in zoom-in-95">
            
            {/* Header with Language & Live Voice Status */}
            <div className="flex items-center justify-between pb-2 border-b border-orange-100 flex-shrink-0">
              <div className="flex items-center space-x-2 text-xs font-black text-orange-400">
                <span className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400">
                  <Mic className="w-4 h-4" />
                </span>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span>{currentLangConfig.flag} {t.voiceModalTitle}</span>
                    
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>{isSpeaking ? '🔊 AI Speaking...' : isListening ? '🎙️ Listening to Voice...' : '🟢 Interactive Voice & Text Active'}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    setVoiceMessages([
                      {
                        id: `init-${Date.now()}`,
                        role: 'assistant',
                        textNative: 'ನಮಸ್ಕಾರ! ಇತಿಹಾಸವನ್ನು ತೆರವುಗೊಳಿಸಲಾಗಿದೆ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
                        textEn: 'Hello! Chat history cleared. How can I help your street business?',
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }
                    ]);
                    sounds.playVendorBell();
                  }}
                  className="px-2 py-1 bg-orange-100 hover:bg-orange-200 text-[10px] text-slate-500 hover:text-white rounded-lg transition font-bold"
                  title="Clear Chat"
                >
                  Clear
                </button>
                <button onClick={() => setIsVoiceOpen(false)} className="p-1.5 rounded-full text-slate-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* LIVE ANIMATED GEMINI/SIRI-STYLE EQUALIZER WAVEFORM */}
            {(isListening || isSpeaking) && (
              <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/15 to-orange-500/10 p-3 rounded-2xl border border-orange-300 flex items-center justify-between flex-shrink-0 animate-in fade-in shadow-inner">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 h-7 px-2 bg-white rounded-xl border border-orange-200 shadow-sm">
                    <span className="w-1 bg-orange-500 rounded-full animate-audio-wave-1" />
                    <span className="w-1 bg-amber-500 rounded-full animate-audio-wave-2" />
                    <span className="w-1 bg-rose-500 rounded-full animate-audio-wave-3" />
                    <span className="w-1 bg-emerald-500 rounded-full animate-audio-wave-4" />
                    <span className="w-1 bg-blue-500 rounded-full animate-audio-wave-5" />
                    <span className="w-1 bg-purple-500 rounded-full animate-audio-wave-2" />
                    <span className="w-1 bg-orange-500 rounded-full animate-audio-wave-1" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-orange-950 block leading-tight">
                      {isListening ? `${currentLangConfig.name}: ${t.micPrompt}...` : 'AI Saathi Audio Synthesizing...'}
                    </span>
                    <span className="text-[10px] text-orange-600 font-semibold">
                      {isListening ? 'Speak in any Indic language naturally' : 'Voice synthesized in detected dialect'}
                    </span>
                  </div>
                </div>
                {isSpeaking && (
                  <button
                    onClick={() => {
                      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                      setIsSpeaking(false);
                    }}
                    className="text-[10px] bg-rose-500 hover:bg-rose-600 text-white px-2.5 py-1 rounded-xl font-black shadow-sm transition active:scale-95"
                  >
                    Stop Audio
                  </button>
                )}
              </div>
            )}

            {/* SCROLLABLE INTERACTIVE CHAT STREAM */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-left scrollbar-thin">
              {voiceMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in`}
                >
                  <div className="flex items-center space-x-1.5 mb-1 px-1">
                    <span className="text-[10px] font-black text-slate-500">
                      {msg.role === 'user' ? '🧑‍🌾 You (Vendor)' : '🤖 AI Saathi Assistant'}
                    </span>
                    {msg.detectedLang && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        {ALL_REGIONAL_LANGUAGES.find(l => l.code === msg.detectedLang)?.name || msg.detectedLang}
                      </span>
                    )}
                    <span className="text-[9px] text-slate-500">{msg.time}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl max-w-[85%] text-xs space-y-2 shadow-lg ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-tr-none font-bold'
                        : 'bg-white border border-orange-200 text-slate-900 rounded-tl-none font-medium shadow-sm'
                    }`}
                  >
                    <div className="text-sm font-black leading-snug">{msg.textNative}</div>


                    {/* Interactive Action Shortcuts & Voice Replay for Assistant Messages */}
                    {msg.role === 'assistant' && (
                      <div className="pt-1.5 flex flex-wrap items-center gap-1.5 border-t border-orange-100">
                        <button
                          onClick={() => playNativeVoiceAudio(
                            msg.audioB64 || null,
                            (msg.detectedLang || language) === 'en' ? (msg.textEn || msg.textNative) : msg.textNative,
                            msg.detectedLang || language
                          )}
                          className="px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-[10px] font-black rounded-lg flex items-center space-x-1 transition"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Replay Audio ({ALL_REGIONAL_LANGUAGES.find(l => l.code === (msg.detectedLang || language))?.name || 'Native'})</span>
                        </button>

                        {/* In-App Interactive Direct Action Buttons */}
                        {msg.actionType === 'sales' && (
                          <button
                            onClick={() => {
                              setNavTab('more');
                              setMoreSubTab('analytics');
                              setIsVoiceOpen(false);
                            }}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-lg transition"
                          >
                            📊 View Full Sales Analytics ➔
                          </button>
                        )}
                        {msg.actionType === 'stock' && (
                          <button
                            onClick={() => {
                              setNavTab('products');
                              setIsVoiceOpen(false);
                            }}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-lg transition"
                          >
                            📦 Open Cart Stock ➔
                          </button>
                        )}
                        {msg.actionType === 'map' && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            <button
                              onClick={() => {
                                setNavTab('map');
                                setIsVoiceOpen(false);
                              }}
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black rounded-lg transition"
                            >
                              🗺️ View Live Map ➔
                            </button>
                            <button
                              onClick={() => {
                                const destLat = mobilityRecs[0]?.latitude || 12.9820;
                                const destLon = mobilityRecs[0]?.longitude || 77.6100;
                                const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${vendorLocation[0]},${vendorLocation[1]}&destination=${destLat},${destLon}&travelmode=driving`;
                                window.open(mapsUrl, '_blank');
                              }}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-lg transition flex items-center space-x-1"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>🚀 Start Google Maps Navigation ➔</span>
                            </button>
                          </div>
                        )}
                        {msg.actionType === 'qr' && (
                          <button
                            onClick={() => {
                              setIsQrModalOpen(true);
                              setIsVoiceOpen(false);
                            }}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black rounded-lg transition"
                          >
                            📱 Show BharatQR Standee ➔
                          </button>
                        )}
                        {msg.actionType === 'weather' && (
                          <button
                            onClick={() => {
                              setNavTab('more');
                              setMoreSubTab('weather');
                              setIsVoiceOpen(false);
                            }}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black rounded-lg transition"
                          >
                            🌦️ View Weather Advisory ➔
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* QUICK MULTILINGUAL TESTING CHIPS (KANNADA, TAMIL, HINDI, TELUGU, ETC.) */}
            <div className="space-y-1 flex-shrink-0 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                  <span>🎙️ Speak / Test in Language:</span>
                </span>
                <span className="text-[9px] text-slate-500 font-bold">Auto-matches response voice</span>
              </div>
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { code: 'kn', label: 'ಕನ್ನಡ', prompt: 'ಇಂದಿನ ಒಟ್ಟು ಮಾರಾಟ ಮತ್ತು ಲಾಭ ಎಷ್ಟು?' },
                  { code: 'ta', label: 'தமிழ்', prompt: 'இன்றைய விற்பனை மற்றும் லாபம் எவ்வளவு?' },
                  { code: 'hi', label: 'हिन्दी', prompt: 'आज की कुल बिक्री और मुनाफा कितना है?' },
                  { code: 'te', label: 'తెలుగు', prompt: 'ఈరోజు మొత్తం అమ్మకాలు మరియు లాభం ఎంత?' },
                  { code: 'mr', label: 'मराठी', prompt: 'आजची एकूण विक्री आणि नफा किती आहे?' },
                  { code: 'en', label: 'English', prompt: 'What is today total sales and profit?' }
                ].map(item => (
                  <button
                    key={item.code}
                    onClick={() => executeVoiceQuery(item.prompt)}
                    className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-orange-900 hover:text-orange-950 font-black text-[11px] whitespace-nowrap transition active:scale-95 flex-shrink-0 shadow-sm"
                  >
                    🇮🇳 {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* QUICK SUGGESTION PROMPT CHIPS */}
            <div className="space-y-1 flex-shrink-0 text-left">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                💡 Quick Voice & Tap Actions:
              </span>
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                {t.voicePrompts.map((cmd: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => executeVoiceQuery(cmd.text)}
                    className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-orange-900 font-bold text-[11px] whitespace-nowrap transition active:scale-95 flex-shrink-0 shadow-sm"
                  >
                    "{cmd.label}"
                  </button>
                ))}
              </div>
            </div>

            {/* BOTTOM TALK & TYPE INPUT COMPOSER */}
            <div className="p-2 bg-orange-50/80 border border-orange-200 rounded-2xl flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={startListening}
                className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30'
                    : 'bg-orange-600 hover:bg-orange-500 text-white active:scale-95'
                }`}
                title="Tap Mic to Speak"
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <input
                type="text"
                value={customTextInput}
                onChange={(e) => setCustomTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customTextInput.trim()) {
                    executeVoiceQuery(customTextInput);
                  }
                }}
                placeholder={t.typeQueryPlaceholder}
                className="flex-1 bg-transparent px-2 py-1 text-xs text-white placeholder-slate-500 outline-none font-bold"
              />

              <button
                onClick={() => {
                  if (customTextInput.trim()) {
                    executeVoiceQuery(customTextInput);
                  }
                }}
                disabled={!customTextInput.trim()}
                className={`px-3 py-2 rounded-xl text-white font-black text-xs flex items-center space-x-1 transition ${
                  customTextInput.trim()
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 shadow-md'
                    : 'bg-orange-50 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. VENDOR AUTHENTICATION LOGIN MODAL */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-orange-200 shadow-2xl text-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                  <LogIn className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-slate-900">{t.loginTitle}</h3>
              </div>
              <button onClick={() => setIsLoginOpen(false)} className="p-1 rounded-full text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loginError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
                {loginError}
              </div>
            )}

            <form onSubmit={handleVendorLogin} className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-slate-500 mb-1">{t.phoneLabel}:</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-orange-200 text-slate-900 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">{t.pinLabel}:</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="1234"
                    maxLength={4}
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-orange-200 text-slate-900 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center space-x-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span>{loginLoading ? 'Logging In...' : t.loginBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginPhone('9876543210');
                  setLoginPin('1234');
                  handleVendorLogin({ preventDefault: () => {} } as any);
                }}
                className="w-full py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-950 border border-orange-200 rounded-xl text-xs font-black transition shadow-sm"
              >
                {t.demoLogin} ({t.vendorTitle})
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. ADD PRODUCT MODAL */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-orange-200 shadow-2xl text-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base text-slate-900">{t.addItem}</h3>
              <button onClick={() => setIsAddProductOpen(false)} className="p-1 rounded-full text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-slate-500 mb-1">Product Name (English):</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Fresh Ginger"
                  value={newProduct.name_en}
                  onChange={(e) => setNewProduct({ ...newProduct, name_en: e.target.value })}
                  className="w-full p-2.5 bg-white border border-orange-200 text-slate-900 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Product Name (Regional):</label>
                <input
                  type="text"
                  required
                  placeholder="ಉದಾ: ಹಸಿ ಶುಂಠಿ"
                  value={newProduct.name_kn}
                  onChange={(e) => setNewProduct({ ...newProduct, name_kn: e.target.value })}
                  className="w-full p-2.5 bg-white border border-orange-200 text-slate-900 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">Cost Price ({currencyConfig.symbol}):</label>
                  <input
                    type="number"
                    required
                    value={newProduct.cost_price}
                    onChange={(e) => setNewProduct({ ...newProduct, cost_price: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-orange-200 text-slate-900 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Selling Price ({currencyConfig.symbol}):</label>
                  <input
                    type="number"
                    required
                    value={newProduct.selling_price}
                    onChange={(e) => setNewProduct({ ...newProduct, selling_price: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-orange-200 text-slate-900 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">Initial Stock:</label>
                  <input
                    type="number"
                    required
                    value={newProduct.current_stock}
                    onChange={(e) => setNewProduct({ ...newProduct, current_stock: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-orange-200 text-slate-900 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Unit:</label>
                  <select
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="w-full p-2.5 bg-white border border-orange-200 text-slate-900 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 font-medium"
                  >
                    <option value="kg">ಕಿಲೋಗ್ರಾಂ</option>
                    <option value="bunch">ಕಟ್ಟು</option>
                    <option value="piece">ತುಂಡು</option>
                    <option value="litre">ಲೀಟರ್</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl shadow-md transition"
              >
                {t.addItem} (Save)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. SWIGGY / ZOMATO STYLE INCOMING ORDER POPUP MODAL */}
      {incomingOrderAlert.isOpen && incomingOrderAlert.order && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border-2 border-emerald-500 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-black px-3 py-1 rounded-full border border-emerald-500/30 flex items-center space-x-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>🔔 NEW DOORSTEP CUSTOMER ORDER!</span>
              </span>
              <span className="bg-rose-500/20 text-rose-300 text-xs font-black px-2.5 py-1 rounded-xl">
                ⏱️ {incomingOrderAlert.timeLeft}s
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-lg text-slate-900">{incomingOrderAlert.order.customer_name}</h3>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                  {incomingOrderAlert.order.distance_km} km away
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <span>{incomingOrderAlert.order.delivery_address}</span>
              </p>
            </div>

            <div className="bg-orange-50/70 p-3.5 rounded-2xl space-y-1.5 border border-orange-200 text-xs">
              {incomingOrderAlert.order.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-slate-800">
                  <span>{item.product_name_snapshot} × {item.quantity} {item.unit}</span>
                  <span className="font-bold text-slate-900">{currencyConfig.symbol}{item.subtotal}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-orange-100 flex justify-between font-black text-sm text-amber-400">
                <span>Total Amount:</span>
                <span>{currencyConfig.symbol}{incomingOrderAlert.order.total_amount} ({incomingOrderAlert.order.payment_mode})</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setIncomingOrderAlert({ isOpen: false, order: null, timeLeft: 0 })}
                className="py-3 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 font-black text-xs rounded-2xl transition"
              >
                ❌ Decline
              </button>
              <button
                onClick={handleAcceptIncomingOrder}
                className="py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs rounded-2xl shadow-xl shadow-emerald-600/30 transition flex items-center justify-center space-x-1.5 active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                <span>✅ ACCEPT ORDER</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MICRO-VENDOR SMART SOUNDBOX & DYNAMIC UPI QR STANDEE MODAL */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border-2 border-orange-500 w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="flex justify-between items-center">
              <span className="bg-blue-500/20 text-blue-300 text-xs font-black px-3 py-1 rounded-full border border-blue-500/30 flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>BHARAT QR • UPI DIGITAL STANDEE</span>
              </span>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-full text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="font-black text-base text-orange-950">{vendorUser.business_name}</h3>
              <p className="text-xs text-orange-600 font-mono font-bold mt-0.5">{vendorUser.upi_id}</p>
            </div>

            {/* Dynamic Real-Time BharatQR UPI Code Generator */}
            <div className="bg-white p-4 rounded-3xl inline-block shadow-lg border-2 border-orange-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  `upi://pay?pa=${vendorUser.upi_id}&pn=${encodeURIComponent(vendorUser.business_name)}&am=${qrDisplayAmount || 100}&cu=INR&tn=VendorSaathi+Sale`
                )}`}
                alt="Dynamic UPI QR Code"
                className="w-48 h-48 mx-auto"
              />
              <div className="mt-2 text-slate-900 font-black text-base">
                Scan & Pay: ₹{qrDisplayAmount || 100}
              </div>
            </div>

            {/* Supported Indian Payment Apps */}
            <div className="flex items-center justify-center space-x-3 text-[11px] font-extrabold text-slate-700">
              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-lg border border-emerald-500/30">Google Pay</span>
              <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-lg border border-indigo-500/30">PhonePe</span>
              <span className="bg-sky-500/20 text-sky-300 px-2 py-1 rounded-lg border border-sky-500/30">Paytm</span>
              <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded-lg border border-orange-500/30">BHIM UPI</span>
            </div>

            {/* Soundbox Test Announcement */}
            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => sounds.playPaymentSoundbox(qrDisplayAmount || 100, language, '₹')}
                className="flex-1 py-2.5 bg-orange-100 hover:bg-orange-200 text-amber-300 font-black text-xs rounded-xl transition flex items-center justify-center space-x-1 border border-orange-200"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>🔊 Announce Payment</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playPaymentSoundbox(qrDisplayAmount || 100, language, '₹');
                  setIsQrModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition"
              >
                ✓ ಪಾವತಿಯಾಗಿದೆ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. DIGITAL STREET MEGAPHONE MODAL */}
      <StreetMegaphoneModal
        isOpen={isMegaphoneOpen}
        onClose={() => setIsMegaphoneOpen(false)}
        language={language}
        vendorBusinessName={vendorUser.business_name}
        products={products}
      />

      {/* 10. STREET VENDOR EMERGENCY SAFETY SOS MODAL */}
      <EmergencySosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        vendorLocation={vendorLocation}
        vendorUser={vendorUser}
        language={language}
      />

    </div>
  );
};
