const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { users, stores } = require("../db");
const { authMiddleware, SECRET } = require("../middleware/auth");

const router = express.Router();

function safeUser(u) {
  const { password, ...rest } = u;
  // Kullanıcının dükkanı varsa ekle
  if (u.storeId) {
    rest.store = stores.findById(u.storeId) || null;
  } else {
    rest.store = null;
  }
  return rest;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ hata: "Email ve şifre zorunludur." });
    }
    if (password.length < 6) {
      return res.status(400).json({ hata: "Şifre en az 6 karakter olmalıdır." });
    }

    const emailLower = email.toLowerCase().trim();
    const existing = users.findOne((u) => u.email === emailLower);
    if (existing) {
      return res.status(409).json({ hata: "Bu email zaten kayıtlı." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = users.insert({
      email: emailLower,
      password: hashed,
      name: (name || "").trim() || emailLower.split("@")[0],
      storeId: null,
      createdAt: new Date().toISOString(),
    });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "7d" });
    return res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    return res.status(500).json({ hata: "Sunucu hatası: " + err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ hata: "Email ve şifre zorunludur." });
    }

    const emailLower = email.toLowerCase().trim();
    const user = users.findOne((u) => u.email === emailLower);
    if (!user) {
      return res.status(401).json({ hata: "Email veya şifre hatalı." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ hata: "Email veya şifre hatalı." });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "7d" });
    return res.json({ token, user: safeUser(user) });
  } catch (err) {
    return res.status(500).json({ hata: "Sunucu hatası: " + err.message });
  }
});

// GET /api/auth/me – token ile mevcut kullanıcıyı getir
router.get("/me", authMiddleware, (req, res) => {
  const user = users.findById(req.user.id);
  if (!user) return res.status(404).json({ hata: "Kullanıcı bulunamadı." });
  return res.json({ user: safeUser(user) });
});

module.exports = router;
