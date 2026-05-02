const express = require("express");
const router = express.Router();
const { haversineKm, sehirdenKoordinat } = require("../services/geoService");

// ─── Sabitler ────────────────────────────────────────────────

// Kapadokya merkezi (Göreme)
const KAPADOKYA = { lat: 38.6431, lon: 34.8289, ad: "Göreme, Kapadokya" };

// Emisyon faktörleri (kg CO₂ / km) — hackathon tarafından verildi
const EMISYON_FAKTORLERI = {
  hava:       { faktor: 0.500, etiket: "Hava Yolu",    emoji: "✈️" },
  kara:       { faktor: 0.100, etiket: "Kara / TIR",   emoji: "🚛" },
  demiryolu:  { faktor: 0.030, etiket: "Demiryolu",    emoji: "🚂" },
  deniz:      { faktor: 0.015, etiket: "Deniz Yolu",   emoji: "🚢" },
};

// Üretim süresi karbon tahmini (üretim sırasındaki CO₂)
const URETIM_KARBON = {
  kilim:  { co2Kg: 8.0, sure: "~40 saat", aciklama: "El tezgahı + boya işlemi" },
  comlek: { co2Kg: 3.0, sure: "~10 saat", aciklama: "Çark + fırın işlemi" },
  vazo:   { co2Kg: 4.5, sure: "~15 saat", aciklama: "Şekillendirme + fırın" },
};

// ─── GET /api/karbon/hesapla ──────────────────────────────────
// Sorgu parametreleri:
//   sehir     : string  – kullanıcının konumu (ör: "Berlin, Almanya")
//   tasima    : string  – hava | kara | demiryolu | deniz
//   urun      : string  – kilim | comlek | vazo  (opsiyonel, default: kilim)
router.get("/hesapla", async (req, res) => {
  try {
    const { sehir, tasima, urun = "kilim" } = req.query;

    // ── Validasyon ──
    if (!sehir) return res.status(400).json({ hata: '"sehir" parametresi zorunludur.' });
    if (!tasima) return res.status(400).json({ hata: '"tasima" parametresi zorunludur. (hava | kara | demiryolu | deniz)' });
    if (!EMISYON_FAKTORLERI[tasima]) {
      return res.status(400).json({
        hata: `Geçersiz taşıma tipi: "${tasima}"`,
        gecerliDegerler: Object.keys(EMISYON_FAKTORLERI),
      });
    }

    // ── Konum → Koordinat (Nominatim / OpenStreetMap) ──
    const kullanici = await sehirdenKoordinat(sehir);

    // ── Mesafe Hesabı (Haversine) ──
    const mesafeKm = haversineKm(
      kullanici.lat, kullanici.lon,
      KAPADOKYA.lat, KAPADOKYA.lon
    );

    // ── Nakliye CO₂ ──
    const tasimaBilgi = EMISYON_FAKTORLERI[tasima];
    const nakliyeCo2Kg = mesafeKm * tasimaBilgi.faktor;

    // ── Üretim CO₂ (bonus: üretim süresi karbonu) ──
    const urunBilgi = URETIM_KARBON[urun] || URETIM_KARBON["kilim"];
    const uretimCo2Kg = urunBilgi.co2Kg;

    // ── Toplam ──
    const toplamCo2Kg = nakliyeCo2Kg + uretimCo2Kg;

    res.json({
      kullanici: {
        girilen: sehir,
        tamAd: kullanici.tamAd,
        koordinat: { lat: kullanici.lat, lon: kullanici.lon },
      },
      hedef: {
        ad: KAPADOKYA.ad,
        koordinat: { lat: KAPADOKYA.lat, lon: KAPADOKYA.lon },
      },
      mesafe: {
        km: Math.round(mesafeKm),
        aciklama: "Haversine formülü ile hesaplandı (kuş uçuşu)",
      },
      tasima: {
        tip: tasima,
        etiket: tasimaBilgi.etiket,
        emisyonFaktoru: `${tasimaBilgi.faktor} kg CO₂/km`,
        nakliyeCo2Kg: parseFloat(nakliyeCo2Kg.toFixed(2)),
      },
      uretim: {
        urun,
        sure: urunBilgi.sure,
        aciklama: urunBilgi.aciklama,
        uretimCo2Kg: uretimCo2Kg,
      },
      sonuc: {
        toplamCo2Kg: parseFloat(toplamCo2Kg.toFixed(2)),
        ozet: `${Math.round(mesafeKm)} km ${tasimaBilgi.etiket} + ${urun} üretimi → ${toplamCo2Kg.toFixed(2)} kg CO₂`,
      },
      kaynak: "OpenStreetMap Nominatim API",
      hesaplamaTarihi: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// ─── GET /api/karbon/faktorler ────────────────────────────────
// Tüm emisyon faktörlerini listeler
router.get("/faktorler", (_req, res) => {
  res.json({
    emisyonFaktorleri: Object.entries(EMISYON_FAKTORLERI).map(([key, val]) => ({
      tip: key,
      etiket: val.etiket,
      faktor: val.faktor,
      birim: "kg CO₂ / km",
    })),
    uretimKarbonlari: Object.entries(URETIM_KARBON).map(([key, val]) => ({
      urun: key,
      co2Kg: val.co2Kg,
      sure: val.sure,
      aciklama: val.aciklama,
    })),
  });
});

module.exports = router;
