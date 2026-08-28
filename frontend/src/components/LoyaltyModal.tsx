import React from 'react';
import { X, Award, Gift, Sparkles, Check } from 'lucide-react';
import { LoyaltyData } from '../types';

interface LoyaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  loyalty: LoyaltyData | null;
  language: 'en' | 'kn';
}

export const LoyaltyModal: React.FC<LoyaltyModalProps> = ({
  isOpen,
  onClose,
  loyalty,
  language
}) => {
  if (!isOpen) return null;

  const points = loyalty?.points || 340;
  const tier = loyalty?.tier || 'SILVER';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Award className="w-6 h-6 text-amber-500" />
            <h3 className="text-xl font-extrabold text-slate-900">
              {language === 'kn' ? 'ಗ್ರಾಹಕರ ಲಾಯಲ್ಟಿ ಕ್ಲಬ್' : 'VendorSaathi Club'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tier Card */}
        <div className="my-6 p-6 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-xl shadow-orange-200">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-orange-200">
                {language === 'kn' ? 'ಪ್ರಸ್ತುತ ಹಂತ' : 'Current Tier'}
              </span>
              <h2 className="text-2xl font-extrabold mt-0.5">{tier} MEMBER</h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center font-black text-2xl">
              ⭐
            </div>
          </div>

          <div className="mt-6 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-orange-200">{language === 'kn' ? 'ಲಭ್ಯವಿರುವ ಅಂಕಗಳು' : 'Available Points'}</span>
              <div className="text-3xl font-black">{points} pts</div>
            </div>
            <div className="text-right">
              <span className="text-xs text-orange-200">{language === 'kn' ? 'ರಿಯಾಯಿತಿ ಮೌಲ್ಯ' : 'Redeemable Value'}</span>
              <div className="text-xl font-bold">₹{Math.floor(points / 10)}</div>
            </div>
          </div>
        </div>

        {/* Tier Perks */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
            {language === 'kn' ? 'ನಿಮ್ಮ ವಿಶೇಷ ಪ್ರಯೋಜನಗಳು' : 'Your Tier Benefits'}
          </h4>
          <div className="space-y-2">
            {[
              "Earn 1 Point on every ₹20 spent with local vendors",
              "Direct discount ₹10 off for every 100 points redeemed",
              "Free doorstep delivery priority from verified mobile vendors",
              "Support local rural and street vendors directly"
            ].map((perk, i) => (
              <div key={i} className="flex items-center space-x-2.5 text-xs text-slate-700">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>{perk}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition"
        >
          {language === 'kn' ? 'ಮುಚ್ಚಿ' : 'Got it'}
        </button>

      </div>
    </div>
  );
};
