# 🏺 Kapadokya El Sanatları — Hackathon API

Hackathon'un 3 zorunlu kuralını ve bonus zinciri karşılayan Node.js REST API.

---

## 🚀 Kurulum (sadece 3 adım)

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. .env dosyasını oluştur
cp .env.example .env
# → .env dosyasını aç ve TCMB_API_KEY'i doldur (aşağıda açıklanıyor)

# 3. Sunucuyu başlat
npm run dev       # geliştirme (otomatik yeniden başlar)
# veya
npm start         # production
```

Sunucu → `http://localhost:3001`

---

## 🔑 TCMB API Anahtarı Nasıl Alınır?

1. https://evds2.tcmb.gov.tr adresine git
2. Sağ üstten **"Üye Ol"** de (ücretsiz)
3. E-posta ile kaydol ve giriş yap
4. Profil sayfasında **"API Key"** sekmesine tıkla
5. Anahtarı kopyala, `.env` dosyasına yapıştır:
   ```
   TCMB_API_KEY=abc123...
   ```

> ⚠️ API key yokken API **geliştirme modunda** çalışır (mock kur verir). Sunumda gerçek key ile çalıştır!

---

## 📋 Endpoint Listesi

### Kural 1 — Karbon Ayak İzi

#### `GET /api/karbon/hesapla`
Kullanıcının konumundan Kapadokya'ya nakliye + üretim CO₂ hesabı.

**Parametreler:**
| Parametre | Zorunlu | Açıklama | Örnek |
|-----------|---------|----------|-------|
| `sehir`   | ✅ | Kullanıcının şehri | `Berlin, Almanya` |
| `tasima`  | ✅ | Taşıma tipi | `hava`, `kara`, `demiryolu`, `deniz` |
| `urun`    | ❌ | Ürün tipi (default: kilim) | `kilim`, `comlek`, `vazo` |

**Örnek İstek:**
```
GET /api/karbon/hesapla?sehir=Berlin,Almanya&tasima=hava&urun=kilim
```

**Örnek Yanıt:**
```json
{
  "kullanici": {
    "girilen": "Berlin, Almanya",
    "tamAd": "Berlin, Deutschland",
    "koordinat": { "lat": 52.52, "lon": 13.40 }
  },
  "mesafe": { "km": 2604, "aciklama": "Haversine formülü ile hesaplandı" },
  "tasima": {
    "tip": "hava",
    "etiket": "Hava Yolu",
    "emisyonFaktoru": "0.5 kg CO₂/km",
    "nakliyeCo2Kg": 1302.00
  },
  "uretim": {
    "urun": "kilim",
    "sure": "~40 saat",
    "uretimCo2Kg": 8
  },
  "sonuc": {
    "toplamCo2Kg": 1310.00,
    "ozet": "2604 km Hava Yolu + kilim üretimi → 1310.00 kg CO₂"
  }
}
```

#### `GET /api/karbon/faktorler`
Tüm emisyon faktörlerini ve ürün karbon değerlerini listeler.

---

### Kural 2 — TCMB Döviz Kuru

#### `GET /api/doviz/guncel`
TCMB EVDS'ten güncel USD/EUR/GBP kurlarını döner. 5 dakika cache'lenir.

**Örnek Yanıt:**
```json
{
  "usd": 38.45,
  "eur": 41.20,
  "gbp": 48.75,
  "guncellemeZamani": "2024-01-15T10:30:00.000Z",
  "kaynak": "TCMB EVDS",
  "paraBirimleri": "USD/TRY · EUR/TRY · GBP/TRY",
  "mod": "canli"
}
```

#### `GET /api/doviz/cevirici?miktar=5000&hedef=eur`
TL miktarını istenilen dövize çevirir.

| Parametre | Açıklama | Örnek |
|-----------|----------|-------|
| `miktar`  | TL miktarı | `5000` |
| `hedef`   | Para birimi | `usd`, `eur`, `gbp` |

#### `POST /api/doviz/yenile`
Cache'i zorla sıfırlar, taze TCMB verisi çeker.

---

### Kural 3 — Coğrafi Veri

#### `GET /api/cografya/koordinat?sehir=Istanbul`
Şehir adını enlem/boylam koordinatına çevirir (Nominatim/OSM).

#### `GET /api/cografya/atolyeler`
Kapadokya'daki atölyeleri listeler. Overpass API ile OSM'den çekilir.

| Parametre | Açıklama | Örnek |
|-----------|----------|-------|
| `sehir`   | Kullanıcı konumu (mesafe sıralaması için) | `Istanbul` |
| `tip`     | Ürün filtresi | `kilim`, `comlek`, `vazo`, `hepsi` |
| `limit`   | Sonuç sayısı | `5` |

#### `GET /api/cografya/mesafe?sehir1=Istanbul&sehir2=Berlin`
İki şehir arasındaki mesafeyi Haversine ile hesaplar.

---

### Bonus — 3 Kuralı Birleştiren Zincir

#### `GET /api/bonus/zincir`
Tek sorguda: **Coğrafya → CO₂ → TCMB Kuru → Çok para birimli fiyat**

| Parametre | Zorunlu | Açıklama |
|-----------|---------|----------|
| `sehir`   | ✅ | Kullanıcı konumu |
| `tasima`  | ❌ | Taşıma tipi (default: hava) |
| `urun`    | ❌ | Ürün tipi (default: kilim) |
| `fiyatTL` | ❌ | Ürün fiyatı TL (default: ortalama) |

**Örnek:**
```
GET /api/bonus/zincir?sehir=Berlin,Almanya&tasima=hava&urun=kilim&fiyatTL=8000
```

---

## 🌐 Açık Kaynak Veri Kaynakları

| Kural | API | URL |
|-------|-----|-----|
| Kural 1 & 3 | OpenStreetMap Nominatim | https://nominatim.openstreetmap.org |
| Kural 3 | Overpass API | https://overpass-api.de |
| Kural 2 | TCMB EVDS | https://evds2.tcmb.gov.tr |

---

## 🏗️ Proje Yapısı

```
kapadokya-api/
├── src/
│   ├── index.js              # Express sunucu + rotalar
│   ├── routes/
│   │   ├── carbon.js         # Kural 1 – Karbon hesabı
│   │   ├── doviz.js          # Kural 2 – TCMB döviz
│   │   ├── cografya.js       # Kural 3 – Coğrafi veri
│   │   └── bonus.js          # Bonus – Zincir
│   └── services/
│       ├── geoService.js     # Haversine + Nominatim
│       └── dovizService.js   # TCMB + cache
├── .env.example
├── package.json
└── README.md
```

---

## 💡 Front-end Entegrasyonu (Arkadaşlar için)

```js
// Karbon hesabı
const res = await fetch(`http://localhost:3001/api/karbon/hesapla?sehir=${sehir}&tasima=${tasima}&urun=${urun}`);
const data = await res.json();
console.log(data.sonuc.toplamCo2Kg); // → 1310.00

// Döviz kuru
const kur = await fetch("http://localhost:3001/api/doviz/guncel").then(r => r.json());
console.log(kur.eur); // → 41.20

// Bonus zincir (hepsini tek sorguda)
const zincir = await fetch(`http://localhost:3001/api/bonus/zincir?sehir=Berlin&tasima=hava&urun=kilim`).then(r => r.json());
console.log(zincir.ozet); // → "2604 km Hava Yolu → 1310.0 kg CO₂ → ..."
```
