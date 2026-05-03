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

const KAPADOKYA_MERKEZ = { lat: 38.6431, lon: 34.8289, isim: "Göreme, Nevşehir" };

const ULKE_MERKEZLERI = {
  turkey: { lat: 39.0, lon: 35.0, tamAd: "Turkey (yaklaşık merkez)" },
  turkiye: { lat: 39.0, lon: 35.0, tamAd: "Türkiye (yaklaşık merkez)" },
  germany: { lat: 51.1657, lon: 10.4515, tamAd: "Germany (yaklaşık merkez)" },
  almanya: { lat: 51.1657, lon: 10.4515, tamAd: "Almanya (yaklaşık merkez)" },
  "united states": { lat: 39.8283, lon: -98.5795, tamAd: "United States (yaklaşık merkez)" },
  abd: { lat: 39.8283, lon: -98.5795, tamAd: "ABD (yaklaşık merkez)" },
  "united kingdom": { lat: 55.3781, lon: -3.436, tamAd: "United Kingdom (yaklaşık merkez)" },
  "birlesik krallik": { lat: 55.3781, lon: -3.436, tamAd: "Birleşik Krallık (yaklaşık merkez)" },
  france: { lat: 46.2276, lon: 2.2137, tamAd: "France (yaklaşık merkez)" },
  fransa: { lat: 46.2276, lon: 2.2137, tamAd: "Fransa (yaklaşık merkez)" },
  netherlands: { lat: 52.1326, lon: 5.2913, tamAd: "Netherlands (yaklaşık merkez)" },
  hollanda: { lat: 52.1326, lon: 5.2913, tamAd: "Hollanda (yaklaşık merkez)" },
};

function teslimatTahminiHesapla(km, tasima) {
  const hazirlikGun = 1.5;
  const kmGunHizi = tasima === "kara" ? 750 : 1800;
  const aktarmaGun = tasima === "kara" ? 0.75 : 1.25;
  const hamGun = hazirlikGun + km / kmGunHizi + aktarmaGun;

  const ortalamaGun = Math.max(2, Math.min(21, Math.round(hamGun)));
  const minGun = Math.max(1, ortalamaGun - 1);
  const maxGun = Math.min(30, ortalamaGun + 2);

  return { ortalamaGun, minGun, maxGun };
}

async function adrestenKoordinatBul(adres) {
  const parcalar = String(adres || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const adaySorgular = [
    adres,
    parcalar.slice(-3).join(", "),
    parcalar.slice(-2).join(", "),
    parcalar.slice(-1).join(", "),
  ].filter(Boolean);

  for (const sorgu of adaySorgular) {
    try {
      return await sehirdenKoordinat(sorgu);
    } catch {
      // Bir sonraki sorgu kombinasyonunu dene.
    }
  }

  const ulkeAnahtari = (parcalar[parcalar.length - 1] || "").toLowerCase();
  const ulkeMerkezi = ULKE_MERKEZLERI[ulkeAnahtari];
  if (ulkeMerkezi) {
    return { lat: ulkeMerkezi.lat, lon: ulkeMerkezi.lon, tamAd: ulkeMerkezi.tamAd };
  }

  throw new Error('Adres için koordinat bulunamadı. Lütfen şehir ve ülke bilgisini kontrol edin.');
}

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

// ─── GET /api/cografya/tahmini-teslimat ─────────────────────
// Girilen adrese göre Kapadokya'dan ortalama teslimat süresini hesaplar
// Sorgu parametreleri:
//   adres : string  – açık adres/şehir/ülke bilgisi
//   tasima: string  – kara | hava (opsiyonel, default: kara)
router.get("/tahmini-teslimat", async (req, res) => {
  try {
    const { adres, tasima = "kara" } = req.query;
    if (!adres) {
      return res.status(400).json({ hata: '"adres" parametresi zorunludur.' });
    }
    if (!["kara", "hava"].includes(tasima)) {
      return res.status(400).json({ hata: '"tasima" sadece "kara" veya "hava" olabilir.' });
    }

    const teslimatNoktasi = await adrestenKoordinatBul(adres);
    const mesafeKm = haversineKm(
      KAPADOKYA_MERKEZ.lat,
      KAPADOKYA_MERKEZ.lon,
      teslimatNoktasi.lat,
      teslimatNoktasi.lon
    );
    const tahmin = teslimatTahminiHesapla(mesafeKm, tasima);

    res.json({
      kaynak: "OpenStreetMap Nominatim + Haversine + kural tabanlı ETA modeli",
      cikisNoktasi: KAPADOKYA_MERKEZ,
      teslimatNoktasi: {
        girilen: adres,
        tamAd: teslimatNoktasi.tamAd,
        koordinat: { lat: teslimatNoktasi.lat, lon: teslimatNoktasi.lon },
      },
      tasima,
      mesafe: { km: Math.round(mesafeKm) },
      tahminiTeslimat: {
        ortalamaGun: tahmin.ortalamaGun,
        aralik: { minGun: tahmin.minGun, maxGun: tahmin.maxGun },
      },
    });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
