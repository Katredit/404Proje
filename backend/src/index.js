require("dotenv").config();
const express = require("express");
const cors = require("cors");

const carbonRouter = require("./routes/carbon");
const dovizRouter = require("./routes/doviz");
const cografyaRouter = require("./routes/cografya");
const bonusRouter = require("./routes/bonus");
const authRouter = require("./routes/auth");
const storeRouter = require("./routes/store");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// İstek logları
app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString("tr-TR")}] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ──────────────────────────────────────────────────
app.use("/api/auth", authRouter);           // Auth (register/login/me)
app.use("/api/stores", storeRouter);        // Dükkanlar + Ürünler
app.use("/api/karbon", carbonRouter);   // Kural 1
app.use("/api/doviz", dovizRouter);     // Kural 2
app.use("/api/cografya", cografyaRouter); // Kural 3
app.use("/api/bonus", bonusRouter);     // Bonus Zincir

// ─── Sağlık kontrolü ─────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    api: "Kapadokya El Sanatları API",
    versiyon: "1.0.0",
    endpointler: {
      "GET /api/karbon/hesapla":     "Kural 1 – Karbon ayak izi hesabı",
      "GET /api/doviz/guncel":       "Kural 2 – TCMB canlı döviz kuru",
      "GET /api/doviz/haftalik":      "Kural 2 – Son 7 günün döviz kurları",
      "GET /api/doviz/cevirici":     "Kural 2 – TL → döviz çevirici",
      "GET /api/cografya/koordinat": "Kural 3 – Şehir → koordinat",
      "GET /api/cografya/atolyeler": "Kural 3 – Yakın atölye listesi",
      "GET /api/cografya/mesafe":    "Kural 3 – Şehirler arası mesafe",
      "GET /api/bonus/zincir":       "Bonus – Mesafe + CO₂ + Döviz zinciri",
      "POST /api/doviz/yenile":      "Kural 2 – Kur verisini yenile",
    },
    testUrl: {
      base: "http://localhost:3001",
      ornekler: {
        "GET /api/karbon/hesapla": "http://localhost:3001/api/karbon/hesapla?sehir=Istanbul&tasima=hava&urun=kilim",
        "GET /api/doviz/guncel": "http://localhost:3001/api/doviz/guncel",
        "GET /api/doviz/haftalik": "http://localhost:3001/api/doviz/haftalik",
        "GET /api/doviz/cevirici": "http://localhost:3001/api/doviz/cevirici?miktar=5000&hedef=eur",
        "GET /api/cografya/koordinat": "http://localhost:3001/api/cografya/koordinat?sehir=Ankara",
        "GET /api/cografya/atolyeler": "http://localhost:3001/api/cografya/atolyeler?sehir=Istanbul&tip=kilim&limit=5",
        "GET /api/cografya/mesafe": "http://localhost:3001/api/cografya/mesafe?sehir1=Istanbul&sehir2=Ankara",
        "GET /api/bonus/zincir": "http://localhost:3001/api/bonus/zincir?sehir=Berlin&tasima=kara&urun=comlek",
        "POST /api/doviz/yenile": "http://localhost:3001/api/doviz/yenile (POST isteği, body boş)",
      },
    },
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ hata: "Endpoint bulunamadı." });
});

// Genel hata handler
app.use((err, _req, res, _next) => {
  console.error("Sunucu hatası:", err.message);
  res.status(500).json({ hata: "Sunucu hatası: " + err.message });
});

app.listen(PORT, () => {
  console.log(`\n🏺 Kapadokya API çalışıyor → http://localhost:${PORT}`);
  console.log(`📋 Endpoint listesi  → http://localhost:${PORT}/\n`);
});
