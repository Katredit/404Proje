const express = require("express");
const router = express.Router();
const { tcmbKurCek, cacheTemizle, tcmbKurGecmisi } = require("../services/dovizService");

const GECERLI_PARA_BIRIMLERI = ["usd", "eur", "gbp", "jpy", "rub", "cny", "krw"];

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
//   hedef   : string – usd | eur | gbp | jpy | rub | cny | krw (default: usd)
router.get("/cevirici", async (req, res) => {
  try {
    const miktar = parseFloat(req.query.miktar);
    const hedef = (req.query.hedef || "usd").toLowerCase();

    if (isNaN(miktar) || miktar <= 0) {
      return res.status(400).json({ hata: '"miktar" pozitif bir sayı olmalıdır.' });
    }
    if (!GECERLI_PARA_BIRIMLERI.includes(hedef)) {
      return res.status(400).json({
        hata: `Geçersiz hedef para birimi: "${hedef}"`,
        gecerliDegerler: GECERLI_PARA_BIRIMLERI,
      });
    }

    const kur = await tcmbKurCek();
    const kurDegeri = kur[hedef];

    if (!kurDegeri)
      return res.status(503).json({ hata: `${hedef.toUpperCase()} kuru şu an mevcut değil.` });

    const sonuc = miktar / kurDegeri;

    res.json({
      girdi: { miktar, paraBirimi: "TRY" },
      cikti: {
        miktar: parseFloat(sonuc.toFixed(4)),
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
        usd: kur.usd ? parseFloat((miktar / kur.usd).toFixed(2)) : null,
        eur: kur.eur ? parseFloat((miktar / kur.eur).toFixed(2)) : null,
        gbp: kur.gbp ? parseFloat((miktar / kur.gbp).toFixed(2)) : null,
        jpy: kur.jpy ? parseFloat((miktar / kur.jpy).toFixed(0)) : null,
        rub: kur.rub ? parseFloat((miktar / kur.rub).toFixed(2)) : null,
        cny: kur.cny ? parseFloat((miktar / kur.cny).toFixed(2)) : null,
        krw: kur.krw ? parseFloat((miktar / kur.krw).toFixed(0)) : null,
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
