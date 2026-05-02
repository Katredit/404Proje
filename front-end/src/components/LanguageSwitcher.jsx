import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('tr') ? 'tr' : 'en';

  const toggle = () => {
    i18n.changeLanguage(current === 'tr' ? 'en' : 'tr');
  };

  return (
    <button
      className="lang-switcher"
      onClick={toggle}
      title={current === 'tr' ? 'Switch to English' : "Türkçe'ye geç"}
      aria-label="Change language"
    >
      <span className="lang-switcher__flag">
        {current === 'tr' ? '🇬🇧' : '🇹🇷'}
      </span>
      <span className="lang-switcher__label">
        {current === 'tr' ? 'EN' : 'TR'}
      </span>
    </button>
  );
}
