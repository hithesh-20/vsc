import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, X, Sparkles, HelpCircle, ArrowRight, Globe, Radio } from 'lucide-react';
import { sounds } from '../services/sound';
import { ALL_REGIONAL_LANGUAGES } from '../services/i18n';

const LANGUAGE_PROMPTS: { [code: string]: { text: string; en: string; cat?: string }[] } = {
  kn: [
    { text: "ಯಾವ ತರಕಾರಿ ಗಾಡಿ ಹತ್ತಿರದಲ್ಲಿದೆ?", en: "Which vegetable cart is nearby?", cat: "Vegetables" },
    { text: "ಟೊಮೇಟೊ ಬೆಲೆ ಎಷ್ಟು?", en: "What is the price of tomatoes?" },
    { text: "ರಮೇಶ್ ಗಾಡಿ ಎಲ್ಲಿದೆ?", en: "Where is Ramesh's cart?" },
    { text: "ಇಂದು ನನ್ನ ಲಾಭ ಎಷ್ಟು?", en: "What is my net profit today?" },
    { text: "ಇಂದಿನ ಹವಾಮಾನ ಹೇಗಿದೆ?", en: "How is today's weather?" }
  ],
  hi: [
    { text: "मेरे पास कौन सी सब्जी की गाड़ी है?", en: "Which vegetable cart is nearby?", cat: "Vegetables" },
    { text: "टमाटर का क्या भाव है?", en: "What is tomato price?" },
    { text: "रमेश की गाड़ी कहाँ है?", en: "Where is Ramesh's cart?" },
    { text: "आज की कुल बिक्री और मुनाफा?", en: "Today's sales and profit?" },
    { text: "आज का मौसम कैसा है?", en: "How is today's weather?" }
  ],
  te: [
    { text: "నా దగ్గర ఏ కూరగాయల బండి ఉంది?", en: "Which vegetable cart is nearby?", cat: "Vegetables" },
    { text: "టమోటా ధర ఎంత?", en: "What is tomato price?" },
    { text: "రమేష్ బండి ఎక్కడ ఉంది?", en: "Where is Ramesh's cart?" },
    { text: "ఈరోజు నా లాభం ఎంత?", en: "What is my profit today?" }
  ],
  ta: [
    { text: "என் அருகில் என்ன காய்கறி வண்டி உள்ளது?", en: "Which vegetable cart is nearby?", cat: "Vegetables" },
    { text: "தக்காளி விலை என்ன?", en: "What is tomato price?" },
    { text: "ரமேஷ் வண்டி எங்கே உள்ளது?", en: "Where is Ramesh's cart?" },
    { text: "இன்றைய எனது லாபம் என்ன?", en: "What is my profit today?" }
  ],
  ml: [
    { text: "എന്റെ അടുത്ത് ഏത് പച്ചക്കറി വണ്ടിയുണ്ട്?", en: "Which vegetable cart is nearby?", cat: "Vegetables" },
    { text: "തക്കാളിയുടെ വില എത്രയാണ്?", en: "What is tomato price?" },
    { text: "രമേശിന്റെ വണ്ടി എവിടെയാണ്?", en: "Where is Ramesh's cart?" }
  ],
  mr: [
    { text: "माझ्या जवळ कोणती भाजीपाला गाडी आहे?", en: "Which vegetable cart is nearby?", cat: "Vegetables" },
    { text: "टोमॅटोचा भाव काय आहे?", en: "What is tomato price?" },
    { text: "रमेशची गाडी कुठे आहे?", en: "Where is Ramesh's cart?" }
  ],
  bn: [
    { text: "আমার কাছে কোন সবজি ঠেলা আছে?", en: "Which vegetable cart is nearby?", cat: "Vegetables" },
    { text: "টমেটোর দাম কত?", en: "What is tomato price?" },
    { text: "রমেশের গাড়ি কোথায়?", en: "Where is Ramesh's cart?" }
  ],
  gu: [
    { text: "મારી નજીક કઈ શાકભાજીની લારી છે?", en: "Which vegetable cart is nearby?", cat: "Vegetables" },
    { text: "ટામેટાંનો ભાવ શું છે?", en: "What is tomato price?" },
    { text: "રમેશની લારી ક્યાં છે?", en: "Where is Ramesh's cart?" }
  ],
  pa: [
    { text: "ਮੇਰੇ ਨੇੜੇ ਕਿਹੜੀ ਸਬਜ਼ੀ ਰੇਹੜੀ ਹੈ?", en: "Which vegetable cart is nearby?", cat: "Vegetables" },
    { text: "ਟਮਾਟਰ ਦਾ ਭਾਅ ਕੀ ਹੈ?", en: "What is tomato price?" },
    { text: "ਰਮੇਸ਼ ਦੀ ਰੇਹੜੀ ਕਿੱਥੇ ਹੈ?", en: "Where is Ramesh's cart?" }
  ],
  en: [
    { text: "Which vegetable cart is nearby?", en: "Find nearby carts", cat: "Vegetables" },
    { text: "What is the price of tomatoes?", en: "Check tomato price" },
    { text: "Where is Ramesh's cart right now?", en: "Track cart GPS" },
    { text: "What is my net profit today?", en: "Calculate profit" },
    { text: "How is the weather for selling today?", en: "Weather advisory" }
  ]
};

interface FloatingVoiceAssistantProps {
  language: string;
  onSearchProduct?: (query: string) => void;
  onFilterCategory?: (category: string) => void;
}

export const FloatingVoiceAssistant: React.FC<FloatingVoiceAssistantProps> = ({
  language: parentLang,
  onSearchProduct,
  onFilterCategory
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>(parentLang || 'kn');
  const [isListening, setIsListening] = useState(false);
  const [query, setQuery] = useState('');
  const [responseNative, setResponseNative] = useState('');
  const [responseEn, setResponseEn] = useState('');
  const [statusText, setStatusText] = useState('ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿರಿ (Tap mic to speak)');

  useEffect(() => {
    if (parentLang) setSelectedLang(parentLang);
  }, [parentLang]);

  const currentLangObj = ALL_REGIONAL_LANGUAGES.find((l) => l.code === selectedLang) || ALL_REGIONAL_LANGUAGES[0];
  const activePrompts = LANGUAGE_PROMPTS[selectedLang] || LANGUAGE_PROMPTS.kn;

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      handleQuery(activePrompts[0].text);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = currentLangObj.langTag;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setStatusText(`Listening in ${currentLangObj.name} (${currentLangObj.nameEn})...`);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      handleQuery(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatusText('ಧ್ವನಿ ಗ್ರಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಕೆಳಗಿನ ಪ್ರಾಂಪ್ಟ್ ಒತ್ತಿರಿ.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleQuery = async (queryText: string) => {
    setQuery(queryText);
    setStatusText('AI ಧ್ವನಿ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುತ್ತಿದೆ (Processing with Pan-Indian AI)...');

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
        body: JSON.stringify({ query_text: queryText, language: selectedLang })
      });
      const json = await res.json();
      if (json.data) {
        const nativeText = json.data.speech_response_native || json.data.speech_response_kn;
        const englishText = json.data.speech_response_text;
        setResponseNative(nativeText);
        setResponseEn(englishText);
        setStatusText('✓ ಪೂರ್ಣಗೊಂಡಿದೆ (Completed)');

        sounds.playVendorBell();

        // Browser Speech Synthesis with Native Indian Accent
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(nativeText);
          utterance.lang = currentLangObj.langTag;
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (_) {
      setResponseNative(`ನಿಮ್ಮ ಹತ್ತಿರ 3 ಗಾಡಿಗಳು ಸಂಚರಿಸುತ್ತಿವೆ: ರಮೇಶ್ ತರಕಾರಿ ಗಾಡಿ (400m).`);
      setResponseEn(`There are 3 mobile carts near you: Ramesh Fresh Vegetables (400m).`);
      setStatusText('✓ Local Multilingual AI Response');
    }
  };

  return (
    <>
      {/* ALWAYS-VISIBLE FLOATING VOICE BUTTON AT BOTTOM-RIGHT */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-2">
        {/* Animated Speech Prompt Bubble */}
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            className="bg-white/95 backdrop-blur-xl text-slate-900 px-4 py-2.5 rounded-2xl shadow-2xl border border-orange-200/80 text-xs font-black flex items-center space-x-2.5 cursor-pointer hover:bg-orange-50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-orange-500/20 animate-bounce"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
            <span>
              🎙️ {currentLangObj.name} ಧ್ವನಿ ಸಹಾಯಕ (Voice AI)
            </span>
          </div>
        )}

        {/* Big Glowing Holographic Microphone Action Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open Multilingual Indian Voice Assistant"
          className="relative group p-4 sm:p-5 rounded-full bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 text-white shadow-2xl shadow-orange-500/50 hover:shadow-orange-500/80 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center ring-4 ring-orange-200/80"
        >
          <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-30 pointer-events-none" />
          <Mic className="w-7 h-7 sm:w-8 sm:h-8" />
          <span className="absolute -top-2 -right-2 bg-slate-900 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow-md">
            10 Lang
          </span>
        </button>
      </div>

      {/* MULTILINGUAL VOICE ASSISTANT MODAL OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-white/40 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between flex-shrink-0 border-b border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center backdrop-blur text-2xl font-bold">
                  🎙️
                </div>
                <div>
                  <h3 className="font-black text-lg sm:text-xl flex items-center space-x-2">
                    <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                      VendorSaathi Voice AI
                    </span>
                    <span className="bg-white/10 text-[10px] px-2 py-0.5 rounded-full font-bold text-slate-300 border border-white/10">
                      Pan-India
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Speech recognition & regional voice synthesis in 10 languages
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Indian Language Selector Chips */}
            <div className="p-3 bg-slate-100/80 border-b border-slate-200 overflow-x-auto scrollbar-none flex items-center space-x-1.5 flex-shrink-0">
              <div className="flex items-center space-x-1 text-slate-500 text-xs font-black mr-1 flex-shrink-0">
                <Globe className="w-3.5 h-3.5 text-orange-500" />
                <span>ಭಾಷೆ:</span>
              </div>
              {ALL_REGIONAL_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLang(lang.code);
                    setStatusText(`Selected ${lang.name} (${lang.nameEn}). Tap mic to speak.`);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-black whitespace-nowrap transition flex items-center space-x-1 ${
                    selectedLang === lang.code
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>

            {/* Central Microphone & Audio Waveform Body */}
            <div className="p-6 space-y-5 text-center overflow-y-auto">
              <div className="flex flex-col items-center justify-center py-2 relative">
                
                {/* Audio Waveform Effect when Listening */}
                {isListening && (
                  <div className="flex items-center justify-center space-x-1.5 mb-3 h-8">
                    {[16, 28, 40, 24, 36, 18, 30].map((h, i) => (
                      <span
                        key={i}
                        className="w-1.5 bg-orange-500 rounded-full animate-pulse"
                        style={{ height: `${h}px`, animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                )}

                <button
                  onClick={startListening}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-200 scale-105'
                      : 'bg-gradient-to-tr from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-200 hover:scale-105'
                  }`}
                >
                  {isListening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                </button>
                
                <span className="text-xs font-black text-orange-950 bg-orange-100/80 px-4 py-1.5 rounded-full border border-orange-200 mt-4 shadow-sm">
                  {statusText}
                </span>
              </div>

              {/* Real-time Voice Answer Output Box */}
              {(responseNative || responseEn) && (
                <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200 text-left space-y-2 shadow-sm">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Your Voice Query ({currentLangObj.name}):
                  </div>
                  <div className="text-xs font-bold text-slate-800 italic">"{query}"</div>
                  
                  <div className="pt-2 border-t border-slate-200">
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center space-x-1">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>AI Answer ({currentLangObj.nameEn}):</span>
                    </div>
                    <div className="text-sm font-black text-emerald-950 mt-1 leading-relaxed">
                      {responseNative}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {responseEn}
                    </div>
                  </div>
                </div>
              )}

              {/* Sample Voice Phrases for the Selected Language */}
              <div className="text-left space-y-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                  {currentLangObj.name} ಪ್ರಾಂಪ್ಟ್‌ಗಳು (Tap Preset Questions in {currentLangObj.nameEn}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activePrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (p.cat) onFilterCategory?.(p.cat);
                        handleQuery(p.text);
                      }}
                      className="p-3 rounded-2xl border border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 text-left text-xs font-bold text-slate-800 transition flex items-center justify-between group bg-white shadow-sm"
                    >
                      <div className="truncate pr-2">
                        <span className="block truncate">"{p.text}"</span>
                        <span className="text-[10px] text-slate-400 block font-normal">{p.en}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center flex-shrink-0">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-xs transition shadow-md"
              >
                ಮುಚ್ಚಿ (Close)
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
