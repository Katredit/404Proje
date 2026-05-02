const axios = require("axios");
const NodeCache = require("node-cache");

// 5 dakika cache (TCMB çok sık istek atmayı sevmez)
const cache = new NodeCache({ stdTTL: 300 });

const TCMB_BASE = "https://evds2.tcmb.gov.tr/service/evds";

// Bugünün tarihini YYYY-MM-DD formatında döner
function bugunTarih() {
  return new Date().toISOString().split("T")[0];
}

// ─── TCMB EVDS'ten kur çek ───────────────────────────────────
async function tcmbKurCek() {
  const cached = cache.get("tcmb_kur");
  if (cached) return cached;

  const apiKey = process.env.TCMB_API_KEY;
  if (!apiKey || apiKey === "BURAYA_TCMB_API_ANAHTARINI_YAZ") {
    // API key yoksa mock veri döner - sunumda gerçek key ile çalışır
    console.warn("⚠️  TCMB_API_KEY bulunamadı, geliştirme modu aktif");
    return mockKurDondur();
  }

  const bugun = bugunTarih();
  const url = `${TCMB_BASE}/series=TP.DK.USD.A-TP.DK.EUR.A-TP.DK.GBP.A&startDate=${bugun}&endDate=${bugun}&type=json&key=${apiKey}`;

  const { data } = await axios.get(url, { timeout: 10000 });

  const items = data?.items;
  if (!items || !items.length) {
    throw new Error("TCMB'den veri alınamadı");
  }

  // En son kaydı al
  const son = items[items.length - 1];
  const kur = {
    usd: parseFloat(son["TP_DK_USD_A"]),
    eur: parseFloat(son["TP_DK_EUR_A"]),
    gbp: parseFloat(son["TP_DK_GBP_A"]),
    guncellemeZamani: new Date().toISOString(),
    kaynak: "TCMB EVDS",
    paraBirimleri: "USD/TRY · EUR/TRY · GBP/TRY",
    mod: "canli",
  };

  cache.set("tcmb_kur", kur);
  return kur;
}

// Geliştirme ortamı için mock veri
function mockKurDondur() {
  return {
    usd: 38.45,
    eur: 41.20,
    gbp: 48.75,
    guncellemeZamani: new Date().toISOString(),
    kaynak: "Mock Veri (Geliştirme Modu)",
    paraBirimleri: "USD/TRY · EUR/TRY · GBP/TRY",
    mod: "gelistirme",
    uyari: "Gerçek veri için .env dosyasına TCMB_API_KEY ekleyin",
  };
}

// Cache'i zorla yenile
function cacheTemizle() {
  cache.del("tcmb_kur");
}

module.exports = { tcmbKurCek, cacheTemizle };
