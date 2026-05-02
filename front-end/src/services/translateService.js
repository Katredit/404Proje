const CACHE_PREFIX = 'tr_c_';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 gün

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(36);
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { v, t } = JSON.parse(raw);
    if (Date.now() - t > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return v;
  } catch { return null; }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ v: value, t: Date.now() }));
  } catch {}
}

/**
 * Bir metni hedef dile çevirir. Sonucu localStorage'da cache'ler.
 * @param {string} text - Çevrilecek metin
 * @param {string} targetLang - Hedef dil kodu (örn. 'en', 'ja')
 * @param {string} sourceLang - Kaynak dil kodu (varsayılan 'tr')
 * @returns {Promise<string>}
 */
export async function translateText(text, targetLang, sourceLang = 'tr') {
  if (!text?.trim()) return text;
  // Kaynak ile hedef aynıysa çevirme
  if (targetLang === sourceLang || targetLang?.startsWith(sourceLang + '-')) return text;

  const pair = `${sourceLang}|${targetLang}`;
  const key = CACHE_PREFIX + pair + '_' + hashStr(text);
  const cached = readCache(key);
  if (cached !== null) return cached;

  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`
    );
    if (!res.ok) return text;
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const result = data.responseData.translatedText;
      writeCache(key, result);
      return result;
    }
  } catch {}
  return text;
}

/**
 * Bir objenin belirtilen alanlarını paralel olarak çevirir.
 * @param {object} obj
 * @param {string[]} fields
 * @param {string} targetLang
 * @param {string} sourceLang
 * @returns {Promise<object>}
 */
export async function translateFields(obj, fields, targetLang, sourceLang = 'tr') {
  if (!obj || targetLang === sourceLang) return obj;
  const values = await Promise.all(
    fields.map(f => obj[f] ? translateText(obj[f], targetLang, sourceLang) : Promise.resolve(obj[f]))
  );
  const result = { ...obj };
  fields.forEach((f, i) => { result[f] = values[i]; });
  return result;
}
