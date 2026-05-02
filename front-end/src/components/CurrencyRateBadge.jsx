import { useTranslation } from 'react-i18next';
import { useCurrencyPrice } from '../hooks/useCurrencyPrice';

// JPY ve KRW gibi küçük değerli para birimleri için çarpan (100 JPY = ... ₺ gösterir)
const DISPLAY_MULTIPLIER = { JPY: 100, KRW: 100 };

function CurrencyRateBadge() {
  const { i18n } = useTranslation();
  const { currency, rates } = useCurrencyPrice();

  const lang = (i18n.language || '').split('-')[0];
  if (lang === 'tr') return null;
  if (!rates) return null;

  const rate = rates[currency.code.toLowerCase()];
  if (!rate) return null;

  const multiplier = DISPLAY_MULTIPLIER[currency.code] || 1;
  const displayRate = (rate * multiplier).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const unitLabel = multiplier > 1
    ? `${multiplier} ${currency.symbol}`
    : `1 ${currency.symbol}`;

  return (
    <div className="currency-rate-badge">
      <span className="ms">currency_exchange</span>
      <span>{unitLabel} = ₺{displayRate}</span>
    </div>
  );
}

export default CurrencyRateBadge;
