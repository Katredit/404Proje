// ─── Haversine Formülü ───────────────────────────────────────
// İki koordinat arasındaki kuş uçuşu mesafeyi km cinsinden döner
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Nominatim ile şehir adı → koordinat ─────────────────────
async function sehirdenKoordinat(sehir) {
  const axios = require("axios");
  const url = `https://nominatim.openstreetmap.org/search`;
  const { data } = await axios.get(url, {
    params: { q: sehir, format: "json", limit: 1 },
    headers: {
      "User-Agent": "KapadokyaHackathonApp/1.0",
      "Accept-Language": "tr",
    },
    timeout: 8000,
  });

  if (!data.length) throw new Error(`"${sehir}" konumu bulunamadı`);

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    tamAd: data[0].display_name,
  };
}

module.exports = { haversineKm, sehirdenKoordinat };
