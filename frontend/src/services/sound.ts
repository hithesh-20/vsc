// Web Audio API Synthesizer for rich interactive feedback & AI Soundbox
class SoundEffects {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Cash register chime on POS sale
  playCashRegister() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      
      osc2.frequency.setValueAtTime(1975.53, now + 0.08); // B6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch (_) {}
  }

  // Vendor arrival bicycle bell ring
  playVendorBell() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now); // A6
      osc.frequency.setValueAtTime(1760, now + 0.1);
      osc.frequency.setValueAtTime(2093, now + 0.15); // C7

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (_) {}
  }

  // Order success chime
  playSuccessChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, now + (i * 0.07));
        gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.07) + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + (i * 0.07));
        osc.stop(now + (i * 0.07) + 0.25);
      });
    } catch (_) {}
  }

  // 🔊 Street Cart Megaphone & Traditional Brass Bell Chime
  playStreetMegaphoneChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      
      // Brass Bell 1 (Higher ping)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(2093.00, now); // C7
      osc1.frequency.exponentialRampToValueAtTime(1760.00, now + 0.3); // A6
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Brass Bell 2 (Echo chime)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(2637.02, now + 0.12); // E7
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } catch (_) {}
  }

  // 🚨 Emergency Street Vendor Siren & Strobe Alarm
  playEmergencySiren() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      // Siren warble: 600Hz to 1200Hz back and forth
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.25);
      osc.frequency.linearRampToValueAtTime(650, now + 0.5);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.75);
      osc.frequency.linearRampToValueAtTime(650, now + 1.0);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.9);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.05);
    } catch (_) {}
  }

  // 📢 Looping Speech Megaphone Broadcast
  playMegaphoneAnnouncement(text: string, langTag: string = 'en-US', onEnded?: () => void) {
    this.playStreetMegaphoneChime();
    if ('speechSynthesis' in window) {
      setTimeout(() => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langTag;
        utterance.rate = 0.95; // Clear & loud street cadence
        utterance.pitch = 1.05;
        if (onEnded) {
          utterance.onend = onEnded;
          utterance.onerror = onEnded;
        }
        window.speechSynthesis.speak(utterance);
      }, 450);
    }
  }

  // 🔊 Micro-Vendor Smart Soundbox Payment Voice Speaker
  playPaymentSoundbox(amount: number, language: string = 'kn', currency: string = '₹') {
    this.playCashRegister();
    
    // Regional Soundbox Voice Announcements (Paytm / PhonePe Soundbox style)
    const SOUNDBOX_VOICE_MAP: { [key: string]: { text: string; langTag: string } } = {
      kn: { text: `ವೆಂಡರ್‌ಸಾಥಿ ಮೇಲೆ ${amount} ರೂಪಾಯಿ ಪಾವತಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ!`, langTag: 'kn-IN' },
      hi: { text: `VendorSaathi पर ${amount} रुपये प्राप्त हुए!`, langTag: 'hi-IN' },
      te: { text: `VendorSaathi లో ${amount} రూపాయలు అందాయి!`, langTag: 'te-IN' },
      ta: { text: `VendorSaathi யில் ${amount} ரூபாய் பெறப்பட்டது!`, langTag: 'ta-IN' },
      ml: { text: `VendorSaathi യിൽ ${amount} രൂപ ലഭിച്ചു!`, langTag: 'ml-IN' },
      mr: { text: `VendorSaathi वर ${amount} रुपये मिळाले!`, langTag: 'mr-IN' },
      bn: { text: `VendorSaathi তে ${amount} টাকা পাওয়া গেছে!`, langTag: 'bn-IN' },
      gu: { text: `VendorSaathi પર ${amount} રૂપિયા મળ્યા!`, langTag: 'gu-IN' },
      pa: { text: `VendorSaathi 'ਤੇ ${amount} ਰੁਪਏ ਪ੍ਰਾਪਤ ਹੋਏ!`, langTag: 'pa-IN' },
      en: { text: `${currency} ${amount} received successfully on VendorSaathi!`, langTag: 'en-US' },
      es: { text: `¡Pago de ${currency} ${amount} recibido con éxito en VendorSaathi!`, langTag: 'es-ES' },
      sw: { text: `Malipo ya ${currency} ${amount} yamepokelewa kwenye VendorSaathi!`, langTag: 'sw-KE' },
      fr: { text: `Paiement de ${currency} ${amount} reçu sur VendorSaathi !`, langTag: 'fr-FR' },
      id: { text: `Pembayaran ${currency} ${amount} berhasil diterima di VendorSaathi!`, langTag: 'id-ID' },
      pt: { text: `Pagamento de ${currency} ${amount} recebido com sucesso no VendorSaathi!`, langTag: 'pt-BR' },
      ar: { text: `تم استلام دفعة بقيمة ${currency} ${amount} بنجاح عبر VendorSaathi!`, langTag: 'ar-EG' },
    };

    if ('speechSynthesis' in window) {
      setTimeout(() => {
        const config = SOUNDBOX_VOICE_MAP[language] || SOUNDBOX_VOICE_MAP.en;
        const utterance = new SpeechSynthesisUtterance(config.text);
        utterance.lang = config.langTag;
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      }, 400);
    }
  }
}

export const sounds = new SoundEffects();

