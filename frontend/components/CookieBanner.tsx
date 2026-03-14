import React, { useState } from 'react';

interface CookieBannerProps {
  isDark?: boolean;
  lang?: 'FR' | 'EN';
}

const CookieBanner: React.FC<CookieBannerProps> = ({ isDark = false, lang = 'FR' }) => {
  const [visible, setVisible] = useState(() => {
    return localStorage.getItem('cookieConsent') === null;
  });

  if (!visible) return null;

  const accept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setVisible(false);
  };

  const refuse = () => {
    localStorage.setItem('cookieConsent', 'refused');
    setVisible(false);
  };

  const text = {
    title: { FR: 'Utilisation des cookies', EN: 'Cookie usage' },
    body: {
      FR: "Ce site utilise des cookies pour assurer le bon fonctionnement de l'application SECOMO et améliorer votre expérience.",
      EN: 'This site uses cookies to ensure the proper functioning of the SECOMO application and improve your experience.',
    },
    accept: { FR: 'Accepter', EN: 'Accept' },
    refuse: { FR: 'Refuser', EN: 'Decline' },
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-sm mx-4 rounded-3xl border shadow-2xl p-8 space-y-5 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-5xl">🍪</span>
          <h2 className={`text-lg font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {text.title[lang]}
          </h2>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {text.body[lang]}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={refuse}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {text.refuse[lang]}
          </button>
          <button
            onClick={accept}
            className="flex-1 py-3 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all"
          >
            {text.accept[lang]}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
