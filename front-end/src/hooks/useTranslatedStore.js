import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateText, translateFields } from '../services/translateService';

const STORE_FIELDS = ['name', 'description', 'category', 'badge'];
const PRODUCT_FIELDS = ['name', 'description'];

async function translateStore(store, lang) {
  const base = await translateFields(store, STORE_FIELDS, lang);
  const products = await Promise.all(
    (store.products || []).map(p => translateFields(p, PRODUCT_FIELDS, lang))
  );
  return { ...base, products };
}

/**
 * Tek bir mağaza nesnesini mevcut dile göre çevirir.
 * Dil Türkçe ise orijinal nesneyi döner (çeviri gerekmez).
 */
export function useTranslatedStore(store) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] ?? 'tr';
  const [translated, setTranslated] = useState(store);

  useEffect(() => {
    if (!store) { setTranslated(null); return; }
    if (lang === 'tr') { setTranslated(store); return; }

    let cancelled = false;
    translateStore(store, lang).then(result => {
      if (!cancelled) setTranslated(result);
    });
    return () => { cancelled = true; };
    // store.id + lang yeterli; ürün listesi statik
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id, lang]);

  return translated;
}

/**
 * Mağaza dizisini mevcut dile göre çevirir (sidebar için — sadece name + category).
 * Dil Türkçe ise orijinal diziyi döner.
 */
export function useTranslatedStores(stores) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] ?? 'tr';
  const [translated, setTranslated] = useState(stores);

  // Stabil bağımlılık: store ID'lerinin birleşimi
  const storeIds = stores?.map(s => s.id).join(',') ?? '';

  useEffect(() => {
    if (!stores?.length || lang === 'tr') { setTranslated(stores); return; }

    let cancelled = false;
    Promise.all(
      stores.map(s =>
        Promise.all([
          translateText(s.name, lang),
          translateText(s.category, lang),
        ]).then(([name, category]) => ({ ...s, name, category }))
      )
    ).then(result => {
      if (!cancelled) setTranslated(result);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeIds, lang]);

  return translated;
}
