require("dotenv").config();
const express = require("express");
const cors = require("cors");

const carbonRouter = require("./routes/carbon");
const dovizRouter = require("./routes/doviz");
const cografyaRouter = require("./routes/cografya");
const bonusRouter = require("./routes/bonus");

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
      "GET /api/doviz/cevirici":     "Kural 2 – TL → döviz çevirici",
      "GET /api/cografya/koordinat": "Kural 3 – Şehir → koordinat",
      "GET /api/cografya/atolyeler": "Kural 3 – Yakın atölye listesi",
      "GET /api/bonus/zincir":       "Bonus – Mesafe + CO₂ + Döviz zinciri",
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
