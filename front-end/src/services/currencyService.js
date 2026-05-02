const LANG_TO_CURRENCY = {
  tr: { code: 'TRY', symbol: '₺', locale: 'tr-TR' },
  en: { code: 'USD', symbol: '$',  locale: 'en-US' },
  fr: { code: 'EUR', symbol: '€',  locale: 'fr-FR' },
  es: { code: 'EUR', symbol: '€',  locale: 'es-ES' },
  ru: { code: 'RUB', symbol: '₽',  locale: 'ru-RU' },
  ja: { code: 'JPY', symbol: '¥',  locale: 'ja-JP' },
  zh: { code: 'CNY', symbol: '¥',  locale: 'zh-CN' },
  ko: { code: 'KRW', symbol: '₩',  locale: 'ko-KR' },
};

const DEFAULT_CURRENCY = LANG_TO_CURRENCY.en;

let ratesCache = null;

export async function fetchRates() {
  if (ratesCache) return ratesCache;
  const res = await fetch('http://localhost:3001/api/doviz/guncel');
  if (!res.ok) throw new Error('Kur verisi alınamadı');
  ratesCache = await res.json();
  return ratesCache;
}

export function getCurrencyForLang(lang) {
  const code = (lang || '').split('-')[0].toLowerCase();
  return LANG_TO_CURRENCY[code] || DEFAULT_CURRENCY;
}

export function convertPrice(tryPrice, currencyCode, rates) {
  if (currencyCode === 'TRY') return tryPrice;
  const rate = rates[currencyCode.toLowerCase()];
  if (!rate) return tryPrice;
  return tryPrice / rate;
}

export function formatPrice(tryPrice, currencyCode, rates, locale) {
  if (currencyCode === 'TRY') {
    return '₺' + tryPrice.toLocaleString('tr-TR');
  }
  const converted = convertPrice(tryPrice, currencyCode, rates);
  const fractionDigits = ['JPY', 'KRW'].includes(currencyCode) ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(converted);
}
