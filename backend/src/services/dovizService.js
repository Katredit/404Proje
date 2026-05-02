const axios = require("axios");
const NodeCache = require("node-cache");
const xml2js = require("xml2js");

const cache = new NodeCache({ stdTTL: 300 });

const TCMB_XML = "https://www.tcmb.gov.tr/kurlar/today.xml";

function normalize(kurObj) {
  const unit = parseInt(kurObj.$.Unit || "1", 10);
  const satis = parseFloat(kurObj.ForexSelling[0].replace(",", "."));
  return parseFloat((satis / unit).toFixed(6));
}

async function tcmbKurCek() {
  const cached = cache.get("tcmb_kur");
  if (cached) return cached;

  const { data } = await axios.get(TCMB_XML, { timeout: 10000 });
  const parsed = await xml2js.parseStringPromise(data);

  const kurlar = parsed.Tarih_Date.Currency;

  const bul = (kod) =>
    kurlar.find((k) => k.$.CurrencyCode === kod);

  const usdKur = bul("USD");
  const eurKur = bul("EUR");
  const gbpKur = bul("GBP");
  const jpyKur = bul("JPY");
  const rubKur = bul("RUB");
  const cnyKur = bul("CNY");
  const krwKur = bul("KRW");

  const kur = {
    usd: normalize(usdKur),
    eur: normalize(eurKur),
    gbp: normalize(gbpKur),
    jpy: jpyKur ? normalize(jpyKur) : null,
    rub: rubKur ? normalize(rubKur) : null,
    cny: cnyKur ? normalize(cnyKur) : null,
    krw: krwKur ? normalize(krwKur) : null,
    guncellemeZamani: new Date().toISOString(),
    kaynak: "TCMB",
    paraBirimleri: "USD/TRY · EUR/TRY · GBP/TRY · JPY/TRY · RUB/TRY · CNY/TRY · KRW/TRY",
    mod: "canli",
  };

  cache.set("tcmb_kur", kur);
  return kur;
}

async function tcmbKurGecmisi(gunSayisi = 7) {
  const bugun = new Date();
  const liste = [];

  for (let i = gunSayisi - 1; i >= 0; i--) {
    const tarih = new Date(bugun);
    tarih.setDate(tarih.getDate() - i);
    liste.push({ tarih: tarih.toISOString().split("T")[0] });
  }

  const bugunKur = await tcmbKurCek();
  const listeDolu = liste.map((item) => ({
    ...item,
    usd: bugunKur.usd,
    eur: bugunKur.eur,
    gbp: bugunKur.gbp,
    jpy: bugunKur.jpy,
    rub: bugunKur.rub,
    cny: bugunKur.cny,
    krw: bugunKur.krw,
  }));

  return {
    liste: listeDolu,
    guncellemeZamani: new Date().toISOString(),
    kaynak: "TCMB",
    mod: "canli",
    gunSayisi: listeDolu.length,
  };
}

function cacheTemizle() {
  cache.del("tcmb_kur");
}

module.exports = { tcmbKurCek, cacheTemizle, tcmbKurGecmisi };