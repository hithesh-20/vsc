import React, { useState, useEffect, useRef } from 'react';
import { Megaphone, Volume2, VolumeX, RefreshCw, X, Play, Square, Sparkles, Bell, Radio, Check } from 'lucide-react';
import { sounds } from '../services/sound';
import { ALL_REGIONAL_LANGUAGES, VENDOR_TRANSLATIONS } from '../services/i18n';

interface StreetMegaphoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  vendorBusinessName: string;
  products: any[];
}

export const StreetMegaphoneModal: React.FC<StreetMegaphoneModalProps> = ({
  isOpen,
  onClose,
  language = 'kn',
  vendorBusinessName = 'Ramesh Fresh Vegetables',
  products = []
}) => {
  const t = VENDOR_TRANSLATIONS[language] || VENDOR_TRANSLATIONS.en || VENDOR_TRANSLATIONS.kn;
  const langConfig = ALL_REGIONAL_LANGUAGES.find(l => l.code === language) || ALL_REGIONAL_LANGUAGES[0];

  // Indian Street Vendor Calling Presets across Indian Regional Languages
  const getPresets = (lang: string) => {
    switch (lang) {
      case 'kn':
        return [
          { id: 'arrival', title: 'ಗಲ್ಲಿಗೆ ಆಗಮನ ', text: 'ತರಕಾರಿ ಬಂತು ತರಕಾರಿ! ತಾಜಾ ನಾಟಿ ಟೊಮೇಟೊ, ಈರುಳ್ಳಿ, ಆಲೂಗಡ್ಡೆ ಮನೆ ಬಾಗಿಲಿಗೆ ಬಂದಿವೆ! ಬನ್ನಿ ಅಮ್ಮ ಬನ್ನಿ!' },
          { id: 'evening', title: 'ಸಂಜೆ ಕ್ಲಿಯರೆನ್ಸ್ ', text: 'ಸಂಜೆ ವಿಶೇಷ ಕ್ಲಿಯರೆನ್ಸ್ ಸೇಲ್! ಎಲ್ಲಾ ತಾಜಾ ತರಕಾರಿಗಳ ಮೇಲೆ ಶೇಕಡ ಮೂವತ್ತು ಕಡಿತ! ಬೇಗ ಬನ್ನಿ!' },
          { id: 'fruits', title: 'ಸಿಹಿ ಹಣ್ಣುಗಳು ', text: 'ತಾಜಾ ಕಾಶ್ಮೀರಿ ಸೇಬು, ಏಲಕ್ಕಿ ಬಾಳೆಹಣ್ಣು ಮತ್ತು ದಾಳಿಂಬೆ ಹಣ್ಣುಗಳು ಅತ್ಯುತ್ತಮ ಸಗಟು ಬೆಲೆಯಲ್ಲಿ!' },
        ];
      case 'hi':
        return [
          { id: 'arrival', title: 'गली में आवाज़ ', text: 'आलू ले लो, प्याज़ ले लो, ताज़ा टमाटर! सीधे आज की मंडी से ताज़ा माल आपके घर के सामने!' },
          { id: 'evening', title: 'शाम की महा-सेल ', text: 'शाम की महा-सेल! सब माल खत्म करना है, सभी ताज़ी सब्जियों पर 30% भारी छूट! जल्दी आइये!' },
          { id: 'fruits', title: 'मीठे ताज़ा फल ', text: 'ताज़ा सेब, केले, अनार और मौसमी फल सबसे सस्ते दाम पर उपलब्ध हैं!' },
        ];
      case 'ta':
        return [
          { id: 'arrival', title: 'தெருவில் காய்கறி ', text: 'வணக்கம்! புதிய தக்காளி, வெங்காயம், உருளைக்கிழங்கு உங்கள் வீட்டு வாசலில்! வாங்கம்மா வாங்க!' },
          { id: 'evening', title: 'மாலை தள்ளுபடி ', text: 'மாலை நேர சிறப்பு தள்ளுபடி! அனைத்து காய்கறிகளுக்கும் 30% தள்ளுபடி! உடனே வாங்குங்கள்!' },
          { id: 'fruits', title: 'இனிப்பு பழங்கள் ', text: 'சுவையான ஆப்பிள், வாழைப்பழம் மற்றும் சீசன் பழங்கள் குறைந்த விலையில்!' },
        ];
      case 'te':
        return [
          { id: 'arrival', title: 'వీధి రాక ', text: 'రండి బాబు రండి! తాజా నాటు టమాటాలు, ఉల్లిపాయలు, బంగాళాదుంపలు మీ ఇంటి ముందుకు వచ్చాయి!' },
          { id: 'evening', title: 'సాయంత్రం క్లియరెన్స్ ', text: 'సాయంత్రం స్పెషల్ క్లియరెన్స్ సేల్! అన్ని కూరగాయలపై 30 శాతం భారీ తగ్గింపు!' },
          { id: 'fruits', title: 'తాజా పండ్లు ', text: 'తాజా ఆపిల్స్, అరటిపండ్లు మరియు సీజనల్ పండ్లు హోల్‌సేల్ ధరకు లభించును!' },
        ];
      case 'mr':
        return [
          { id: 'arrival', title: 'गल्लीत आगमन ', text: 'ताजी भाजी घ्या! कांदा, बटाटा, नाशिक टोमॅटो थेट शेतातून घरपोच! या ताई या!' },
          { id: 'evening', title: 'संध्याकाळ क्लिअरन्स ', text: 'संध्याकाळचा महासेल! सर्व भाज्यांवर 30% सवलत! लगेच घेऊन जा!' },
          { id: 'fruits', title: 'गोड फळे ', text: 'ताजी सफरचंद, केळी आणि मोसमी फळे अतिशय रास्त दरात उपलब्ध!' },
        ];
      case 'bn':
        return [
          { id: 'arrival', title: 'পাড়ায় তরকারি ', text: 'তাজা শাকসবজি ও ফলমূল নিয়ে এসেছি! আলু, পেঁয়াজ, তাজা টমেটো সেরা দামে!' },
          { id: 'evening', title: 'সন্ধ্যার ছাড় ', text: 'সন্ধ্যার বিশেষ ছাড়! সমস্ত তাজা সবজিতে ৩০% ছাড়! জলদি আসুন!' },
          { id: 'fruits', title: 'মিষ্টি ফল ', text: 'টাটকা আপেল, কলা এবং মরসুমি ফল কম দামে মিলছে!' },
        ];
      case 'gu':
        return [
          { id: 'arrival', title: 'શેરીમાં શાકભાજી ', text: 'શાકભાજી આવી ગઈ! તાજા દેશી ટામેટા, ડુંગળી, બટેટા સીધા મંડીથી સસ્તા ભાવે!' },
          { id: 'evening', title: 'સાંજનું ક્લિયરન્સ ', text: 'સાંજની મહાસેલ! બધી તાજી શાકભાજી પર 30% ભારે ડિસ્કાઉન્ટ! તરત પધારો!' },
          { id: 'fruits', title: 'મીઠા ફળો ', text: 'તાજા સફરજન, કેળા અને મોસમી ફળો એકદમ વ્યાજબી ભાવે!' },
        ];
      case 'pa':
        return [
          { id: 'arrival', title: 'ਗਲੀ ਵਿਚ ਹੋਕਾ ', text: 'ਤਾਜ਼ੀਆਂ ਸਬਜ਼ੀਆਂ ਲੈ ਲਓ ਜੀ! ਆਲੂ, ਪਿਆਜ਼, ਲਾਲ ਟਮਾਟਰ ਸਿੱਧੇ ਮੰਡੀ ਤੋਂ ਘਰ ਦੇ ਸਾਹਮਣੇ!' },
          { id: 'evening', title: 'ਸ਼ਾਮ ਦੀ ਛੋਟ ', text: 'ਸ਼ਾਮ ਦੀ ਮਹਾਂ ਸੇਲ! ਸਾਰੀਆਂ ਸਬਜ਼ੀਆਂ ਉੱਤੇ 30% ਭਾਰੀ ਛੋਟ! ਛੇਤੀ ਕਰੋ!' },
          { id: 'fruits', title: 'ਤਾਜ਼ੇ ਫਲ ', text: 'ਮਿੱਠੇ ਸੇਬ, ਕੇਲੇ ਅਤੇ ਮੌਸਮੀ ਫਲ ਥੋਕ ਭਾਅ ਤੇ ਮਿਲ ਰਹੇ ਹਨ!' },
        ];
      case 'ml':
        return [
          { id: 'arrival', title: 'തെരുവിൽ പച്ചക്കറി ', text: 'ഫ്രഷ് പച്ചക്കറികൾ എത്തി! തക്കാളി, ഉള്ളി, ഉരുളക്കിഴങ്ങ് നല്ല വിലയിൽ വാങ്ങൂ!' },
          { id: 'evening', title: 'വൈകുന്നേരത്തെ ഡിസ്കൗണ്ട് ', text: 'വൈകുന്നേരത്തെ പ്രത്യേക വിലക്കുറവ്! എല്ലാ പച്ചക്കറികൾക്കും 30% ഡിസ്കൗണ്ട്!' },
          { id: 'fruits', title: 'മധുര പഴങ്ങൾ ', text: 'ഫ്രഷ് ആപ്പിൾ, ഏത്തപ്പഴം മറ്റ് സീസണൽ പഴങ്ങൾ മിതമായ നിരക്കിൽ!' },
        ];
      default:
        return [
          { id: 'arrival', title: 'Street Arrival Call', text: 'Fresh mandi vegetables and sweet seasonal fruits right at your doorstep! Come and pick!' },
          { id: 'evening', title: 'Evening Flash Clearance ', text: 'Evening clearance sale! Special 30 percent discount on all fresh vegetables before sunset!' },
          { id: 'fruits', title: 'Sweet Seasonal Fruits', text: 'Sweet apples, bananas, and fresh seasonal fruits at wholesale APMC rates!' },
        ];
    }
  };

  const presets = getPresets(language);
  const [selectedText, setSelectedText] = useState(presets[0]?.text || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [loopIntervalSeconds, setLoopIntervalSeconds] = useState(15);
  const [customText, setCustomText] = useState('');
  const loopTimerRef = useRef<any>(null);

  // Stop playback when modal is closed
  useEffect(() => {
    if (!isOpen) {
      stopBroadcast();
    }
    return () => stopBroadcast();
  }, [isOpen]);

  const activeBroadcastText = customText.trim() ? customText : selectedText;

  const playSingleCycle = () => {
    sounds.playMegaphoneAnnouncement(activeBroadcastText, langConfig.langTag, () => {
      // Finished speaking
      if (isLooping && isPlaying) {
        loopTimerRef.current = setTimeout(() => {
          if (isPlaying) {
            playSingleCycle();
          }
        }, loopIntervalSeconds * 1000);
      } else {
        setIsPlaying(false);
      }
    });
  };

  const startBroadcast = () => {
    setIsPlaying(true);
    sounds.playStreetMegaphoneChime();
    setTimeout(() => {
      playSingleCycle();
    }, 400);
  };

  const stopBroadcast = () => {
    setIsPlaying(false);
    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white border-2 border-orange-300 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 text-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-orange-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <Megaphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-base text-white flex items-center space-x-1.5">
                <span>{t.megaphoneTitle || 'Digital Street Megaphone'}</span>
                <span className="text-xs">{langConfig.flag}</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {t.megaphoneSubtitle || 'Automatic loudspeaker calls for village lanes & street alleys'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { stopBroadcast(); onClose(); }}
            className="p-1.5 rounded-full text-slate-500 hover:text-white bg-orange-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Broadcast Status Banner */}
        <div className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
          isPlaying
            ? 'bg-gradient-to-r from-orange-950/70 to-amber-950/60 border-orange-500 text-orange-200'
            : 'bg-orange-50/50 border-orange-100 text-slate-500'
        }`}>
          <div className="flex items-center space-x-3">
            <span className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-orange-500 animate-ping' : 'bg-orange-400'}`} />
            <div>
              <span className="font-black text-xs block text-white">
                {isPlaying ? '📢 BROADCASTING ON LOUDSPEAKER' : 'Loudspeaker Standby (Mic Paused)'}
              </span>
              <span className="text-[10px] text-slate-500">
                {isPlaying ? `Looping every ${loopIntervalSeconds}s • Phone Speaker / Bluetooth Cart` : 'Select call preset or type below'}
              </span>
            </div>
          </div>

          <button
            onClick={isPlaying ? stopBroadcast : startBroadcast}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 shadow-lg active:scale-95 ${
              isPlaying
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 ring-2 ring-rose-400'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-orange-500/30'
            }`}
          >
            {isPlaying ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{isPlaying ? 'STOP' : 'START'}</span>
          </button>
        </div>

        {/* Audio Presets */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Preset Street Vendor Calls ({langConfig.name}):</span>
            <button
              type="button"
              onClick={() => sounds.playStreetMegaphoneChime()}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1 text-[10px]"
            >
              <Bell className="w-3 h-3" />
              <span>Test Bell Chime</span>
            </button>
          </label>

          <div className="space-y-1.5">
            {presets.map((preset) => (
              <div
                key={preset.id}
                onClick={() => {
                  setSelectedText(preset.text);
                  setCustomText('');
                  if (isPlaying) {
                    stopBroadcast();
                  }
                }}
                className={`p-3 rounded-2xl border text-xs cursor-pointer transition flex items-start justify-between space-x-2 ${
                  selectedText === preset.text && !customText.trim()
                    ? 'bg-orange-500/15 border-orange-500 text-orange-200 font-bold'
                    : 'bg-orange-50/50/80 border-orange-100 text-slate-700 hover:border-orange-200'
                }`}
              >
                <div>
                  <h5 className="font-black text-white text-xs mb-0.5">{preset.title}</h5>
                  <p className="text-[11px] text-slate-700 italic">"{preset.text}"</p>
                </div>
                {selectedText === preset.text && !customText.trim() && (
                  <Check className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Street Voice Call */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
            Custom Megaphone Announcement:
          </label>
          <input
            type="text"
            placeholder={`Type your custom cart call in ${langConfig.name}...`}
            value={customText}
            onChange={(e) => {
              setCustomText(e.target.value);
              if (isPlaying) stopBroadcast();
            }}
            className="w-full px-3 py-2.5 bg-orange-50/50 border border-orange-100 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500 font-bold"
          />
        </div>

        {/* Looping & Interval Settings */}
        <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <RefreshCw className={`w-4 h-4 ${isLooping && isPlaying ? 'animate-spin text-orange-400' : 'text-slate-500'}`} />
            <span className="font-bold text-slate-700">Continuous Street Loop</span>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={loopIntervalSeconds}
              onChange={(e) => setLoopIntervalSeconds(Number(e.target.value))}
              className="bg-white text-white font-bold text-xs px-2 py-1 rounded-lg border border-orange-100 outline-none"
            >
              <option value={10}>Every 10s</option>
              <option value={15}>Every 15s</option>
              <option value={30}>Every 30s</option>
              <option value={60}>Every 60s</option>
            </select>

            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`w-10 h-6 rounded-full transition flex items-center p-1 ${
                isLooping ? 'bg-orange-500 justify-end' : 'bg-orange-100 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
