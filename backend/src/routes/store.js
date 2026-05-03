const express = require("express");
const { users, stores } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// GET /api/stores – tüm dükkanları listele (public)
router.get("/", (_req, res) => {
  const allStores = stores.findAll();
  return res.json(allStores);
});

// GET /api/stores/:id – tek dükkan (public)
router.get("/:id", (req, res) => {
  const store = stores.findById(req.params.id);
  if (!store) return res.status(404).json({ hata: "Dükkan bulunamadı." });
  return res.json(store);
});

// POST /api/stores – dükkan oluştur (auth gerekli, her kullanıcı sadece 1 dükkan)
router.post("/", authMiddleware, (req, res) => {
  const user = users.findById(req.user.id);
  if (!user) return res.status(401).json({ hata: "Kullanıcı bulunamadı." });
  if (user.storeId) {
    return res.status(409).json({ hata: "Zaten bir dükkanınız var." });
  }

  const { name, owner, category, description, location, openSince, flag, badge, color, accentColor, roofColor } = req.body;
  if (!name || !category || !description || !location) {
    return res.status(400).json({ hata: "name, category, description ve location zorunludur." });
  }

  // Konum belirleme: mevcut dükkan sayısına göre
  const storePositions = [
    [-4, 0, -2], [0, 0, -2], [4, 0, -2],
    [-4, 0, 2],  [0, 0, 2],  [4, 0, 2],
    [-6, 0, 0],  [6, 0, 0],  [-2, 0, 4], [2, 0, 4],
  ];
  const allCount = stores.findAll().length;
  const position = storePositions[allCount % storePositions.length];

  const store = stores.insert({
    ownerId: user.id,
    name: name.trim(),
    owner: (owner || user.name).trim(),
    category,
    description: description.trim(),
    location: location.trim(),
    openSince: openSince || new Date().getFullYear(),
    flag: flag || "🔴",
    badge: badge || "Yeni",
    color: color || "#C0392B",
    accentColor: accentColor || "#E74C3C",
    roofColor: roofColor || "#922B21",
    products: [],
    rating: 5.0,
    reviewCount: 0,
    position,
    createdAt: new Date().toISOString(),
  });

  users.update(user.id, { storeId: store.id });

  return res.status(201).json(store);
});

// PUT /api/stores/:id – dükkan güncelle (sadece sahibi)
router.put("/:id", authMiddleware, (req, res) => {
  const store = stores.findById(req.params.id);
  if (!store) return res.status(404).json({ hata: "Dükkan bulunamadı." });
  if (store.ownerId !== req.user.id) {
    return res.status(403).json({ hata: "Bu dükkanı düzenleme yetkiniz yok." });
  }

  const allowed = ["name", "owner", "category", "description", "location", "openSince", "flag", "badge", "color", "accentColor", "roofColor"];
  const patch = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) patch[k] = req.body[k]; });

  const updated = stores.update(store.id, patch);
  return res.json(updated);
});

// POST /api/stores/:id/products – ürün ekle (sadece sahibi)
router.post("/:id/products", authMiddleware, (req, res) => {
  const store = stores.findById(req.params.id);
  if (!store) return res.status(404).json({ hata: "Dükkan bulunamadı." });
  if (store.ownerId !== req.user.id) {
    return res.status(403).json({ hata: "Bu dükkanın sahibi değilsiniz." });
  }

  const { name, type, price, description, stock, colors, size, height, material, photo } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ hata: "name ve price zorunludur." });
  }

  const product = {
    id: Date.now(),
    name: name.trim(),
    type: type || "other",
    price: Number(price),
    description: (description || "").trim(),
    stock: Number(stock) || 0,
    colors: colors || [],
    size: size || null,
    height: height || null,
    material: material || null,
    photo: photo || null,
    createdAt: new Date().toISOString(),
  };

  const updatedProducts = [...(store.products || []), product];
  const updated = stores.update(store.id, { products: updatedProducts });
  return res.status(201).json(updated);
});

// PUT /api/stores/:id/products/:pid – ürün güncelle (sadece sahibi)
router.put("/:id/products/:pid", authMiddleware, (req, res) => {
  const store = stores.findById(req.params.id);
  if (!store) return res.status(404).json({ hata: "Dükkan bulunamadı." });
  if (store.ownerId !== req.user.id) {
    return res.status(403).json({ hata: "Bu dükkanın sahibi değilsiniz." });
  }

  const pid = Number(req.params.pid);
  const products = store.products || [];
  const idx = products.findIndex((p) => p.id === pid);
  if (idx === -1) return res.status(404).json({ hata: "Ürün bulunamadı." });

  const allowed = ["name", "type", "price", "description", "stock", "colors", "size", "height", "material", "photo"];
  const patch = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) patch[k] = req.body[k]; });
  if (patch.price !== undefined) patch.price = Number(patch.price);
  if (patch.stock !== undefined) patch.stock = Number(patch.stock);

  products[idx] = { ...products[idx], ...patch };
  const updated = stores.update(store.id, { products });
  return res.json(updated);
});

// DELETE /api/stores/:id/products/:pid – ürün sil (sadece sahibi)
router.delete("/:id/products/:pid", authMiddleware, (req, res) => {
  const store = stores.findById(req.params.id);
  if (!store) return res.status(404).json({ hata: "Dükkan bulunamadı." });
  if (store.ownerId !== req.user.id) {
    return res.status(403).json({ hata: "Bu dükkanın sahibi değilsiniz." });
  }

  const pid = Number(req.params.pid);
  const products = (store.products || []).filter((p) => p.id !== pid);
  const updated = stores.update(store.id, { products });
  return res.json(updated);
});

module.exports = router;
