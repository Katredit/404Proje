const express = require("express");
const router = express.Router();
const { tcmbKurCek, cacheTemizle, tcmbKurGecmisi } = require("../services/dovizService");

// ─── GET /api/doviz/guncel ────────────────────────────────────
// TCMB EVDS'ten güncel USD, EUR, GBP kurlarını döner
// Her 5 dakikada bir otomatik yenilenir (cache)
router.get("/guncel", async (_req, res) => {
  try {
    const kur = await tcmbKurCek();
    res.json(kur);
  } catch (err) {
    res.status(503).json({
      hata: "TCMB bağlantısı kurulamadı: " + err.message,
      baglantiDurumu: "kesildi",
      aciklama: "Son bilinen kur verisi için /api/doviz/guncel?zorlaYenile=false deneyin",
    });
  }
});

// ─── GET /api/doviz/haftalik ──────────────────────────────────
// Son 7 günün döviz kurlarını döner. Opsiyonel query param: gunSayisi
router.get("/haftalik", async (req, res) => {
  try {
    const gunSayisi = req.query.gunSayisi ? parseInt(req.query.gunSayisi, 10) : 7;
    if (isNaN(gunSayisi) || gunSayisi < 1 || gunSayisi > 30) {
      return res.status(400).json({
        hata: '"gunSayisi" 1 ile 30 arasında bir sayı olmalıdır.',
      });
    }

    const kurGecmisi = await tcmbKurGecmisi(gunSayisi);
    res.json(kurGecmisi);
  } catch (err) {
    res.status(503).json({ hata: "Geçmiş döviz verisi alınamadı: " + err.message });
  }
});

// ─── GET /api/doviz/cevirici ──────────────────────────────────
// Fiyatı TL'den istenilen dövize çevirir
// Sorgu parametreleri:
//   miktar  : number – TL miktarı (ör: 5000)
//   hedef   : string – usd | eur | gbp (default: eur)
router.get("/cevirici", async (req, res) => {
  try {
    const miktar = parseFloat(req.query.miktar);
    const hedef = (req.query.hedef || "eur").toLowerCase();

    if (isNaN(miktar) || miktar <= 0) {
      return res.status(400).json({ hata: '"miktar" pozitif bir sayı olmalıdır.' });
    }
    if (!["usd", "eur", "gbp"].includes(hedef)) {
      return res.status(400).json({
        hata: `Geçersiz hedef para birimi: "${hedef}"`,
        gecerliDegerler: ["usd", "eur", "gbp"],
      });
    }

    const kur = await tcmbKurCek();
    const kurDegeri = kur[hedef];
    const sonuc = miktar / kurDegeri;

    res.json({
      girdi: { miktar, paraBirimi: "TRY" },
      cikti: {
        miktar: parseFloat(sonuc.toFixed(2)),
        paraBirimi: hedef.toUpperCase(),
      },
      kullanilanKur: {
        [hedef.toUpperCase() + "/TRY"]: kurDegeri,
        guncellemeZamani: kur.guncellemeZamani,
        kaynak: kur.kaynak,
        mod: kur.mod,
      },
      // Fiyatlandırma kararı: karlılık göstergesi (bonus zinciri için)
      isKarari: {
        tl: miktar,
        usd: parseFloat((miktar / kur.usd).toFixed(2)),
        eur: parseFloat((miktar / kur.eur).toFixed(2)),
        gbp: parseFloat((miktar / kur.gbp).toFixed(2)),
        aciklama: "Tüm para birimlerinde karşılık",
      },
    });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// ─── POST /api/doviz/yenile ───────────────────────────────────
// Cache'i zorla sıfırlar, TCMB'den taze veri çeker
router.post("/yenile", async (_req, res) => {
  try {
    cacheTemizle();
    const kur = await tcmbKurCek();
    res.json({ mesaj: "Kur verisi yenilendi", kur });
  } catch (err) {
    res.status(503).json({ hata: "Yenileme başarısız: " + err.message });
  }
});

module.exports = router;
