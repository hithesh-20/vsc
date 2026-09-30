import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, X, Send, Square, Check, Loader2, Ear, EarOff, Radio, Navigation2, ReceiptText } from 'lucide-react';
import { ALL_REGIONAL_LANGUAGES } from '../services/i18n';
import { API_BASE } from '../services/api';
import {
  cacheVoiceAnswer,
  entityForCache,
  tryOfflineAnswer,
  offlineNoDataText,
  offlineRefusedText,
} from '../services/offlineAssistant';
import * as offlineSync from '../services/offlineSync';

// ---------------------------------------------------------------------------
// Auth token — works in both the customer app and the vendor dashboard
// ---------------------------------------------------------------------------
function getAuthToken(): string {
  try {
    const app = localStorage.getItem('vs_app_session');
    if (app) {
      const s = JSON.parse(app);
      if (s?.access_token) return s.access_token;
    }
  } catch { /* ignore */ }
  return localStorage.getItem('vs_vendor_token') || '';
}

interface OrderReceipt {
  order_number: string;
  product: string;
  quantity: number;
  unit: string;
  total: number;
  pending?: boolean;   // true = offline-queued, syncs when network returns
  mutationId?: string; // outbox id — lets us flip this card to CONFIRMED on sync
}

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  lang?: string;
  tool?: string | null;
  confirm?: boolean;
  offline?: boolean;   // rendered from on-device cache — not live data
  receipt?: OrderReceipt;
  streaming?: boolean; // words still arriving from /chat/stream
  digestLines?: string[]; // daily "✓ N actions synced" recap checklist
}

// Preset voice prompts per language (shown as tappable chips)
const SUGGESTIONS: { [code: string]: string[] } = {
  kn: ['ಇಂದಿನ ಮಾರಾಟ ಎಷ್ಟು?', 'ನನಗೆ 2 ಕೆಜಿ ಟೊಮೇಟೊ ಬೇಕು', 'ಟೊಮೇಟೊ ದಾಸ್ತಾನು ಎಷ್ಟು?', 'ಯಾರಿಗೆ ಬಾಕಿ ಇದೆ?', 'ಇಂದು ಮಳೆ ಬರುತ್ತಾ?', 'GST ಎಂದರೇನು?'],
  hi: ['आज की बिक्री कितनी है?', 'मुझे 2 किलो टमाटर चाहिए', 'टमाटर का स्टॉक कितना है?', 'किसका उधार बाकी है?', 'आज बारिश होगी?', 'GST क्या है?'],
  te: ['ఈరోజు అమ్మకాలు ఎంత?', 'నాకు 2 కిలోల టమోటాలు కావాలి', 'టమోటా స్టాక్ ఎంత?', 'ఎవరికి బాకీ ఉంది?', 'ఈరోజు వర్షం వస్తుందా?', 'GST అంటే ఏమిటి?'],
  ta: ['இன்றைய விற்பனை எவ்வளவு?', 'எனக்கு 2 கிலோ தக்காளி வேண்டும்', 'தக்காளி ஸ்டாக் எவ்வளவு?', 'யாருக்குக் கடன் இருக்கிறது?', 'இன்று மழை வருமா?', 'GST என்றால் என்ன?'],
  mr: ['आजची विक्री किती?', 'मला 2 किलो टोमॅटो हवे आहेत', 'टोमॅटोचा स्टॉक किती?', 'कोणाचे उधार बाकी आहे?', 'आज पाऊस पडेल का?', 'GST म्हणजे काय?'],
  bn: ['আজকের বিক্রি কত?', 'আমার 2 কেজি টমেটো দরকার', 'টমেটোর স্টক কত?', 'কার বাকি আছে?', 'আজ কি বৃষ্টি হবে?', 'GST কী?'],
  gu: ['આજનું વેચાણ કેટલું?', 'મને 2 કિલો ટામેટાં જોઈએ', 'ટામેટાંનો સ્ટોક કેટલો?', 'કોનું ઉધાર બાકી છે?', 'આજે વરસાદ આવશે?', 'GST એટલે શું?'],
  pa: ['ਅੱਜ ਦੀ ਵਿਕਰੀ ਕਿੰਨੀ ਹੈ?', 'ਮੈਨੂੰ 2 ਕਿਲੋ ਟਮਾਟਰ ਚਾਹੀਦੇ ਹਨ', 'ਟਮਾਟਰ ਦਾ ਸਟਾਕ ਕਿੰਨਾ ਹੈ?', 'ਕਿਸ ਦਾ ਬਾਕੀ ਹੈ?', 'ਅੱਜ ਮੀਂਹ ਪਵੇਗਾ?', 'GST ਕੀ ਹੈ?'],
  ml: ['ഇന്നത്തെ വിൽപ്പന എത്ര?', 'എനിക്ക് 2 കിലോ തക്കാളി വേണം', 'തക്കാളി സ്റ്റോക്ക് എത്ര?', 'ആർക്ക് കടം ബാക്കി?', 'ഇന്ന് മഴ വരുമോ?', 'GST എന്നാണ്?'],
  en: ["How much did I sell today?", "I need 2 kg tomato", "How much tomato stock do I have?", "Who owes me money?", "Will it rain today?", "What is GST?"],
};

// Words that trigger the hands-free wake session (transliterated + native scripts)
const WAKE_WORDS = ['saathi', 'sathi', 'saathy', 'ಸಾಥಿ', 'সাথি', 'साथी', 'సాథీ', 'சாதி'];
const wakeRegex = new RegExp(`\\b(${WAKE_WORDS.join('|')})\\b`, 'gi');

interface FloatingVoiceAssistantProps {
  language?: string;
  sessionToken?: string;
  /** Called when the vendor taps TRACK ORDER on a voice-order receipt card */
  onTrackOrder?: () => void;
  /** Controlled open state (e.g. the bottom-bar Voice tab opens the same
   *  panel). Uncontrolled when omitted — the FAB manages its own state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// "Queued order synced" confirmation per language (mirrors offlineAssistant texts)
const SYNCED_TEXT: { [code: string]: (orderNumber: string, total: string) => string } = {
  kn: (o, t) => `✓ ನಿಮ್ಮ ಆಫ್‌ಲೈನ್ ಆರ್ಡರ್ ಸೇರಿಸಲಾಗಿದೆ — ${o} · ₹${t}. ಟ್ರ್ಯಾಕ್ ಮಾಡಬಹುದು!`,
  hi: (o, t) => `✓ आपका ऑफ़लाइन ऑर्डर दर्ज हो गया — ${o} · ₹${t}. ट्रैक कर सकते हैं!`,
  te: (o, t) => `✓ మీ ఆఫ్‌లైన్ ఆర్డర్ నమోదైంది — ${o} · ₹${t}. ట్రాక్ చేయవచ్చు!`,
  ta: (o, t) => `✓ உங்கள் ஆஃப்லைன் ஆர்டர் பதிவாகிவிட்டது — ${o} · ₹${t}. கண்காணிக்கலாம்!`,
  mr: (o, t) => `✓ तुमचा ऑफलाइन ऑर्डर नोंदवला गेला — ${o} · ₹${t}. ट्रॅक करू शकता!`,
  bn: (o, t) => `✓ আপনার অফলাইন অর্ডার রেকর্ড হয়েছে — ${o} · ₹${t}. ট্র্যাক করতে পারেন!`,
  gu: (o, t) => `✓ તમારો ઓફલાઇન ઓર્ડર નોંધાયો — ${o} · ₹${t}. ટ્રેક કરી શકો!`,
  pa: (o, t) => `✓ ਤੁਹਾਡਾ ਆਫ਼ਲਾਈਨ ਆਰਡਰ ਦਰਜ ਹੋ ਗਿਆ — ${o} · ₹${t}. ਟਰੈਕ ਕਰ ਸਕਦੇ ਹਨ!`,
  ml: (o, t) => `✓ നിങ്ങളുടെ ഓഫ്‌ലൈൻ ഓർഡർ രേഖപ്പെടുത്തി — ${o} · ₹${t}. ട്രാക്ക് ചെയ്യാം!`,
  en: (o, t) => `✓ Your offline order synced — ${o} · ₹${t}. You can track it now!`,
};

// Daily "N actions synced" digest header per language (English for the rest)
const DIGEST_TEXT: { [code: string]: (n: number, date: string) => string } = {
  kn: (n, d) => `✓ ${d} — ಸರ್ವರ್ ${n} ಕ್ರಿಯೆಗಳನ್ನು ಸ್ವೀಕರಿಸಿದೆ. ಎಲ್ಲವೂ ಸುರಕ್ಷಿತ!`,
  hi: (n, d) => `✓ ${d} — सर्वर ने ${n} क्रियाएँ दर्ज कीं। सब सुरक्षित!`,
  te: (n, d) => `✓ ${d} — సర్వర్ ${n} చర్యలను అంగీకరించింది. అన్నీ సురక్షితం!`,
  ta: (n, d) => `✓ ${d} — சர்வர் ${n} செயல்களை ஏற்றது. எல்லாம் பாதுகாப்பு!`,
  mr: (n, d) => `✓ ${d} — सर्व्हरने ${n} कृती नोंदवल्या. सर्व सुरक्षित!`,
  bn: (n, d) => `✓ ${d} — সার্ভার ${n}টি অ্যাকশন গ্রহণ করেছে। সব নিরাপদ!`,
  gu: (n, d) => `✓ ${d} — સર્વરે ${n} ક્રિયાઓ નોંધી. બધું સુરક્ષિત!`,
  pa: (n, d) => `✓ ${d} — ਸਰਵਰ ਨੇ ${n} ਕਾਰਵਾਈਆਂ ਦਰਜ ਕੀਤੀਆਂ। ਸਭ ਸੁਰੱਖਿਅਤ!`,
  ml: (n, d) => `✓ ${d} — സെർവർ ${n} പ്രവർത്തനങ്ങൾ സ്വീകരിച്ചു. എല്ലാം സുരക്ഷിതം!`,
  en: (n, d) => `✓ ${d} — the server confirmed ${n} action${n === 1 ? '' : 's'} you made. All safe!`,
};

export const FloatingVoiceAssistant: React.FC<FloatingVoiceAssistantProps> = ({ language, sessionToken, onTrackOrder, open, onOpenChange }) => {
  const [isOpenState, setIsOpenState] = useState(false);
  // Controlled when `open` is provided; otherwise internal state (FAB mode).
  const isOpen = open !== undefined ? open : isOpenState;
  const setIsOpen = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === 'function' ? (v as (prev: boolean) => boolean)(isOpen) : v;
    if (open === undefined) setIsOpenState(next);
    onOpenChange?.(next);
  };
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [sttLang, setSttLang] = useState(language || 'kn');
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  // Wake-word ("Saathi") hands-free mode
  const [wakeOn, setWakeOn] = useState(false);
  const [wakeArmed, setWakeArmed] = useState(false); // armed = listening for the wake word

  const sessionIdRef = useRef(`voice-${Date.now().toString(36)}`);
  const recogRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const audioTimerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Wake-word listener refs
  const wakeRecRef = useRef<any>(null);
  const wakeOnRef = useRef(false);
  const wakeStopRef = useRef(false);
  const wakeArmedRef = useRef(false);
  const wakeRestartTimer = useRef<number | null>(null);
  const busyRef = useRef(false);
  const playingRef = useRef(false);
  const startWakeRef = useRef<() => void>(() => {});

  const token = sessionToken || getAuthToken();
  const langCfg = ALL_REGIONAL_LANGUAGES.find(l => l.code === sttLang) || ALL_REGIONAL_LANGUAGES[0];
  const srSupported = typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, interim, busy]);

  useEffect(() => () => {
    stopSpeaking();
    try { wakeRecRef.current?.abort?.(); } catch { /* ignore */ }
    if (wakeRestartTimer.current) window.clearTimeout(wakeRestartTimer.current);
    if (audioTimerRef.current) window.clearTimeout(audioTimerRef.current);
  }, []);

  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { busyRef.current = busy; }, [busy]);

  // ------------------------------------------------------------------ TTS ---
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    audioQueueRef.current = [];
    if (audioTimerRef.current) { window.clearTimeout(audioTimerRef.current); audioTimerRef.current = null; }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
  }, []);

  /** Play the next queued sentence audio, if the user hasn't stopped playback. */
  const playNextChunk = useCallback(() => {
    if (audioRef.current) return; // something is already playing
    const next = audioQueueRef.current.shift();
    if (!next) return;
    try {
      const el = new Audio(`data:audio/mp3;base64,${next}`);
      audioRef.current = el;
      el.onended = () => { audioRef.current = null; playNextChunk(); };
      el.onerror = () => { audioRef.current = null; playNextChunk(); };
      setPlaying(true);
      el.play().catch(() => { audioRef.current = null; playNextChunk(); });
    } catch {
      audioRef.current = null;
      playNextChunk();
    }
  }, []);

  const speak = useCallback((text: string, lang: string, audioB64?: string | null) => {
    stopSpeaking();
    // 1) Prefer the backend's human-quality TTS audio (gTTS)
    if (audioB64) {
      audioQueueRef.current = [audioB64];
      playNextChunk();
      return;
    }
    // 2) Browser speech synthesis fallback
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const cfg = ALL_REGIONAL_LANGUAGES.find(l => l.code === lang);
      u.lang = cfg?.langTag || 'en-IN';
      u.rate = 0.95;
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(v => v.lang === u.lang) || voices.find(v => v.lang?.startsWith(lang));
      if (match) u.voice = match;
      u.onstart = () => setPlaying(true);
      u.onend = () => setPlaying(false);
      window.speechSynthesis.speak(u);
    }
  }, [stopSpeaking, playNextChunk]);

  // ------------------------------------------------------------------ API ---
  // Streaming chat: reads the SSE event line-by-line so the UI paints each
  // word as it arrives and the FIRST sentence starts speaking immediately.
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busyRef.current) return;
    setError('');
    setInput('');
    setInterim('');
    stopSpeaking();
    wakeArmedRef.current = false;      // stop wake detection while we handle this
    setWakeArmed(false);
    setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
    setBusy(true);
    busyRef.current = true;

    let assistantIdx = -1;
    let streamText = '';
    let replyLang = sttLang;
    let firstChunkPlayed = false;
    let finalEvent: any = null;

    const appendDelta = (word: string) => {
      streamText += (streamText ? ' ' : '') + word;
      setMessages(prev => {
        let idx = prev.findIndex(m => m.role === 'assistant' && m.streaming);
        if (idx === -1) {
          return [...prev, { role: 'assistant', text: streamText, streaming: true, lang: replyLang }];
        }
        const next = [...prev];
        next[idx] = { ...next[idx], text: streamText, lang: replyLang };
        return next;
      });
    };

    try {
      const res = await fetch(`${API_BASE}/voice/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: trimmed, session_id: sessionIdRef.current, language: sttLang }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let done = false;
      while (!done) {
        const { value, done: rDone } = await reader.read();
        if (rDone) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith('data: ')) continue;
          let evt: any;
          try { evt = JSON.parse(line.slice(6)); } catch { continue; }

          if (evt.type === 'meta') {
            replyLang = evt.language || sttLang;
            if (replyLang) setSttLang(replyLang);
          } else if (evt.type === 'delta') {
            appendDelta(evt.text || '');
          } else if (evt.type === 'audio_chunk') {
            // Queue each sentence; start playing the FIRST one immediately —
            // no waiting for the rest of the reply.
            audioQueueRef.current.push(evt.audio_base64);
            if (!firstChunkPlayed && !audioRef.current) {
              firstChunkPlayed = true;
              playNextChunk();
            } else if (!audioRef.current && !playingRef.current) {
              playNextChunk();
            }
          } else if (evt.type === 'error') {
            throw new Error(evt.detail || 'stream error');
          } else if (evt.type === 'final') {
            finalEvent = evt;
            done = true;
          }
        }
      }

      if (!finalEvent) throw new Error('stream ended early');

      const d = finalEvent;
      const data = d.data || {};
      const receipt: OrderReceipt | undefined = data.ok && data.order_number && data.product
        ? {
            order_number: data.order_number,
            product: data.product,
            quantity: data.quantity ?? 1,
            unit: data.unit || '',
            total: data.total ?? 0,
          }
        : undefined;

      // Cache successful data answers so they can be replayed offline later
      if (d.tool_used) {
        cacheVoiceAnswer(d.tool_used, entityForCache(d.tool_used, trimmed, data), d.response, d.language || sttLang, data);
      }

      setMessages(prev => {
        const idx = prev.findIndex(m => m.role === 'assistant' && m.streaming);
        const finalized: ChatMsg = {
          role: 'assistant',
          text: d.response,
          lang: d.language,
          tool: d.tool_used,
          confirm: !!d.requires_confirmation,
          receipt,
          streaming: false,
        };
        if (idx === -1) return [...prev, finalized];
        const next = [...prev];
        next[idx] = finalized;
        return next;
      });

      // If sentence audio never arrived (offline gTTS etc.), speak the whole reply
      if (!firstChunkPlayed && !audioRef.current && !playingRef.current) {
        speak(d.response, d.language, null);
      }
    } catch (e) {
      // -------- Offline fallback: answer from the on-device cache --------
      setMessages(prev => prev.filter(m => !(m.role === 'assistant' && m.streaming)));
      const out = tryOfflineAnswer(trimmed, sttLang);
      if (out.queued) {
        // -------- Money action recorded in the offline outbox --------
        const q = out.queued;
        const queuedId = offlineSync.enqueue(q.type, q.payload);
        const item = q.payload.items?.[0];
        setMessages(prev => [...prev, {
          role: 'assistant', text: q.text, lang: q.lang, tool: null, offline: true,
          receipt: q.type === 'ORDER_CREATE' && item ? {
            order_number: 'QUEUED',
            product: item.product_name,
            quantity: item.quantity,
            unit: item.unit, total: 0, pending: true,
            mutationId: queuedId,
          } : undefined,
        }]);
        speak(q.text, q.lang);
      } else if (out.answer) {
        const a = out.answer;
        setMessages(prev => [...prev, { role: 'assistant', text: a.text, lang: a.lang, tool: null, offline: true }]);
        speak(a.text, a.lang);
      } else if (out.refused) {
        const msg = offlineRefusedText(sttLang);
        setMessages(prev => [...prev, { role: 'assistant', text: msg, lang: sttLang, tool: null, offline: true }]);
        speak(msg, sttLang);
      } else if (out.noData) {
        const msg = offlineNoDataText(sttLang);
        setMessages(prev => [...prev, { role: 'assistant', text: msg, lang: sttLang, tool: null, offline: true }]);
        speak(msg, sttLang);
      } else {
        setError('Connection failed — please try again.');
      }
    } finally {
      setBusy(false);
      busyRef.current = false;
      // Re-arm the wake-word listener for the next hands-free command
      if (wakeOnRef.current && !wakeStopRef.current) {
        wakeArmedRef.current = true;
        setWakeArmed(true);
        startWakeRef.current();
      }
    }
  }, [token, sttLang, speak, stopSpeaking, playNextChunk]);

  // ------------------------------------------------------- WAKE WORD MODE ---
  // Continuous "Saathi" listening: the recognizer auto-restarts every time it
  // ends, watching for the wake word. NOTE: browsers pause the microphone when
  // the tab/app is backgrounded, so hands-free works while the app is on
  // screen (e.g. phone mounted on the handlebar), not with the screen fully off.
  const restartWakeLoop = useCallback(() => {
    if (wakeRestartTimer.current) window.clearTimeout(wakeRestartTimer.current);
    wakeRestartTimer.current = window.setTimeout(() => {
      if (wakeStopRef.current || !wakeOnRef.current) return;
      if (playingRef.current) { restartWakeLoop(); return; }         // wait for TTS to finish
      if (document.visibilityState !== 'visible') { restartWakeLoop(); return; } // retry when visible
      startWakeRef.current();
    }, 900);
  }, []);

  const startWakeListener = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try { wakeRecRef.current?.abort?.(); } catch { /* ignore */ }
    const rec = new SR();
    wakeRecRef.current = rec;
    rec.lang = langCfg.langTag;
    rec.continuous = true;        // keep the mic open between commands
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      let finalText = '';
      let partial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else partial += r[0].transcript;
      }
      const heard = (finalText + ' ' + partial).trim();
      setInterim(wakeArmedRef.current && heard ? `👂 ${heard}` : '');
      if (!wakeArmedRef.current || busyRef.current || playingRef.current) return;
      if (!finalText) return;
      const cleaned = finalText.replace(wakeRegex, ' ').replace(/\s+/g, ' ').trim();
      wakeArmedRef.current = false;
      setWakeArmed(false);
      setInterim('');
      if (cleaned.length >= 4) {
        send(cleaned);        // "Saathi, how much did I sell?" → question directly
      } else {
        send("How much did I sell today?"); // bare "Saathi!" → status summary
      }
    };
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wakeStopRef.current = true;
        wakeOnRef.current = false;
        setWakeOn(false);
        setWakeArmed(false);
        setError('Microphone blocked — allow mic access for hands-free mode.');
      }
    };
    rec.onend = () => {
      setListening(false);
      // Chrome ends continuous sessions periodically — restart automatically
      restartWakeLoop();
    };
    rec.onstart = () => setListening(true);
    rec.start();
  }, [langCfg, send, restartWakeLoop]);

  useEffect(() => { startWakeRef.current = startWakeListener; }, [startWakeListener]);

  // Browsers kill recognition when the tab is hidden — resume when visible again
  useEffect(() => {
    if (!wakeOn) return;
    const onVis = () => {
      if (document.visibilityState === 'visible' && wakeOnRef.current && !wakeStopRef.current && !busyRef.current && !playingRef.current) {
        restartWakeLoop();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [wakeOn, restartWakeLoop]);

  // ----------------- "your offline order synced" confirmation -----------------
  // The moment the outbox drain confirms a queued voice order (in-app flush OR
  // the service worker flushing after the app was closed), tell the vendor
  // right here in the chat with the REAL order number and total — and flip
  // the amber ⏳ QUEUED receipt card to a green CONFIRMED one.
  const sttLangRef = useRef(sttLang);
  useEffect(() => { sttLangRef.current = sttLang; }, [sttLang]);

  const speakRef = useRef(speak);
  useEffect(() => { speakRef.current = speak; }, [speak]);

  useEffect(() => {
    const off = offlineSync.onSyncComplete((actions) => {
      for (const a of actions) {
        if (a.type === 'ORDER_CREATE') {
          if (!a.orderNumber) continue; // SW background flush: ids only, no number available
          const lang = sttLangRef.current;
          const total = a.total != null ? String(a.total) : '?';
          const text = (SYNCED_TEXT[lang] || SYNCED_TEXT.en)(a.orderNumber, total);
          setMessages(prev => {
            const next = [...prev];
            const idx = next.findIndex(m => m.receipt?.pending && m.receipt.mutationId === a.client_mutation_id);
            if (idx !== -1) {
              // Upgrade the amber ⏳ QUEUED card in place → green CONFIRMED
              next[idx] = {
                ...next[idx],
                text,
                receipt: {
                  ...next[idx].receipt!,
                  order_number: a.orderNumber!,
                  total: a.total ?? 0,
                  pending: false,
                },
              };
              return next;
            }
            return [...next, { role: 'assistant', text, lang, tool: null, offline: false }];
          });
          speakRef.current(text, sttLangRef.current);
        } else {
          const lang = sttLangRef.current;
          const text = lang === 'kn'
            ? `✓ ಆಫ್‌ಲೈನ್ ${a.kind} ಸೇರಿಸಲಾಗಿದೆ — ${a.label}`
            : lang === 'hi'
              ? `✓ ऑफ़लाइन ${a.kind} दर्ज हो गया — ${a.label}`
              : `✓ Offline ${a.kind} synced — ${a.label}`;
          setMessages(prev => [...prev, { role: 'assistant', text, lang, tool: null, offline: false }]);
        }
      }
    });
    return off;
  }, []);

  // ----------------- daily "✓ N actions synced" digest -----------------
  // When the vendor opens the assistant, one short recap of everything the
  // server confirmed today (from the device sync log) — so even vendors who
  // never open the audit screen hear "your work reached the cloud". Shown at
  // most once per day (vs_digest_done_v1 marker) and never repeated mid-day,
  // even across reloads.
  const DIGEST_KEY = 'vs_digest_done_v1';
  const buildDigest = useCallback(() => {
    const today = new Date().toDateString();
    try {
      if (localStorage.getItem(DIGEST_KEY) === today) return null;
    } catch { /* marker unavailable — show digest every open */ }
    const todays = offlineSync.syncLog().filter((e) => new Date(e.at).toDateString() === today);
    const actions = todays.flatMap((e) => e.actions);
    if (!actions.length) return null;
    const lang = sttLangRef.current;
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
    const head = (DIGEST_TEXT[lang] || DIGEST_TEXT.en)(actions.length, dateStr);
    const lines = actions.slice(0, 5).map((a) =>
      a.type === 'ORDER_CREATE' && a.orderNumber
        ? `${a.kind} — ${a.orderNumber}${a.total != null ? ` · ₹${a.total}` : ''}`
        : `${a.kind} — ${a.label}`
    );
    if (actions.length > 5) lines.push(`+${actions.length - 5} more`);
    try { localStorage.setItem(DIGEST_KEY, today); } catch { /* non-persistent — fine */ }
    return { head, lines, count: actions.length };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const digest = buildDigest();
    if (!digest) return;
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant' as const,
        text: digest.head,
        lang: sttLangRef.current,
        tool: null,
        offline: false,
        digestLines: digest.lines,
      },
    ]);
  }, [isOpen, buildDigest]);

  const stopWakeWord = useCallback(() => {
    wakeStopRef.current = true;
    wakeOnRef.current = false;
    wakeArmedRef.current = false;
    setWakeOn(false);
    setWakeArmed(false);
    setInterim('');
    try { wakeRecRef.current?.abort?.(); } catch { /* ignore */ }
    if (wakeRestartTimer.current) window.clearTimeout(wakeRestartTimer.current);
  }, []);

  const toggleWake = () => {
    if (wakeOnRef.current) { stopWakeWord(); return; }
    if (!srSupported) {
      setError('Voice input is not supported in this browser — please type instead.');
      return;
    }
    wakeStopRef.current = false;
    wakeOnRef.current = true;
    setWakeOn(true);
    setWakeArmed(true);
    wakeArmedRef.current = true;
    stopSpeaking();
    startWakeRef.current();
  };

  const handleTrackOrder = () => {
    stopSpeaking();
    onTrackOrder?.();
  };

  // ------------------------------------------------------------------ STT ---
  const startListening = () => {
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    stopSpeaking();
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError('Voice input is not supported in this browser — please type instead.');
      return;
    }
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    const rec = new SR();
    recogRef.current = rec;
    rec.lang = langCfg.langTag;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => { setListening(true); setError(''); };
    rec.onresult = (e: any) => {
      let finalText = '';
      let partial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else partial += r[0].transcript;
      }
      setInterim(partial);
      if (finalText) {
        setInterim('');
        setListening(false);
        send(finalText);
      }
    };
    rec.onerror = (e: any) => {
      setListening(false);
      if (e.error !== 'aborted') setError('Could not hear you — tap the mic and try again.');
    };
    rec.onend = () => setListening(false);
    rec.start();
  };

  const confirm = (answer: 'yes' | 'no') => send(answer);

  // ----------------------------------------------------------------- UI ----
  const suggestions = SUGGESTIONS[sttLang] || SUGGESTIONS.en;
  const anyStreaming = messages.some(m => m.streaming);

  return (
    <>
      {/* Floating action button */}
      <div className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="mb-2 bg-white/95 backdrop-blur-xl text-slate-900 px-4 py-2.5 rounded-2xl shadow-2xl border border-orange-200/80 text-xs font-black flex items-center space-x-2.5 cursor-pointer hover:bg-orange-50 transition-all"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
            <span>🎙️ Ask Saathi AI</span>
          </button>
        )}
        <button
          onClick={() => { setIsOpen(!isOpen); stopSpeaking(); }}
          aria-label="Open VendorSaathi AI voice assistant"
          className="relative p-4 sm:p-5 rounded-full bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 text-white shadow-2xl shadow-orange-500/50 hover:shadow-orange-500/80 hover:scale-105 active:scale-95 transition-all"
        >
          {!isOpen && <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-25 pointer-events-none" />}
          <Mic className="w-7 h-7 sm:w-8 sm:h-8" />
          <span className="absolute -top-2 -right-2 bg-slate-900 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow-md">
            AI
          </span>
        </button>
      </div>

      {/* Chat modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-xl">🎙️</div>
                <div>
                  <h3 className="font-black text-base sm:text-lg flex items-center space-x-2">
                    <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">Ask Saathi AI</span>
                    <span className="bg-white/10 text-[10px] px-2 py-0.5 rounded-full font-bold text-slate-300 border border-white/10">{ALL_REGIONAL_LANGUAGES.length} languages</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Say “Saathi” hands-free, or speak / type anything</p>
                </div>
              </div>
              <button onClick={() => { setIsOpen(false); stopSpeaking(); stopWakeWord(); recogRef.current?.stop?.(); }} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language chips (STT hint) */}
            <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 overflow-x-auto flex items-center space-x-1.5 flex-shrink-0">
              {ALL_REGIONAL_LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setSttLang(l.code); }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-black whitespace-nowrap transition ${sttLang === l.code ? 'bg-orange-500 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'}`}
                >
                  {l.name}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 to-white">
              {messages.length === 0 && !busy && (
                <div className="text-center py-8 space-y-3">
                  <div className="text-5xl">🎙️</div>
                  <p className="text-sm font-bold text-slate-700">Tap the mic — or tap 🦻 and just say “Saathi”.</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Hands-free mode keeps listening for the wake word “Saathi”. Then speak your question in the same breath — orders, sales, stock, udhaar. Works while the app is on screen (mount your phone on the cart or handlebar).
                  </p>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user'
                    ? 'bg-orange-500 text-white rounded-br-md font-semibold'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md font-semibold'}`}>
                    {m.text}
                    {m.streaming && (
                      <span className="inline-flex items-center gap-0.5 ml-1.5 align-middle">
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                      </span>
                    )}
                    {m.role === 'assistant' && !m.streaming && (
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                        {m.offline ? (
                          <span className="text-[10px] font-black text-amber-600 flex items-center gap-1">📴 offline — last synced</span>
                        ) : m.tool && m.tool !== 'knowledge' ? (
                          <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> live data</span>
                        ) : <span />}
                        <button onClick={() => { stopSpeaking(); speak(m.text, m.lang || 'en'); }} className="text-[10px] font-bold text-orange-600 flex items-center gap-1 hover:text-orange-700">
                          <Volume2 className="w-3.5 h-3.5" /> Play
                        </button>
                      </div>
                    )}

                    {/* -------- Voice order receipt card -------- */}
                    {m.receipt && (
                      <div className={`mt-2.5 rounded-2xl border bg-gradient-to-br to-white overflow-hidden ${m.receipt.pending ? 'border-amber-300 from-amber-50' : 'border-emerald-200 from-emerald-50'}`}>
                        <div className={`px-3.5 py-2 text-white flex items-center justify-between ${m.receipt.pending ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                          <span className="text-[11px] font-black tracking-wide flex items-center gap-1.5"><ReceiptText className="w-3.5 h-3.5" /> ORDER RECEIPT</span>
                          <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                            {m.receipt.pending ? '⏳ QUEUED — OFFLINE' : 'CONFIRMED'}
                          </span>
                        </div>
                        <div className="px-3.5 py-2.5 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-500">{m.receipt.pending ? 'STATUS' : 'ORDER NO'}</span>
                            <span className="font-black text-slate-800 tracking-wide">
                              {m.receipt.pending ? 'Syncs when back online' : m.receipt.order_number}
                            </span>
                          </div>
                          <div className="border-t border-dashed border-slate-200" />
                          <div className="flex items-center justify-between text-sm font-bold text-slate-800">
                            <span>{m.receipt.product} × {m.receipt.quantity} {m.receipt.unit}</span>
                            <span className={`font-black ${m.receipt.pending ? 'text-amber-600' : 'text-emerald-700'}`}>
                              {m.receipt.pending ? '₹—' : `₹${m.receipt.total}`}
                            </span>
                          </div>
                        </div>
                        {!m.receipt.pending && (
                          <button
                            onClick={handleTrackOrder}
                            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center justify-center gap-1.5 transition"
                          >
                            <Navigation2 className="w-3.5 h-3.5 text-amber-300" /> TRACK ORDER
                          </button>
                        )}
                      </div>
                    )}

                    {/* -------- Daily sync digest checklist -------- */}
                    {m.digestLines && m.digestLines.length > 0 && (
                      <div className="mt-2.5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white overflow-hidden">
                        <div className="px-3.5 py-2 bg-emerald-600 text-white flex items-center justify-between">
                          <span className="text-[11px] font-black tracking-wide">✓ SYNC RECORD — TODAY</span>
                          <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{m.digestLines.length} item(s)</span>
                        </div>
                        <div className="px-3.5 py-2 space-y-1">
                          {m.digestLines.map((line, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[11px] font-bold text-slate-700">
                              <Check className="w-3 h-3 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span className="truncate">{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.confirm && !m.offline && (
                      <div className="flex gap-2 mt-2.5">
                        <button onClick={() => confirm('yes')} disabled={busy} className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1 transition">
                          <Check className="w-3.5 h-3.5" /> Yes / ಹೌದು
                        </button>
                        <button onClick={() => confirm('no')} disabled={busy} className="flex-1 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 text-xs font-black transition">
                          No / ಇಲ್ಲ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {interim && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-orange-300/60 text-white text-sm italic">{interim}…</div>
                </div>
              )}

              {busy && !anyStreaming && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-slate-200 shadow-sm">
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
              )}
            </div>

            {/* Suggestions */}
            <div className="px-3 pb-1 pt-2 bg-white border-t border-slate-100 overflow-x-auto flex items-center gap-1.5 flex-shrink-0">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => send(s)} disabled={busy}
                  className="px-2.5 py-1 rounded-full border border-slate-200 hover:border-orange-400 hover:bg-orange-50 text-[11px] font-bold text-slate-700 whitespace-nowrap transition disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>

            {/* Input bar */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 flex-shrink-0">
              <button
                onClick={startListening}
                className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all shadow-md ${listening ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200' : 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white hover:scale-105'}`}
                aria-label={listening ? 'Stop listening' : 'Start listening'}
              >
                {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleWake}
                disabled={!srSupported}
                title={wakeOn ? 'Hands-free ON — say “Saathi”' : 'Enable hands-free “Saathi” wake word'}
                className={`relative w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all shadow-md disabled:opacity-40 ${wakeOn ? 'bg-emerald-600 text-white ring-4 ring-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'}`}
                aria-label={wakeOn ? 'Disable hands-free wake word' : 'Enable hands-free wake word'}
              >
                {wakeOn && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30 pointer-events-none" />}
                {wakeOn ? <Ear className="w-5 h-5" /> : <EarOff className="w-5 h-5" />}
              </button>
              {playing && (
                <button onClick={stopSpeaking} className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-900 text-white shadow-md hover:bg-slate-700 transition" aria-label="Stop speaking">
                  <Square className="w-4 h-4" />
                </button>
              )}
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send(input); }}
                placeholder={`Type or speak in ${langCfg.nameEn}…`}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm font-semibold"
              />
              <button
                onClick={() => send(input)}
                disabled={busy || !input.trim()}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white shadow-md transition"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Wake-word status strip */}
            {wakeOn && (
              <div className={`px-3 py-1.5 flex items-center gap-2 text-[11px] font-black flex-shrink-0 ${wakeArmed ? 'bg-emerald-50 text-emerald-700 border-t border-emerald-100' : 'bg-amber-50 text-amber-700 border-t border-amber-100'}`}>
                <Radio className={`w-3.5 h-3.5 ${wakeArmed ? 'animate-pulse' : ''}`} />
                {wakeArmed
                  ? 'Hands-free listening — say “Saathi” then your question'
                  : 'Hands-free paused — re-arming after this reply…'}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
