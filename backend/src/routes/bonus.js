const express = require("express");
const router = express.Router();
const { haversineKm, sehirdenKoordinat } = require("../services/geoService");
const { tcmbKurCek } = require("../services/dovizService");

const KAPADOKYA = { lat: 38.6431, lon: 34.8289, ad: "Göreme, Kapadokya" };

const EMISYON_FAKTORLERI = {
  hava:      { faktor: 0.500, etiket: "Hava Yolu" },
  kara:      { faktor: 0.100, etiket: "Kara / TIR" },
  demiryolu: { faktor: 0.030, etiket: "Demiryolu" },
  deniz:     { faktor: 0.015, etiket: "Deniz Yolu" },
};

const URETIM_KARBON = {
  kilim:  { co2Kg: 8.0,  sure: "~40 saat" },
  comlek: { co2Kg: 3.0,  sure: "~10 saat" },
  vazo:   { co2Kg: 4.5,  sure: "~15 saat" },
};

// Ürün baz fiyatları (TL)
const URUN_FIYATLARI = {
  kilim:  { min: 3000, max: 15000, ortalama: 6000 },
  comlek: { min: 500,  max: 3000,  ortalama: 1200 },
  vazo:   { min: 800,  max: 5000,  ortalama: 2000 },
};

// CO₂ offset maliyeti: 1 kg CO₂ ≈ 15 TL (gönüllü karbon piyasası tahmini)
const CO2_OFFSET_TL_KG = 15;

// ─── GET /api/bonus/zincir ────────────────────────────────────
// Tüm 3 kuralı tek sorguda birleştirir:
// Coğrafi Mesafe (OSM) → CO₂ hesabı → TCMB kuruyla fiyat zinciri
//
// Sorgu parametreleri:
//   sehir    : string  – kullanıcı konumu
//   tasima   : string  – hava | kara | demiryolu | deniz
//   urun     : string  – kilim | comlek | vazo
//   fiyatTL  : number  – ürün fiyatı TL (opsiyonel, default: ortalama)
router.get("/zincir", async (req, res) => {
  try {
    const { sehir, tasima = "hava", urun = "kilim" } = req.query;
    let fiyatTL = parseFloat(req.query.fiyatTL) || null;

    if (!sehir) return res.status(400).json({ hata: '"sehir" parametresi zorunludur.' });
    if (!EMISYON_FAKTORLERI[tasima]) {
      return res.status(400).json({ hata: `Geçersiz taşıma: "${tasima}"` });
    }

    // ── ADIM 1: Coğrafi veri (Kural 3 + Kural 1'in temeli) ──
    const kullanici = await sehirdenKoordinat(sehir);
    const mesafeKm = haversineKm(
      kullanici.lat, kullanici.lon,
      KAPADOKYA.lat, KAPADOKYA.lon
    );

    // ── ADIM 2: Karbon hesabı (Kural 1) ──
    const tasimaBilgi = EMISYON_FAKTORLERI[tasima];
    const nakliyeCo2Kg = mesafeKm * tasimaBilgi.faktor;
    const uretimBilgi = URETIM_KARBON[urun] || URETIM_KARBON["kilim"];
    const toplamCo2Kg = nakliyeCo2Kg + uretimBilgi.co2Kg;
    const carbonOffsetTL = toplamCo2Kg * CO2_OFFSET_TL_KG;

    // ── ADIM 3: Fiyat + TCMB kuru (Kural 2) ──
    const kur = await tcmbKurCek();
    const urunFiyatBilgi = URUN_FIYATLARI[urun] || URUN_FIYATLARI["kilim"];
    const urunFiyatTL = fiyatTL || urunFiyatBilgi.ortalama;
    const toplamTL = urunFiyatTL + carbonOffsetTL;

    // ── Sonuç zinciri ──
    res.json({
      zincir: {
        adim1_cografya: {
          baslik: "Coğrafi Mesafe (Kural 3)",
          kullanici: { girilen: sehir, tamAd: kullanici.tamAd },
          hedef: KAPADOKYA.ad,
          mesafeKm: Math.round(mesafeKm),
          kaynak: "OpenStreetMap Nominatim",
        },
        adim2_karbon: {
          baslik: "Karbon Ayak İzi (Kural 1)",
          tasima: { tip: tasima, etiket: tasimaBilgi.etiket, faktor: `${tasimaBilgi.faktor} kg CO₂/km` },
          nakliyeCo2Kg: parseFloat(nakliyeCo2Kg.toFixed(2)),
          uretimCo2Kg: uretimBilgi.co2Kg,
          uretimSure: uretimBilgi.sure,
          toplamCo2Kg: parseFloat(toplamCo2Kg.toFixed(2)),
          offsetMaliyetTL: parseFloat(carbonOffsetTL.toFixed(2)),
        },
        adim3_fiyat: {
          baslik: "Fiyat Zinciri (Kural 2 – TCMB)",
          kurBilgisi: {
            usd: kur.usd,
            eur: kur.eur,
            gbp: kur.gbp,
            guncellemeZamani: kur.guncellemeZamani,
            kaynak: kur.kaynak,
            paraBirimleri: kur.paraBirimleri,
            mod: kur.mod,
          },
          fiyatlandirma: {
            urunFiyatTL: parseFloat(urunFiyatTL.toFixed(2)),
            carbonOffsetTL: parseFloat(carbonOffsetTL.toFixed(2)),
            toplamTL: parseFloat(toplamTL.toFixed(2)),
            toplamUSD: parseFloat((toplamTL / kur.usd).toFixed(2)),
            toplamEUR: parseFloat((toplamTL / kur.eur).toFixed(2)),
            toplamGBP: parseFloat((toplamTL / kur.gbp).toFixed(2)),
          },
        },
      },
      ozet: `${Math.round(mesafeKm)} km ${tasimaBilgi.etiket} → ${toplamCo2Kg.toFixed(1)} kg CO₂ → Toplam: ${toplamTL.toFixed(0)} TL (${(toplamTL / kur.eur).toFixed(0)} EUR)`,
      hesaplamaTarihi: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
