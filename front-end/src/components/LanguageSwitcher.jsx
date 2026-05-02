import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const LANGUAGES = [
  { code: 'tr', flag: '🇹🇷', label: 'TR', native: 'Türkçe' },
  { code: 'en', flag: '🇬🇧', label: 'EN', native: 'English' },
  { code: 'fr', flag: '🇫🇷', label: 'FR', native: 'Français' },
  { code: 'es', flag: '🇪🇸', label: 'ES', native: 'Español' },
  { code: 'ru', flag: '🇷🇺', label: 'RU', native: 'Русский' },
  { code: 'ja', flag: '🇯🇵', label: 'JA', native: '日本語' },
  { code: 'zh', flag: '🇨🇳', label: 'ZH', native: '中文' },
  { code: 'ko', flag: '🇰🇷', label: 'KO', native: '한국어' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const currentCode = LANGUAGES.find(l => i18n.language?.startsWith(l.code))?.code ?? 'tr';
  const current = LANGUAGES.find(l => l.code === currentCode) ?? LANGUAGES[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="lang-switcher" ref={ref}>
      <button
        className="lang-switcher__toggle"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
      >
        <span className="lang-switcher__flag">{current.flag}</span>
        <span className="lang-switcher__label">{current.label}</span>
        <span className="lang-switcher__arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="lang-switcher__dropdown" role="listbox">
          {LANGUAGES.map(lang => (
            <li
              key={lang.code}
              role="option"
              aria-selected={lang.code === currentCode}
              className={`lang-switcher__option${lang.code === currentCode ? ' lang-switcher__option--active' : ''}`}
              onClick={() => select(lang.code)}
            >
              <span className="lang-switcher__flag">{lang.flag}</span>
              <span className="lang-switcher__native">{lang.native}</span>
              <span className="lang-switcher__code">{lang.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
