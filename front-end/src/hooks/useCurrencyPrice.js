import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchRates, getCurrencyForLang, formatPrice } from '../services/currencyService';

export function useCurrencyPrice() {
  const { i18n } = useTranslation();
  const [rates, setRates] = useState(null);
  const currency = getCurrencyForLang(i18n.language);

  useEffect(() => {
    fetchRates().then(setRates).catch(() => setRates(null));
  }, []);

  const format = useCallback(
    (tryPrice) => {
      if (!rates) return '...';
      return formatPrice(tryPrice, currency.code, rates, currency.locale);
    },
    [rates, currency]
  );

  return { format, currency, rates };
}
