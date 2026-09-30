/**
 * offlineAssistant.ts — on-device fallback for the VendorSaathi voice assistant.
 *
 * When the network is down, the assistant still answers the three most common
 * questions — sales, stock and udhaar — from the last data it saw while online:
 *
 *   1. CACHE: every successful `/voice/chat` data answer (get_sales, get_inventory,
 *      get_customer_credit) is stored in localStorage, keyed by tool + entity.
 *   2. MATCHER: an offline multilingual intent matcher (keywords patterned after
 *      the backend router in `backend/app/assistant/tools.py`) detects the
 *      intended tool and product.
 *   3. HONEST REPLIES: answers are phrased in the user's language with explicit
 *      "last I knew / last synced" framing — never invented, never presented as
 *      fresh data (matches the spec's honesty rule).
 *
 * If there is no cached answer for the question, it says so honestly instead of
 * guessing. Confirmation chips are disabled offline (no financial actions).
 */
import { formatLocalizedNumber } from './i18n';

const CACHE_KEY = 'vs_assistant_offline_cache_v1';
const MAX_AGE_MS = 72 * 60 * 60 * 1000; // answers older than 3 days are dropped

export type OfflineTool = 'get_sales' | 'get_inventory' | 'get_customer_credit';

export interface CachedAnswer {
  tool: OfflineTool;
  entity: string;          // 'daily' | product key (tomato, onion...) | 'all' | 'my'/'ledger'
  reply: string;           // the assistant's original reply in its own language
  lang: string;            // language of `reply`
  data: Record<string, any>; // the structured `data` payload from the backend
  ts: number;              // Date.now() when cached
}

// --------------------------------------------------------------------------
// localStorage cache
// --------------------------------------------------------------------------
function loadCache(): Record<string, CachedAnswer> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CachedAnswer>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage full or unavailable — cache is best-effort */ }
}

function cacheKey(tool: OfflineTool, entity: string): string {
  return `${tool}::${entity}`;
}

function pruneCache(cache: Record<string, CachedAnswer>): Record<string, CachedAnswer> {
  const now = Date.now();
  for (const k of Object.keys(cache)) {
    if (!cache[k] || now - (cache[k].ts || 0) > MAX_AGE_MS) delete cache[k];
  }
  return cache;
}

/** Store a successful data answer so it can be replayed offline later. */
export function cacheVoiceAnswer(
  tool: string | null | undefined,
  entity: string | null | undefined,
  reply: string,
  lang: string,
  data: Record<string, any> | null | undefined,
): void {
  // Only cache genuinely successful data payloads (ok === true). Blocked or
  // unreachable-data replies ({} or ok:false) must never be replayed offline.
  if (!tool || !data || data.ok !== true) return;
  if (tool !== 'get_sales' && tool !== 'get_inventory' && tool !== 'get_customer_credit') return;
  const cache = pruneCache(loadCache());
  const ent = entity || (tool === 'get_sales' ? 'daily' : 'all');
  cache[cacheKey(tool, ent)] = { tool, entity: ent, reply, lang, data, ts: Date.now() };
  saveCache(cache);
}

// --------------------------------------------------------------------------
// Language detection — script ranges first, then romanized hints
// (mirrors backend/app/assistant/languages.py)
// --------------------------------------------------------------------------
const LANG_HINTS: { code: string; words: string[] }[] = [
  { code: 'kn', words: ['eshtu', 'ide', 'illva', 'illa', 'yaarige', 'nanna', 'hogabeku', 'biku', 'duddu', 'kan', 'baki', 'udaar', 'ivattu', 'esti'] },
  { code: 'hi', words: ['kitna', 'hai', 'chahiye', 'bikri', 'munafa', 'aaj', 'batao', 'kya', 'mere', 'udaar', 'udhaar', 'baaki', 'hoga'] },
  { code: 'te', words: 'entha|undhi|undi|kavali|cheppu|naa|ee|roju|ammakalu|baaki|udhi'.split('|') },
  { code: 'ta', words: 'evvalavu|irukku|irukira|vendum|solu|en|ennai|inraiya|vilaivu|kadan|baaki'.split('|') },
  { code: 'mr', words: ['kiti', 'ahe', 'pahije', 'mazha', 'vikri', 'udar', 'kasa', 'aahe'] },
  { code: 'bn', words: ['koto', 'ache', 'dorkar', 'amar', 'bikri', 'baki', 'ache'] },
  { code: 'gu', words: ['ketla', 'che', 'joie', 'maru', 'vechan', 'udhaar'] },
  { code: 'pa', words: ['kinna', 'hai', 'chahida', 'mera', 'vikri', 'baaki'] },
  { code: 'ml', words: 'ethra|undu|ellaa|enkil|ente|innathe|vilpana|kadham'.split('|') },
  { code: 'en', words: [] },
];

const SCRIPT_RANGES: { code: string; re: RegExp }[] = [
  { code: 'kn', re: /[\u0C80-\u0CFF]/ },
  { code: 'hi', re: /[\u0900-\u097F]/ }, // Devanagari, hi/mr share the script
  { code: 'te', re: /[\u0C00-\u0C7F]/ },
  { code: 'ta', re: /[\u0B80-\u0BFF]/ },
  { code: 'bn', re: /[\u0980-\u09FF]/ },
  { code: 'gu', re: /[\u0A80-\u0AFF]/ },
  { code: 'pa', re: /[\u0A00-\u0A7F]/ },
  { code: 'ml', re: /[\u0D00-\u0D7F]/ },
];

export function detectOfflineLang(text: string, fallback = 'en'): string {
  for (const { code, re } of SCRIPT_RANGES) {
    if (re.test(text)) {
      // Devanagari is shared by Hindi and Marathi — use romanized hints to split
      if (code === 'hi') {
        const low = ` ${text.toLowerCase()} `;
        const isMr = LANG_HINTS.find(h => h.code === 'mr')!.words.some(w => low.includes(` ${w} `) || low.includes(` ${w}`));
        return isMr ? 'mr' : 'hi';
      }
      return code;
    }
  }
  const low = ` ${text.toLowerCase()} `;
  let best = fallback || 'en';
  let bestScore = 0;
  for (const h of LANG_HINTS) {
    const score = h.words.reduce((n, w) => n + (low.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = h.code; }
  }
  return best;
}

// --------------------------------------------------------------------------
// Intent keywords — patterned after backend _KW tables
// --------------------------------------------------------------------------
const KW: Record<'sales' | 'stock' | 'udhaar', string[]> = {
  sales: ['sales', 'revenue', 'sold', 'sell', 'how much did i sell', 'how much did i make', 'how much money', 'how much did i earn',
    'bikri', 'vikri', 'duddu', 'ಮಾರಾಟ', 'ಮಾರಾಟವಾಗಿದೆ', 'ದುಡ್ಡು', 'ಬಿಕ್ರಿ', 'बिक्री', 'விற்பனை', 'అమ్మకాలు', 'വിൽപ്പന', 'বিক্রি', 'વેચાણ'],
  stock: ['stock', 'inventory', 'daastaanu', 'how much stock', 'kitna stock', 'ದಾಸ್ತಾನು', 'ಸ್ಟಾಕ್', 'ಎಷ್ಟು ದಾಸ್ತಾನು', 'स्टॉक', 'सूची',
    'இருப்பு', 'ஸ்டாக்', 'స్టాక్', 'സ്റ്റോക്ക്', 'মজুদ', 'સ્ટોક'],
  udhaar: ['udhaar', 'udaar', 'udar', 'credit', 'baaki', 'baki', 'kadan', 'kadam', 'who owes', 'owes me', 'ಉದಾರ', 'ಬಾಕಿ', 'ಬಾಕ್ಕಿ',
    'उधार', 'उधारी', 'बाकी', 'கடன்', 'బాకీ', 'ఉధార్', 'കടം', 'বাকি', 'ઉધાર', 'बाकी'],
};

// Product aliases — same canonical keys as backend PRODUCT_ALIASES (subset: what offline answers support)
const PRODUCT_ALIASES: Record<string, string[]> = {
  tomato: ['tomato', 'tamatar', 'tamata', 'thakkali', 'ಟೊಮೇಟೊ', 'ಟಮೇಟೊ', 'टमाटर', 'தக்காಳி', 'టమోటా', 'തക്കാളി', 'टोमॅटो', 'টমেটো', 'ટામેટાં', 'ਟਮਾਟਰ'],
  onion: ['onion', 'pyaaz', 'eerulli', 'ಈರುಳ್ಳಿ', 'प्याज', 'प्याज़', 'வெங்காயம்', 'ఉల్లిపాయ', 'ഉള്ളി', 'कांदा', 'পেঁয়াজ', 'ડુંगળી', 'ਪਿਆਜ਼'],
  potato: ['potato', 'aalu', 'alu', 'batata', 'alugadde', 'ಆಲೂಗಡ್ಡೆ', 'आलू', 'आलु', 'உருளைக்கிழங்கு', 'బంగాళాదుంప', 'ഉരുളക്കിഴങ്ങ്', 'बटाटा', 'আলু', 'બટાಟા', 'ਆਲੂ'],
  rice: ['rice', 'chawal', 'akki', 'ಅಕ್ಕಿ', 'चावल', 'அரிசி', 'వరి', 'അരി', 'भात', 'চাল', 'ચોખા', 'ਚਾਵल'],
  wheat: ['wheat', 'atta', 'godhi', 'ಗೋಧಿ', 'गेहूं', 'गेहूँ', 'கோதுமை', 'గోధుమ', 'ഗോതമ്പ്', 'गहूं', 'গম', 'ઘઉં'],
  turmeric: ['turmeric', 'haldi', 'arishina', 'ಅರಿಶಿನ', 'हल्दी', 'மஞ்சள்', 'పసుపు', 'മഞ്ഞൾ', 'हळद', 'হলুদ', 'હળದರ'],
  chilli: ['chilli', 'chili', 'menasinakai', 'mensinkai', 'ಮೆಣಸಿನಕಾಯಿ', 'मिर्च', 'मिर्ची', 'மிளகாய்', 'మిర్చి', 'മുളക്', 'লঙ্কা', 'મરચી', 'ਮਿਰਚ'],
  coriander: ['coriander', 'dhania', 'kottambari', 'kothamalli', 'ಕೊತ್ತಂಬರಿ', 'धनिया', 'கொத்தமல்லி', 'కొత్తిమీర', 'മല്ലി', 'કોથમીર'],
  carrot: ['carrot', 'gajar', 'ಕ್ಯಾರೆಟ್', 'गाजर', 'கேரட்', 'క్యారెట్', 'കാരറ്റ്', 'গাজর', 'કેરેટ'],
  cucumber: ['cucumber', 'kheera', 'sautekayi', 'ಸೌತೆಕಾಯಿ', 'खीरा', 'வெள்ளரி', 'దోస', 'വെള്ളരി', 'শশা', 'કાકಡી'],
  dal: ['dal', 'daal', 'togari', 'thogari', 'ತೊಗರಿ', 'ಬೇಳೆ', 'दाल', 'பருப்பு', 'పప్పു', 'പരിപ്പ്', 'ডাল', 'દાળ'],
  milk: ['milk', 'doodh', 'haalu', 'ಹಾಲು', 'दूध', 'பால்', 'పాలు', 'പാൽ', 'দুধ', 'દૂધ', 'ਦੁੱਧ'],
  ghee: ['ghee', 'tuppa', 'ತುಪ್ಪ', 'घी', 'நெய்', 'నెయ్యి', 'നെയ്യ്', 'तूप', 'ঘি', 'ઘી'],
  eggs: ['egg', 'eggs', 'anda', 'motte', 'ಮೊಟ್ಟೆ', 'अंडा', 'अंडे', 'முட்டை', 'గుడ్డ', 'മുട്ട', 'ডিম', 'ਅੰਡੇ'],
  sugar: ['sugar', 'cheeni', 'sakre', 'khanda', 'ಸಕ್ಕರೆ', 'चीनी', 'சர்க்கரை', 'చక్కెర', 'പഞ്ചസാര', 'साखर', 'চিনি', 'ખાંડ'],
  oil: ['oil', 'tel', 'enne', 'ಎಣ್ಣೆ', 'तेल', 'எண்ணெய்', 'నూనె', 'എണ്ണ', 'তেল', 'તેલ'],
  apple: ['apple', 'seb', 'sebu', 'ಸೇಬು', 'सेब', 'ஆப்பிள்', 'ఆపిల్', 'ആപിൾ', 'सफरचंद', 'আপেল', 'સફરજન'],
  banana: ['banana', 'kela', 'bale', 'ಬಾಳೆ', 'केला', 'வாழை', 'అరటి', 'വാഴപ്പഴം', 'केळी', 'কলা', 'કેળા'],
  paneer: ['paneer', 'ಪನೀರ್', 'पनीर', 'పనీర్', 'പനീർ', 'பனீர்'],
  curd: ['curd', 'yogurt', 'dahi', 'mosaru', 'ಮೊಸರು', 'दही', 'தயிர்', 'పెరుగు', 'തൈര്', 'দই', 'દહીં'],
};

function hasAny(low: string, words: string[]): boolean {
  return words.some(w => low.includes(w));
}

function matchProduct(text: string): string | null {
  const low = ' ' + text.toLowerCase() + ' ';
  let bestKey: string | null = null;
  let bestLen = 0;
  for (const [key, aliases] of Object.entries(PRODUCT_ALIASES)) {
    for (const a of aliases) {
      if (low.includes(a) && a.length > bestLen) { bestKey = key; bestLen = a.length; }
    }
  }
  return bestKey;
}

// --------------------------------------------------------------------------
// Localized honest reply templates (10 languages) — last-known framing
// --------------------------------------------------------------------------
type L = string;
const T: Record<string, Record<L, string>> = {
  // Prefix shown before every offline answer
  offline_prefix: {
    en: 'You seem to be offline — here is the last I knew',
    kn: 'ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ — ನನಗೆ ಕೊನೆಯದಾಗಿ ತಿಳಿದಿದ್ದು',
    hi: 'आप ऑफ़लाइन लग रहे हैं — मुझे जो आख़िरी बात याद है',
    te: 'మీరు ఆఫ్‌లైన్‌లో ఉన్నట్టుగా ఉన్నారు — నాకు చివరిగా తెలిసినది',
    ta: 'நீங்கள் ஆஃப்லைனில் இருக்கிறீர்கள் — எனக்குத் தெரிந்த கடைசி தகவல்',
    mr: 'तुम्ही ऑफलाइन असल्याचे दिसते — मला शेवटचे माहीत असलेले',
    bn: 'আপনি অফলাইনে আছেন বলে মনে হচ্ছে — আমার জানা শেষ তথ্য',
    gu: 'તમે ઑફલાઇન હોવાનું લાગે છે — મને છેલ્લે જાણીતું',
    pa: 'ਤੁਸੀਂ ਆਫ਼ਲਾਈਨ ਲੱਗ ਰਹੇ ਹੋ — ਮੈਨੂੰ ਆਖ਼ਰੀ ਵਾਰ ਜੋ ਪਤਾ ਸੀ',
    ml: 'നിങ്ങൾ ഓഫ്‌ലൈനിൽ ആണെന്ന് തോന്നുന്നു — എനിക്ക് അറിയാവുന്ന അവസാനത്തെ',
  },
  // get_sales
  offline_sales: {
    en: 'Your sales today: {count} sales, ₹{revenue} total, ₹{profit} profit (as of my last sync).',
    kn: 'ಇಂದಿನ ಮಾರಾಟ: {count} ಮಾರಾಟ, ಒಟ್ಟು ₹{revenue}, ಲಾಭ ₹{profit} (ಕೊನೆಯ ಸಿಂಕ್‌ನಂತೆ).',
    hi: 'आज की बिक्री: {count} बिक्री, कुल ₹{revenue}, मुनाफा ₹{profit} (आख़िरी सिंक के अनुसार)।',
    te: 'ఈరోజు అమ్మకాలు: {count} అమ్మకాలు, మొత్తం ₹{revenue}, లాభం ₹{profit} (చివరి సింక్ ప్రకారం).',
    ta: 'இன்றைய விற்பனை: {count} விற்பனை, மொத்தம் ₹{revenue}, லாபம் ₹{profit} (கடைசி சிங்கின் படி).',
    mr: 'आजची विक्री: {count} विक्री, एकूण ₹{revenue}, नफा ₹{profit} (शेवटच्या सिंकनुसार).',
    bn: 'আজকের বিক্রি: {count} বিক্রি, মোট ₹{revenue}, লাভ ₹{profit} (শেষ সিঙ্ক অনুযায়ী)।',
    gu: 'આજનું વેચાણ: {count} વેચાણ, કુલ ₹{revenue}, નફો ₹{profit} (છેલ્લા સિંક મુજબ).',
    pa: 'ਅੱਜ ਦੀ ਵਿਕਰੀ: {count} ਵਿਕਰੀ, ਕੁੱਲ ₹{revenue}, ਮੁਨਾਫ਼ਾ ₹{profit} (ਆਖ਼ਰੀ ਸਿੰਕ ਮੁਤਾਬਕ).',
    ml: 'ഇന്നത്തെ വിൽപ്പന: {count} വിൽപ്പന, ആകെ ₹{revenue}, ലാഭം ₹{profit} (അവസാന സിങ്ക് പ്രകാരം).',
  },
  offline_sales_zero: {
    en: 'No sales were recorded yet when I last synced.',
    kn: 'ಕೊನೆಯ ಸಿಂಕ್ ಸಮಯದಲ್ಲಿ ಇನ್ನೂ ಮಾರಾಟವಾಗಿರಲಿಲ್ಲ.',
    hi: 'आख़िरी सिंक के समय अभी कोई बिक्री दर्ज नहीं हुई थी।',
    te: 'చివరి సింక్ సమయంలో ఇంకా అమ్మకాలు నమోదు కాలేదు.',
    ta: 'கடைசி சிங்கின் போது இன்னும் விற்பனை இல்லை.',
    mr: 'शेवटच्या सिंकच्या वेळी अजून विक्री नोंदवली गेली नव्हती.',
    bn: 'শেষ সিঙ্কের সময় এখনো কোনো বিক্রি হয়নি।',
    gu: 'છેલ્લા સિંક સમયે હજુ કોઈ વેચાણ થયું ન હતું.',
    pa: 'ਆਖ਼ਰੀ ਸਿੰਕ ਸਮੇਂ ਹਾਲੇ ਕੋਈ ਵਿਕਰੀ ਦਰਜ ਨਹੀਂ ਹੋਈ ਸੀ।',
    ml: 'അവസാന സിങ്ക് സമയത്ത് ഇതുവരെ വിൽപ്പന രേഖപ്പെടുത്തിയിട്ടില്ല.',
  },
  // get_inventory — one product
  offline_stock_one: {
    en: 'You had {stock} {unit} of {product} at my last sync.',
    kn: 'ಕೊನೆಯ ಸಿಂಕ್‌ನಂತೆ ನಿಮ್ಮ ಬಳಿ {stock} {unit} {product} ಇತ್ತು.',
    hi: 'आख़िरी सिंक के अनुसार आपके पास {stock} {unit} {product} था.',
    te: 'చివరి సింక్ ప్రకారం మీ వద్ద {stock} {unit} {product} ఉంది.',
    ta: 'கடைசி சிங்கின் படி உங்களிடம் {stock} {unit} {product} இருந்தது.',
    mr: 'शेवटच्या सिंकनुसार तुमच्याकडे {stock} {unit} {product} होते.',
    bn: 'শেষ সিঙ্ক অনুযায়ী আপনার কাছে {stock} {unit} {product} ছিল।',
    gu: 'છેલ્લા સિંક મુજબ તમારી પાસે {stock} {unit} {product} હતું.',
    pa: 'ਆਖ਼ਰੀ ਸਿੰਕ ਮੁਤਾਬਕ ਤੁਹਾਡੇ ਕੋਲ {stock} {unit} {product} ਸੀ।',
    ml: 'അവസാന സിങ്ക് പ്രകാരം നിങ്ങളുടെ കൈയിൽ {stock} {unit} {product} ഉണ്ടായിരുന്നു.',
  },
  // get_inventory — whole stock list
  offline_stock_all: {
    en: 'You had {count} products in stock. Top items: {items} (last sync).',
    kn: 'ಕೊನೆಯ ಸಿಂಕ್‌ನಂತೆ ನಿಮ್ಮ ಬಳಿ {count} ಐಟಂಗಳಿದ್ದವು. ಮುಖ್ಯವಾಗಿ: {items}',
    hi: 'आख़िरी सिंक के अनुसार आपके पास {count} उत्पाद थे। मुख्य: {items}',
    te: 'చివరి సింక్ ప్రకారం మీ వద్ద {count} వస్తువులు ఉన్నాయి. ముఖ్యమైనవి: {items}',
    ta: 'கடைசி சிங்கின் படி உங்களிடம் {count} பொருட்கள் இருந்தன. முக்கியமானவை: {items}',
    mr: 'शेवटच्या सिंकनुसार तुमच्याकडे {count} वस्तू होत्या. मुख्य: {items}',
    bn: 'শেষ সিঙ্ক অনুযায়ী আপনার কাছে {count}টি আইটেম ছিল। প্রধান: {items}',
    gu: 'છેલ્લા સિંક મુજબ તમારી પાસે {count} વસ્તુઓ હતી. મુખ્ય: {items}',
    pa: 'ਆਖ਼ਰੀ ਸਿੰਕ ਮੁਤਾਬਕ ਤੁਹਾਡੇ ਕੋਲ {count} ਚੀਜ਼ਾਂ ਸਨ। ਮੁੱਖ: {items}',
    ml: 'അവസാന സിങ്ക് പ്രകാരം നിങ്ങളുടെ കൈയിൽ {count} ഇനങ്ങൾ ഉണ്ടായിരുന്നു. പ്രധാനം: {items}',
  },
  // get_customer_credit — vendor asking about ledger / customer about own udhaar
  offline_udhaar_total: {
    en: '{count} customers owed you ₹{total} in total at my last sync.',
    kn: 'ಕೊನೆಯ ಸಿಂಕ್ ಸಮಯದಲ್ಲಿ {count} ಗ್ರಾಹಕರು ಒಟ್ಟು ₹{total} ಕೊಟ್ಟಿರಬೇಕಿತ್ತು.',
    hi: 'आख़िरी सिंक पर {count} ग्राहकों से आपको कुल ₹{total} मिलने थे।',
    te: 'చివరి సింక్ సమయంలో {count} కస్టమర్ల నుండి మొత్తం ₹{total} రావాలి.',
    ta: 'கடைசி சிங்கின் போது {count} வாடிக்கையாளர்களிடம் மொத்தம் ₹{total} பாக்கி.',
    mr: 'शेवटच्या सिंकच्या वेळी {count} ग्राहकांकडून एकूण ₹{total} बाकी होते.',
    bn: 'শেষ সিঙ্কের সময় {count} জন ক্রেতার কাছে মোট ₹{total} বাকি ছিল।',
    gu: 'છેલ્લા સિંક સમયે {count} ગ્રાહકો પાસેથી કુલ ₹{total} બાકી હતું.',
    pa: 'ਆਖ਼ਰੀ ਸਿੰਕ ਸਮੇਂ {count} ਗਾਹਕਾਂ ਤੋਂ ਕੁੱਲ ₹{total} ਬਾਕੀ ਸੀ।',
    ml: 'അവസാന സിങ്ക് സമയത്ത് {count} ഉപഭോക്താക്കൾക്ക് ആകെ ₹{total} ബാക്കി.',
  },
  offline_udhaar_none: {
    en: 'Nobody owed you anything when I last synced. All clear!',
    kn: 'ಕೊನೆಯ ಸಿಂಕ್ ಸಮಯದಲ್ಲಿ ಯಾರೂ ಹಣ ಕೊಡಬೇಕಿರಲಿಲ್ಲ. ಎಲ್ಲವೂ ಸ್ಪಷ್ಟ!',
    hi: 'आख़िरी सिंक पर किसी से कुछ बाकी नहीं था। सब साफ़!',
    te: 'చివరి సింక్ సమయంలో ఎవరికీ బాకీ లేదు.',
    ta: 'கடைசி சிங்கின் போது யாருக்கும் பாக்கி இல்லை.',
    mr: 'शेवटच्या सिंकच्या वेळी कोणाचेही बाकी नव्हते.',
    bn: 'শেষ সিঙ্কের সময় কারও কাছে কিছু বাকি ছিল না।',
    gu: 'છેલ્લા સિંક સમયે કોઈનું બાકી ન હતું.',
    pa: 'ਆਖ਼ਰੀ ਸਿੰਕ ਸਮੇਂ ਕਿਸੇ ਤੋਂ ਕੁਝ ਬਾਕੀ ਨਹੀਂ ਸੀ।',
    ml: 'അവസാന സിങ്ക് സമയത്ത് ആരുടെയും കടം ഇല്ലായിരുന്നു.',
  },
  offline_udhaar_one: {
    en: '{name} owed you ₹{amount} at my last sync.',
    kn: 'ಕೊನೆಯ ಸಿಂಕ್ ಸಮಯದಲ್ಲಿ {name} ಅವರು ₹{amount} ಕೊಡಬೇಕಿತ್ತು.',
    hi: 'आख़िरी सिंक पर {name} से ₹{amount} बाकी था।',
    te: 'చివరి సింక్ సమయంలో {name}కి ₹{amount} బాకీ.',
    ta: 'கடைசி சிங்கின் போது {name}டம் ₹{amount} பாக்கி.',
    mr: 'शेवटच्या सिंकच्या वेळी {name} ला ₹{amount} बाकी होते.',
    bn: 'শেষ সিঙ্কের সময় {name} এর কাছে ₹{amount} বাকি ছিল।',
    gu: 'છેલ્લા સિંક સમયે {name} પાસે ₹{amount} બાકી હતું.',
    pa: 'ਆਖ਼ਰੀ ਸਿੰਕ ਸਮੇਂ {name} ਤੋਂ ₹{amount} ਬਾਕੀ ਸੀ।',
    ml: 'അവസാന സിങ്ക് സമയത്ത് {name}ന് ₹{amount} ബാക്കി.',
  },
  // No cache for this question — say so honestly, never invent
  offline_no_data: {
    en: "You're offline and I have no saved answer for that. Reconnect and ask me again.",
    kn: 'ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ ಮತ್ತು ಅದಕ್ಕೆ ನನಗೆ ಉಳಿಸಿದ ಉತ್ತರವಿಲ್ಲ. ಸಂಪರ್ಕ ಮರಳಿ ಬಂದಾಗ ಕೇಳಿ.',
    hi: 'आप ऑफ़लाइन हैं और इसके लिए मेरे पास कोई सहेजा हुआ उत्तर नहीं है। कनेक्शन वापस आने पर फिर पूछें।',
    te: 'మీరు ఆఫ్‌లైన్‌లో ఉన్నారు మరియు దీనికి నా దగ్గర సేవ్ చేసిన సమాధానం లేదు. కనెక్షన్ తిరిగి వచ్చాక మళ్లీ అడగండి.',
    ta: 'நீங்கள் ஆஃப்லைனில் இருக்கிறீர்கள், இதற்கு என்னிடம் சேமிக்கப்பட்ட பதில் இல்லை. இணைப்பு திரும்பியதும் மீண்டும் கேளுங்கள்.',
    mr: 'तुम्ही ऑफलाइन आहात आणि यासाठी माझ्याकडे जतन केलेले उत्तर नाही. कनेक्शन परत आल्यावर पुन्हा विचारा.',
    bn: 'আপনি অফলাইনে আছেন এবং এর জন্য আমার কাছে সংরক্ষিত উত্তর নেই। সংযোগ ফিরে এলে আবার জিজ্ঞাসা করুন।',
    gu: 'તમે ઑફલાઇન છો અને તેના માટે મારી પાસે સાચવેલો જવાબ નથી. કનેક્શન પાછું આવે ત્યારે ફરી પૂછો.',
    pa: 'ਤੁਸੀਂ ਆਫ਼ਲਾਈਨ ਹੋ ਅਤੇ ਇਸ ਲਈ ਮੇਰੇ ਕੋਲ ਸੰਭਾਲਿਆ ਹੋਇਆ ਜਵਾਬ ਨਹੀਂ ਹੈ। ਕਨੈਕਸ਼ਨ ਵਾਪਸ ਆਉਣ ਤੇ ਦੁਬਾਰਾ ਪੁੱਛੋ।',
    ml: 'നിങ്ങൾ ഓഫ്‌ലൈനിലാണ്, ഇതിന് എന്റെ അടുത്ത് സൂക്ഷിച്ച ഉത്തരമില്ല. കണക്ഷൻ തിരികെ വരുമ്പോൾ വീണ്ടും ചോദിക്കുക.',
  },
  // Advice that needs fresh data — honest refusal offline
  offline_advice_unavailable: {
    en: "I'm offline — prices and weather change constantly, so I won't guess. Please reconnect.",
    kn: 'ನಾನು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೇನೆ — ಬೆಲೆ ಮತ್ತು ಹವಾಮಾನ ನಿರಂತರ ಬದಲಾಗುತ್ತದೆ, ಆದ್ದರಿಂದ ನಾನು ಊಹಿಸುವುದಿಲ್ಲ. ದಯವಿಟ್ಟು ಸಂಪರ್ಕ ಮರಳಿ ಪಡೆಯಿರಿ.',
    hi: 'मैं ऑफ़लाइन हूँ — कीमतें और मौसम लगातार बदलते रहते हैं, इसलिए मैं अंदाज़ा नहीं लूँगा। कृपया दोबारा कनेक्ट करें।',
    te: 'నేను ఆఫ్‌లైన్‌లో ఉన్నాను — ధరలు మరియు వాతావరణం నిరంతరం మారుతూ ఉంటాయి, కాబట్టి నేను ఊహించను. దయచేసి మళ్లీ కనెక్ట్ అవ్వండి.',
    ta: 'நான் ஆஃப்லைனில் இருக்கிறேன் — விலை மற்றும் வானிலை தொடர்ந்து மாறுகிறது, எனவே நான் யூகிக்க மாட்டேன். தயவுசெய்து மீண்டும் இணையுங்கள்.',
    mr: 'मी ऑफलाइन आहे — किंमत आणि हवामान सतत बदलत असते, त्यामुळे मी अंदाज घेणार नाही. कृपया पुन्हा कनेक्ट व्हा.',
    bn: 'আমি অফলাইনে আছি — দাম এবং আবহাওয়া প্রতিনিয়ত বদলায়, তাই আমি অনুমান করব না। অনুগ্রহ করে আবার সংযোগ করুন।',
    gu: 'હું ઑફલાઇન છું — ભાવ અને હવામાન સતત બદલાય છે, તેથી હું અંદાજ નહીં લગાવું. કૃપા કરી ફરી કનેક્ટ કરો.',
    pa: 'ਮੈਂ ਆਫ਼ਲਾਈਨ ਹਾਂ — ਕੀਮਤਾਂ ਅਤੇ ਮੌਸਮ ਲਗਾਤਾਰ ਬਦਲਦੇ ਰਹਿੰਦੇ ਹਨ, ਇਸ ਲਈ ਮੈਂ ਅੰਦਾਜ਼ਾ ਨਹੀਂ ਲਾਵਾਂਗਾ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕਨੈਕਟ ਕਰੋ।',
    ml: 'ഞാൻ ഓഫ്‌ലൈനിലാണ് — വിലയും കാലാവസ്ഥയും നിരന്തരം മാറിക്കൊണ്ടിരിക്കുന്നു, അതിനാൽ ഞാൻ ഊഹിക്കില്ല. ദയവായി വീണ്ടും കണക്ട് ചെയ്യുക.',
  },

  // -------- offline ACTION queues (money actions survive network drops) -----
  // NOTE: the caller already prepends offline_prefix, so don't repeat it here.
  offline_order_queued: {
    en: "Queued safely: {qty} {unit} {product}{total}. It will be ordered the moment network returns.",
    kn: 'ಸುರಕ್ಷಿತವಾಗಿ ಸರಣಿಗೆ ಸೇರಿಸಲಾಗಿದೆ: {qty} {unit} {product}{total}. ನೆಟ್‌ವರ್ಕ್ ಬಂದ ಕೂಡಲೇ ಆರ್ಡರ್ ಆಗುತ್ತದೆ.',
    hi: 'सुरक्षित कतार में रखा गया: {qty} {unit} {product}{total}. नेटवर्क आते ही ऑर्डर हो जाएगा।',
  },
  offline_udhaar_queued: {
    en: "Udhaar of ₹{amount} for {name} is queued and will be recorded when network returns.",
    kn: '{name} ಅವರ ₹{amount} ಉದಾರ ಸರಣಿಯಲ್ಲಿದೆ, ನೆಟ್‌ವರ್ಕ್ ಬಂದಾಗ ದಾಖಲಾಗುತ್ತದೆ.',
    hi: '{name} का ₹{amount} उधार कतार में है, नेटवर्क आने पर दर्ज हो जाएगा।',
  },
};

function t(key: string, lang: string): string {
  return (T[key] && (T[key][lang] || T[key].en)) || '';
}

function fmtNum(n: number | string, lang: string): string {
  return formatLocalizedNumber(String(n), lang);
}

// Products the matcher recognises (for the "stock <product>" cache key)
export { matchProduct, KW };

/** Honest "no saved answer" reply in the user's language. */
export function offlineNoDataText(lang: string): string {
  return t('offline_no_data', lang);
}

/** Honest refusal for questions that need fresh data (prices, weather). */
export function offlineRefusedText(lang: string): string {
  return t('offline_advice_unavailable', lang);
}

/**
 * Cache entity for a successful answer. Inventory is keyed by the matcher's
 * canonical product key so the offline lookup finds it again.
 */
export function entityForCache(
  tool: string | null | undefined,
  text: string,
  data: Record<string, any> | null | undefined,
): string {
  if (!tool) return 'all';
  if (tool === 'get_sales') return 'daily';
  if (tool === 'get_customer_credit') {
    const mine = /\bmy\b|ನನ್ನ|मेरा|मेरी|मेरे|माझा|माझे|నా |నాకు|என்|எனக்கு|મારું|ਮੇਰਾ|എന്റെ|আমার/i.test(text);
    return mine ? 'my' : 'all';
  }
  if (tool === 'get_inventory') {
    return matchProduct(text) || (data?.product ? String(data.product).toLowerCase() : 'all');
  }
  return 'all';
}

// --------------------------------------------------------------------------
// Offline answer engine
// --------------------------------------------------------------------------
export interface OfflineQueuedAction {
  type: 'ORDER_CREATE' | 'UDHAAR';
  text: string;   // confirmation shown in chat
  lang: string;
  payload: Record<string, any>; // ready to hand to offlineSync.enqueue
}

export interface OfflineAnswer {
  text: string;       // full reply (prefix + answer)
  lang: string;
  tool: OfflineTool;  // which cached tool answered
  cached: true;
}

export interface OfflineTryResult {
  answer?: OfflineAnswer;
  noData?: boolean;   // recognized a supported question but no cache
  refused?: boolean;  // question needs live data (price/weather) — honest refusal
  queued?: OfflineQueuedAction; // money action recorded in the offline outbox
}

// --------------------------------------------------------------- actions ----
const NUM_WORDS: Record<string, number> = {
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'half': 0.5, 'quarter': 0.25,
  // kannada
  'ಒಂದು': 1, 'ಎರಡು': 2, 'ಮೂರು': 3, 'ನಾಲ್ಕು': 4, 'ಐದು': 5,
  // hindi
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
};

const UNIT_WORDS = ['kg', 'kilo', 'kilos', 'ಕೆಜಿ', 'kgs', 'litre', 'liter', 'l', 'bunch', 'dozen', 'piece', 'pcs'];

function parseQty(text: string): number {
  const words = text.toLowerCase().replace(/[?,.]/g, ' ').split(/\s+/);
  for (const w of words) {
    const n = parseFloat(w);
    if (!isNaN(n) && n > 0 && n < 1000) return n;
    if (NUM_WORDS[w] !== undefined) return NUM_WORDS[w];
  }
  return 1;
}

function parseUnit(text: string): string {
  const low = text.toLowerCase();
  for (const u of UNIT_WORDS) {
    if (new RegExp(`\\b${u}\\b`).test(low)) {
      if (u === 'kilo' || u === 'kilos' || u === 'kgs' || u === 'ಕೆಜಿ') return 'kg';
      if (u === 'litre' || u === 'liter' || u === 'l') return 'litre';
      return u;
    }
  }
  return 'kg';
}

function parseAmount(text: string): number {
  const m = text.replace(/,/g, '').match(/(?:₹|rs\.?|rupees)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:₹|rs\.?|rupees)/i);
  if (m) return parseFloat(m[1] || m[2]);
  return parseQty(text);
}

function parseName(text: string): string {
  // "udhaar for Ramesh" / "add 200 to Suresh's account" — take capitalized word after 'for'/'to'
  const m = text.match(/\b(?:for|to)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/);
  if (m) return m[1];
  const m2 = text.match(/\b(?:udhaar|udaar|credit|ಉದಾರ|उधार)\s+([A-Z][a-zA-Z]+)/);
  if (m2) return m2[1];
  return 'Customer';
}

/**
 * Detect offline money actions and build outbox payloads.
 * Called BEFORE the read-only cache logic — actions never read cache.
 */
export function detectOfflineAction(text: string, preferredLang: string): OfflineQueuedAction | null {
  const lang = detectOfflineLang(text, preferredLang || 'en');
  const low = ' ' + text.toLowerCase() + ' ';

  const product = matchProduct(text);
  const orderIntent = hasAny(low, ['order', 'need', 'want', 'give me', 'get me', 'buy', 'ಬೇಕು', 'ಕೊಡಿ', 'ಆರ್ಡರ್', 'चाहिए', 'चाहिये', 'चाहिए', 'i need', 'i want']) && !!product;

  if (orderIntent) {
    const qty = parseQty(text);
    const unit = parseUnit(text);
    const productName = product.charAt(0).toUpperCase() + product.slice(1);
    const body = t('offline_order_queued', lang)
      .replace('{qty}', fmtNum(qty, lang))
      .replace('{unit}', unit)
      .replace('{product}', productName)
      .replace('{total}', '');  // price unknown offline — never guess money
    return {
      type: 'ORDER_CREATE',
      text: `${t('offline_prefix', lang)}: ${body}`,
      lang,
      payload: {
        items: [{ product_name: product, quantity: qty, unit }],
        total_amount: 0, // server prices it at current rate on sync
        payment_mode: 'CASH',
      },
    };
  }

  const udhaarIntent = hasAny(low, ['udhaar', 'udaar', 'credit', 'ಉದಾರ', 'ಸಾಲ', 'उधार', 'उधारो', 'कर्ज']) && hasAny(low, ['add', 'give', 'record', 'ಸೇರಿಸಿ', 'ಹಾಕಿ', 'ಕೊಡಿ', 'जोड़ो', 'दर्ज', 'जोड़ें', 'karodo', 'ಮಾಡಿ']) && !hasAny(low, ['who', 'kitna', 'how much', 'ಎಷ್ಟು', 'ಯಾರಿಗೆ', 'कितना', 'kitne']);
  if (udhaarIntent) {
    const amount = parseAmount(text);
    const name = parseName(text);
    const body = t('offline_udhaar_queued', lang)
      .replace('{amount}', fmtNum(amount, lang))
      .replace('{name}', name);
    return {
      type: 'UDHAAR',
      text: `${t('offline_prefix', lang)}: ${body}`,
      lang,
      payload: {
        customer_name: name,
        amount_due: amount,
        customer_phone: null,
        notes: 'Voice udhaar (offline)',
      },
    };
  }

  return null;
}

export function tryOfflineAnswer(text: string, preferredLang: string): OfflineTryResult {
  const lang = detectOfflineLang(text, preferredLang || 'en');
  const low = ' ' + text.toLowerCase() + ' ';
  const cache = pruneCache(loadCache());

  // --- Money actions FIRST: queue them so they survive the network drop ---
  // (recognized orders/udhaar never fall through to the read-only cache logic)
  const action = detectOfflineAction(text, preferredLang || 'en');
  if (action) return { queued: action };

  // --- Live-data questions (price / weather / location): refuse honestly ---
  if (hasAny(low, ['market price', 'mandi', 'weather', 'rain', 'ಮಳೆ', 'ಹವಾಮಾನ', 'ಮಾರುಕಟ್ಟೆ', 'मौसम', 'बारिश', 'मंडी', 'மழை', 'வானிலை', 'சந்தை', 'వర్షం', 'వాతావరణం', 'మండీ', 'മഴ', 'കാലാവസ്ഥ', 'मावसम', 'আবহাওয়া', 'મોંઘવારી', 'હવામાન', 'ਮੌਸਮ', 'ਮੀਂਹ', 'ಬೆಲೆ ಎಷ್ಟು'])) {
    return { refused: true };
  }
  // --- ACTION words with a product: never answer read-only from cache ---
  if (hasAny(low, ['add', 'update', 'reduce', 'increase', 'remove', 'set ', 'order', 'buy', 'pay', 'record', 'cancel', 'ಸೇರಿಸಿ', 'ಹಾಕಿ', 'ಕೊಡಿ', 'जोड़ो', 'जोड़े', 'बढ़ाओ', 'दर्ज', 'चुकाएं', 'జోడించు', 'சேர்க்க', 'ചേർക്കുക', 'ಬೇಕು', 'ಕೊಡು', 'चाहिए', 'चाहिये', 'కావాలి', 'வேண்டும்', 'വേണം', 'i need', 'i want', 'give me', 'get me'])) {
    return {};
  }
  // ---------------------------------------------------------- SALES --------
  if (hasAny(low, KW.sales) && !hasAny(low, KW.stock)) {
    const c = cache['get_sales::daily'];
    if (!c) return { noData: true };
    const d = c.data || {};
    if (Number(d.sales_count) > 0) {
      const body = t('offline_sales', lang)
        .replace('{count}', fmtNum(d.sales_count ?? 0, lang))
        .replace('{revenue}', fmtNum(d.revenue ?? 0, lang))
        .replace('{profit}', fmtNum(d.profit ?? 0, lang));
      return { answer: { text: `${t('offline_prefix', lang)}: ${body}`, lang, tool: 'get_sales', cached: true } };
    }
    return { answer: { text: `${t('offline_prefix', lang)}: ${t('offline_sales_zero', lang)}`, lang, tool: 'get_sales', cached: true } };
  }
  // ---------------------------------------------------------- UDHAAR -------
  if (hasAny(low, KW.udhaar) && !hasAny(low, KW.stock)) {
    const c = cache['get_customer_credit::my']
      || cache['get_customer_credit::all']
      || cache['get_customer_credit::ledger'];
    if (!c) return { noData: true };
    const d = c.data || {};
    const customers: { name: string; due: number }[] = d.customers || [];
    if (customers.length === 1) {
      const body = t('offline_udhaar_one', lang)
        .replace('{name}', customers[0].name || '')
        .replace('{amount}', fmtNum(customers[0].due ?? 0, lang));
      return { answer: { text: `${t('offline_prefix', lang)}: ${body}`, lang, tool: 'get_customer_credit', cached: true } };
    }
    if (customers.length > 1) {
      const body = t('offline_udhaar_total', lang)
        .replace('{count}', fmtNum(d.count ?? customers.length, lang))
        .replace('{total}', fmtNum(d.total_due ?? 0, lang));
      return { answer: { text: `${t('offline_prefix', lang)}: ${body}`, lang, tool: 'get_customer_credit', cached: true } };
    }
    if (customers.length === 0) {
      return { answer: { text: `${t('offline_prefix', lang)}: ${t('offline_udhaar_none', lang)}`, lang, tool: 'get_customer_credit', cached: true } };
    }
    return { noData: true };
  }
  // ---------------------------------------------------------- STOCK --------
  if (hasAny(low, KW.stock)) {
    const product = matchProduct(text);
    if (product) {
      const c = cache[`get_inventory::${product}`];
      if (!c) return { noData: true };
      const d = c.data || {};
      const body = t('offline_stock_one', lang)
        .replace('{stock}', fmtNum(d.stock ?? 0, lang))
        .replace('{unit}', d.unit || 'kg')
        .replace('{product}', d.product || product);
      return { answer: { text: `${t('offline_prefix', lang)}: ${body}`, lang, tool: 'get_inventory', cached: true } };
    }
    const c = cache['get_inventory::all'];
    if (!c) return { noData: true };
    const d = c.data || {};
    const items: { name: string; stock: number; unit: string }[] = d.items || [];
    const top = items.slice(0, 3).map(i => `${i.name} ${fmtNum(i.stock, lang)} ${i.unit}`).join(', ');
    const body = t('offline_stock_all', lang)
      .replace('{count}', fmtNum(d.count ?? items.length, lang))
      .replace('{items}', top || '—');
    return { answer: { text: `${t('offline_prefix', lang)}: ${body}`, lang, tool: 'get_inventory', cached: true } };
  }
  return {};
}
