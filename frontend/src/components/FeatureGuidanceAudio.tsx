import React from 'react';
import { Volume2 } from 'lucide-react';
import { sounds } from '../services/sound';

interface FeatureGuidanceAudioProps {
  titleKn: string;
  titleEn: string;
  explanationKn: string;
  explanationEn: string;
  language: 'en' | 'kn';
}

export const FeatureGuidanceAudio: React.FC<FeatureGuidanceAudioProps> = ({
  titleKn,
  titleEn,
  explanationKn,
  explanationEn,
  language
}) => {
  const speakGuidance = (e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playVendorBell();

    if ('speechSynthesis' in window) {
      const text = language === 'kn' ? explanationKn : explanationEn;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'kn' ? 'kn-IN' : 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <button
      onClick={speakGuidance}
      title="Tap to hear voice guidance"
      className="p-1 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 transition flex items-center justify-center"
    >
      <Volume2 className="w-3.5 h-3.5" />
    </button>
  );
};
