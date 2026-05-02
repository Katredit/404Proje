const express = require("express");
const router = express.Router();
const axios = require("axios");
const { haversineKm, sehirdenKoordinat } = require("../services/geoService");

// ─── Kapadokya'daki gerçek atölye/zanaatkar noktaları ────────
// Overpass API ile OpenStreetMap'ten çekilir (dinamik)
// Statik yedek liste de var (API hata verirse)
const STATIK_ATOLYELER = [
  { id: 1, isim: "Göreme El Sanatları Merkezi",  lat: 38.6431, lon: 34.8289, tip: "kilim",  adres: "Göreme, Nevşehir" },
  { id: 2, isim: "Avanos Çömlek Atölyesi",       lat: 38.7156, lon: 34.8495, tip: "comlek", adres: "Avanos, Nevşehir" },
  { id: 3, isim: "Ürgüp Halı Evi",               lat: 38.6291, lon: 34.9144, tip: "kilim",  adres: "Ürgüp, Nevşehir" },
  { id: 4, isim: "Ortahisar Seramik Stüdyosu",   lat: 38.6261, lon: 34.8592, tip: "comlek", adres: "Ortahisar, Nevşehir" },
  { id: 5, isim: "Uçhisar Sanat Galerisi",        lat: 38.6352, lon: 34.8072, tip: "vazo",   adres: "Uçhisar, Nevşehir" },
  { id: 6, isim: "Mustafapaşa Kilim Atölyesi",   lat: 38.5876, lon: 34.9234, tip: "kilim",  adres: "Mustafapaşa, Nevşehir" },
];

// ─── Overpass API ile OSM'den atölye çek ─────────────────────
async function overpassAtolyeCek() {
  const query = `
    [out:json][timeout:10];
    area["name"="Nevşehir"]["admin_level"="6"]->.kapadokya;
    (
      node["craft"~"carpet|pottery|ceramics"](area.kapadokya);
      node["shop"~"carpet|pottery|art"](area.kapadokya);
      node["tourism"="artwork"](area.kapadokya);
    );
    out body;
  `;

  const { data } = await axios.post(
    "https://overpass-api.de/api/interpreter",
    query,
    { headers: { "Content-Type": "text/plain" }, timeout: 12000 }
  );

  return data.elements.map((el, i) => ({
    id: el.id || i,
    isim: el.tags?.name || el.tags?.["name:tr"] || "İsimsiz Atölye",
    lat: el.lat,
    lon: el.lon,
    tip: el.tags?.craft || el.tags?.shop || "genel",
    adres: el.tags?.["addr:street"] || el.tags?.["addr:city"] || "Kapadokya",
    kaynak: "OpenStreetMap / Overpass API",
  }));
}

// ─── GET /api/cografya/koordinat ─────────────────────────────
// Şehir adını koordinata çevirir (Nominatim)
// Sorgu parametresi: sehir
router.get("/koordinat", async (req, res) => {
  try {
    const { sehir } = req.query;
    if (!sehir) return res.status(400).json({ hata: '"sehir" parametresi zorunludur.' });

    const konum = await sehirdenKoordinat(sehir);

    res.json({
      girilen: sehir,
      tamAd: konum.tamAd,
      koordinat: { lat: konum.lat, lon: konum.lon },
      kaynak: "OpenStreetMap Nominatim API",
    });
  } catch (err) {
    res.status(404).json({ hata: err.message });
  }
});

// ─── GET /api/cografya/atolyeler ─────────────────────────────
// Kapadokya'daki atölyeleri listeler, opsiyonel olarak
// kullanıcının konumuna göre mesafeye göre sıralar
// Sorgu parametreleri:
//   sehir  : string  – kullanıcının şehri (opsiyonel, mesafe için)
//   tip    : string  – kilim | comlek | vazo | hepsi (default: hepsi)
//   limit  : number  – kaç atölye dönsün (default: 10)
router.get("/atolyeler", async (req, res) => {
  try {
    const { sehir, tip = "hepsi", limit = 10 } = req.query;

    // Overpass API'den dene, hata olursa statik listeyi kullan
    let atolyeler;
    let veriKaynagi;
    try {
      const overpassSonuc = await overpassAtolyeCek();
      atolyeler = overpassSonuc.length > 0 ? overpassSonuc : STATIK_ATOLYELER;
      veriKaynagi = overpassSonuc.length > 0
        ? "OpenStreetMap / Overpass API"
        : "Statik yedek liste (OSM bağlantı hatası)";
    } catch {
      atolyeler = STATIK_ATOLYELER;
      veriKaynagi = "Statik yedek liste (OSM timeout)";
    }

    // Tip filtresi
    if (tip !== "hepsi") {
      atolyeler = atolyeler.filter((a) => a.tip === tip);
    }

    // Mesafeye göre sırala (sehir verilmişse)
    if (sehir) {
      const kullanici = await sehirdenKoordinat(sehir);
      atolyeler = atolyeler
        .map((a) => ({
          ...a,
          mesafeKm: Math.round(haversineKm(kullanici.lat, kullanici.lon, a.lat, a.lon)),
        }))
        .sort((a, b) => a.mesafeKm - b.mesafeKm);
    }

    res.json({
      toplam: atolyeler.slice(0, parseInt(limit)).length,
      filtre: { tip, sehir: sehir || "belirtilmedi" },
      atolyeler: atolyeler.slice(0, parseInt(limit)),
      veriKaynagi,
      aciklama: sehir
        ? `${sehir} konumuna en yakın atölyeler listelendi`
        : "Kapadokya'daki tüm atölyeler listelendi",
    });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// ─── GET /api/cografya/mesafe ─────────────────────────────────
// İki nokta arasındaki mesafeyi hesaplar (Kural 1'den bağımsız)
// Sorgu parametreleri: sehir1, sehir2
router.get("/mesafe", async (req, res) => {
  try {
    const { sehir1, sehir2 } = req.query;
    if (!sehir1 || !sehir2) {
      return res.status(400).json({ hata: '"sehir1" ve "sehir2" parametreleri zorunludur.' });
    }

    const [konum1, konum2] = await Promise.all([
      sehirdenKoordinat(sehir1),
      sehirdenKoordinat(sehir2),
    ]);

    const mesafeKm = haversineKm(konum1.lat, konum1.lon, konum2.lat, konum2.lon);

    res.json({
      sehir1: { girilen: sehir1, tamAd: konum1.tamAd, koordinat: { lat: konum1.lat, lon: konum1.lon } },
      sehir2: { girilen: sehir2, tamAd: konum2.tamAd, koordinat: { lat: konum2.lat, lon: konum2.lon } },
      mesafe: {
        km: Math.round(mesafeKm),
        aciklama: "Haversine formülü ile hesaplandı",
      },
      kaynak: "OpenStreetMap Nominatim + Haversine",
    });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
