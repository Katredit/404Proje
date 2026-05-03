const express = require("express");
const { customOrders, stores, users } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// POST /api/custom-orders — müşteri yeni özel sipariş oluşturur
router.post("/", authMiddleware, (req, res) => {
  try {
    const { productType, prompt, imageBase64, note } = req.body;
    if (!productType || !imageBase64) {
      return res.status(400).json({ hata: "Ürün tipi ve tasarım görseli zorunludur." });
    }
    if (!["vazo", "kilim"].includes(productType)) {
      return res.status(400).json({ hata: "Geçersiz ürün tipi." });
    }

    const customer = users.findById(req.user.id);
    if (!customer) return res.status(404).json({ hata: "Kullanıcı bulunamadı." });

    // imageBase64 boyutunu sınırla (max ~5MB base64)
    if (imageBase64.length > 7_000_000) {
      return res.status(400).json({ hata: "Görsel çok büyük." });
    }

    const order = customOrders.insert({
      customerId: req.user.id,
      customerName: customer.name,
      productType,
      prompt: (prompt || "").slice(0, 1000),
      imageBase64,
      note: (note || "").slice(0, 500),
      status: "open",
      offers: [],
      acceptedOfferId: null,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({ siparis: order });
  } catch (err) {
    return res.status(500).json({ hata: "Sunucu hatası: " + err.message });
  }
});

// GET /api/custom-orders — satıcılar tüm açık siparişleri görür
router.get("/", authMiddleware, (req, res) => {
  try {
    const seller = users.findById(req.user.id);
    if (!seller?.storeId) {
      return res.status(403).json({ hata: "Bu sayfaya yalnızca satıcılar erişebilir." });
    }

    const all = customOrders.findAll()
      .filter((o) => o.status === "open" || o.status === "accepted")
      .map((o) => ({
        id: o.id,
        productType: o.productType,
        prompt: o.prompt,
        imageBase64: o.imageBase64,
        note: o.note,
        status: o.status,
        customerName: o.customerName,
        createdAt: o.createdAt,
        offerCount: (o.offers || []).length,
        myOffer: (o.offers || []).find((of) => of.storeId === seller.storeId) || null,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ siparisler: all });
  } catch (err) {
    return res.status(500).json({ hata: "Sunucu hatası: " + err.message });
  }
});

// GET /api/custom-orders/my — müşteri kendi siparişlerini görür
router.get("/my", authMiddleware, (req, res) => {
  try {
    const all = customOrders.findAll()
      .filter((o) => o.customerId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ siparisler: all });
  } catch (err) {
    return res.status(500).json({ hata: "Sunucu hatası: " + err.message });
  }
});

// POST /api/custom-orders/:id/offer — satıcı fiyat teklifi yapar
router.post("/:id/offer", authMiddleware, (req, res) => {
  try {
    const seller = users.findById(req.user.id);
    if (!seller?.storeId) {
      return res.status(403).json({ hata: "Bu işlem için dükkan sahibi olmanız gerekiyor." });
    }

    const order = customOrders.findById(req.params.id);
    if (!order) return res.status(404).json({ hata: "Sipariş bulunamadı." });
    if (order.status !== "open") {
      return res.status(400).json({ hata: "Bu siparişe artık teklif verilemez." });
    }

    const { price, note } = req.body;
    const parsedPrice = parseFloat(price);
    if (!parsedPrice || parsedPrice <= 0) {
      return res.status(400).json({ hata: "Geçerli bir fiyat girin." });
    }

    const store = stores.findById(seller.storeId);
    const offers = order.offers || [];

    // Aynı satıcı daha önce teklif verdiyse güncelle
    const existingIdx = offers.findIndex((o) => o.storeId === seller.storeId);
    const offer = {
      id: existingIdx >= 0 ? offers[existingIdx].id : Date.now().toString(),
      storeId: seller.storeId,
      storeName: store?.name || "Bilinmeyen Mağaza",
      price: parsedPrice,
      note: (note || "").slice(0, 300),
      createdAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      offers[existingIdx] = offer;
    } else {
      offers.push(offer);
    }

    const updated = customOrders.update(order.id, { offers });
    return res.json({ teklif: offer, siparis: updated });
  } catch (err) {
    return res.status(500).json({ hata: "Sunucu hatası: " + err.message });
  }
});

// POST /api/custom-orders/:id/accept-offer/:offerId — müşteri teklifi kabul eder
router.post("/:id/accept-offer/:offerId", authMiddleware, (req, res) => {
  try {
    const order = customOrders.findById(req.params.id);
    if (!order) return res.status(404).json({ hata: "Sipariş bulunamadı." });
    if (order.customerId !== req.user.id) {
      return res.status(403).json({ hata: "Bu sipariş size ait değil." });
    }
    if (order.status !== "open") {
      return res.status(400).json({ hata: "Sipariş zaten kabul edildi veya tamamlandı." });
    }

    const offer = (order.offers || []).find((o) => o.id === req.params.offerId);
    if (!offer) return res.status(404).json({ hata: "Teklif bulunamadı." });

    const updated = customOrders.update(order.id, {
      status: "accepted",
      acceptedOfferId: offer.id,
    });

    return res.json({ siparis: updated, kabul_edilen_teklif: offer });
  } catch (err) {
    return res.status(500).json({ hata: "Sunucu hatası: " + err.message });
  }
});

module.exports = router;
