import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./SellerDashboard.css";

const CATEGORY_DEFS = [
  { value: "ceramic", icon: "local_dining", color: "#C0392B", accent: "#E74C3C", roof: "#922B21" },
  { value: "kilim",   icon: "grid_view",    color: "#2980B9", accent: "#3498DB", roof: "#1A5276" },
  { value: "stone",   icon: "diamond",      color: "#27AE60", accent: "#2ECC71", roof: "#1E8449" },
  { value: "wood",    icon: "forest",       color: "#8E44AD", accent: "#9B59B6", roof: "#6C3483" },
  { value: "metal",   icon: "local_cafe",   color: "#D35400", accent: "#E67E22", roof: "#A04000" },
  { value: "textile", icon: "checkroom",    color: "#F39C12", accent: "#F1C40F", roof: "#B7770D" },
  { value: "glass",   icon: "water_drop",   color: "#16A085", accent: "#1ABC9C", roof: "#0E6655" },
  { value: "leather", icon: "style",        color: "#7F8C8D", accent: "#95A5A6", roof: "#626567" },
];
const FLAG_EMOJIS = ["🔴", "🔵", "🟢", "🟣", "🟠", "🟡", "🟤", "⚪"];

const CATEGORY_LABELS = {
  ceramic: "Seramik & Çömlek", kilim: "Kilim & Halı", stone: "Taş & Takı",
  wood: "Ahşap El Sanatı", metal: "Metal & Bakır", textile: "Tekstil & Kumaş",
  glass: "Cam & Kristal", leather: "Deri El Sanatı",
};

// ── Dükkan Oluşturma Formu ───────────────────────────────────
function CreateStoreForm({ onCreated }) {
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: "", owner: "", category: "", description: "",
    location: "", openSince: new Date().getFullYear(),
    flag: "🔴", badge: "Yeni",
    color: "#C0392B", accentColor: "#E74C3C", roofColor: "#922B21",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleCat = (cat) =>
    setForm((f) => ({ ...f, category: cat.value, color: cat.color, accentColor: cat.accent, roofColor: cat.roof }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.category || !form.description || !form.location) {
      setError("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = { ...form, category: CATEGORY_LABELS[form.category] || form.category };
      await api.post("/stores", payload);
      const updated = await refreshUser();
      onCreated?.(updated?.store);
    } catch (err) {
      setError(err.response?.data?.hata || "Dükkan oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sdash-create">
      <div className="sdash-create__header">
        <span className="ms sdash-create__icon">storefront</span>
        <div>
          <h2 className="sdash-create__title">Dükkanınızı Oluşturun</h2>
          <p className="sdash-create__sub">Kapadokya pazarındaki yerinizi alın</p>
        </div>
      </div>

      {/* Adım göstergesi */}
      <div className="sdash-steps">
        {["Dükkan Bilgileri", "Konum & Görünüm", "Özet"].map((s, i) => (
          <div key={i} className={`sdash-step${i === step ? " sdash-step--active" : ""}${i < step ? " sdash-step--done" : ""}`}>
            <div className="sdash-step__dot">{i < step ? <span className="ms">check</span> : i + 1}</div>
            <span className="sdash-step__label">{s}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="sdash-form">
        {step === 0 && (
          <>
            <div className="sdash-row">
              <div className="sdash-field">
                <label className="sdash-label">Dükkan Adı <span className="sdash-req">*</span></label>
                <input className="sdash-input" placeholder="Dükkan adınız" value={form.name}
                  onChange={(e) => set("name", e.target.value)} maxLength={60} />
              </div>
              <div className="sdash-field">
                <label className="sdash-label">Usta / Sahibi</label>
                <input className="sdash-input" placeholder="Adınız Soyadınız" value={form.owner}
                  onChange={(e) => set("owner", e.target.value)} maxLength={60} />
              </div>
            </div>

            <div className="sdash-field">
              <label className="sdash-label">Kategori <span className="sdash-req">*</span></label>
              <div className="sdash-cats">
                {CATEGORY_DEFS.map((cat) => (
                  <button key={cat.value} type="button"
                    className={`sdash-cat${form.category === cat.value ? " sdash-cat--active" : ""}`}
                    style={form.category === cat.value ? { borderColor: cat.accent, background: cat.color + "22" } : {}}
                    onClick={() => handleCat(cat)}>
                    <span className="ms">{cat.icon}</span>
                    <span>{CATEGORY_LABELS[cat.value]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sdash-field">
              <label className="sdash-label">Açıklama <span className="sdash-req">*</span></label>
              <textarea className="sdash-textarea" placeholder="Dükkanınız hakkında kısa bir açıklama"
                value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={300} />
              <div className="sdash-char">{form.description.length} / 300</div>
            </div>

            <div className="sdash-actions">
              <button type="button" className="sdash-btn sdash-btn--primary"
                onClick={() => { if (!form.name || !form.category || !form.description) { setError("Lütfen zorunlu alanları doldurun."); return; } setError(""); setStep(1); }}>
                İleri <span className="ms">arrow_forward</span>
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="sdash-row">
              <div className="sdash-field">
                <label className="sdash-label">Konum <span className="sdash-req">*</span></label>
                <input className="sdash-input" placeholder="Göreme, Nevşehir" value={form.location}
                  onChange={(e) => set("location", e.target.value)} />
              </div>
              <div className="sdash-field">
                <label className="sdash-label">Kuruluş Yılı</label>
                <input className="sdash-input" type="number" min={1900} max={new Date().getFullYear()}
                  value={form.openSince} onChange={(e) => set("openSince", Number(e.target.value))} />
              </div>
            </div>

            <div className="sdash-field">
              <label className="sdash-label">Rozet</label>
              <input className="sdash-input" placeholder="Yeni, Çok Satan, Önerilen…" value={form.badge}
                onChange={(e) => set("badge", e.target.value)} maxLength={20} />
            </div>

            <div className="sdash-field">
              <label className="sdash-label">Bayrak</label>
              <div className="sdash-flags">
                {FLAG_EMOJIS.map((f) => (
                  <button key={f} type="button"
                    className={`sdash-flag${form.flag === f ? " sdash-flag--active" : ""}`}
                    onClick={() => set("flag", f)}>{f}</button>
                ))}
              </div>
            </div>

            <div className="sdash-actions">
              <button type="button" className="sdash-btn sdash-btn--cancel" onClick={() => { setError(""); setStep(0); }}>
                <span className="ms">arrow_back</span> Geri
              </button>
              <button type="button" className="sdash-btn sdash-btn--primary"
                onClick={() => { if (!form.location) { setError("Konum zorunludur."); return; } setError(""); setStep(2); }}>
                İleri <span className="ms">arrow_forward</span>
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="sdash-review">
              <div className="sdash-review__header" style={{ background: form.color + "18", borderColor: form.accentColor }}>
                <span className="sdash-review__flag">{form.flag}</span>
                <div>
                  <div className="sdash-review__name">{form.name}</div>
                  <div className="sdash-review__cat">{CATEGORY_LABELS[form.category]}</div>
                </div>
                <span className="sdash-review__badge" style={{ background: form.accentColor }}>{form.badge}</span>
              </div>
              <table className="sdash-review__table">
                <tbody>
                  <tr><td>Konum</td><td>{form.location}</td></tr>
                  <tr><td>Kuruluş</td><td>{form.openSince}</td></tr>
                  <tr><td>Açıklama</td><td>{form.description}</td></tr>
                </tbody>
              </table>
            </div>

            {error && <div className="sdash-error">{error}</div>}

            <div className="sdash-actions">
              <button type="button" className="sdash-btn sdash-btn--cancel" onClick={() => { setError(""); setStep(1); }}>
                <span className="ms">arrow_back</span> Geri
              </button>
              <button type="submit" className="sdash-btn sdash-btn--primary" disabled={loading}>
                <span className="ms">storefront</span>
                {loading ? "Oluşturuluyor…" : "Dükkanı Oluştur"}
              </button>
            </div>
          </>
        )}

        {error && step < 2 && <div className="sdash-error">{error}</div>}
      </form>
    </div>
  );
}

// ── Ürün Formu ───────────────────────────────────────────────
function ProductForm({ storeId, product, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    type: product?.type || "other",
    price: product?.price || "",
    description: product?.description || "",
    stock: product?.stock || 0,
    material: product?.material || "",
    size: product?.size || "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) { setError("Ürün adı ve fiyat zorunludur."); return; }
    setLoading(true);
    setError("");
    try {
      let res;
      if (product) {
        res = await api.put(`/stores/${storeId}/products/${product.id}`, form);
      } else {
        res = await api.post(`/stores/${storeId}/products`, form);
      }
      onSaved?.(res.data);
    } catch (err) {
      setError(err.response?.data?.hata || "Ürün kaydedilemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="pform" onSubmit={handleSubmit}>
      <h3 className="pform__title">{product ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</h3>

      <div className="pform__row">
        <div className="pform__field">
          <label className="pform__label">Ürün Adı <span className="pform__req">*</span></label>
          <input className="pform__input" placeholder="Ürün adı" value={form.name}
            onChange={(e) => set("name", e.target.value)} maxLength={80} />
        </div>
        <div className="pform__field">
          <label className="pform__label">Fiyat (₺) <span className="pform__req">*</span></label>
          <input className="pform__input" type="number" min={0} step={0.01}
            placeholder="0.00" value={form.price}
            onChange={(e) => set("price", e.target.value)} />
        </div>
      </div>

      <div className="pform__row">
        <div className="pform__field">
          <label className="pform__label">Tür</label>
          <select className="pform__input" value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="kilim">Kilim / Halı</option>
            <option value="ceramic">Seramik / Çömlek</option>
            <option value="other">Diğer</option>
          </select>
        </div>
        <div className="pform__field">
          <label className="pform__label">Stok</label>
          <input className="pform__input" type="number" min={0} value={form.stock}
            onChange={(e) => set("stock", e.target.value)} />
        </div>
      </div>

      <div className="pform__row">
        <div className="pform__field">
          <label className="pform__label">Malzeme</label>
          <input className="pform__input" placeholder="Yün, Seramik…" value={form.material}
            onChange={(e) => set("material", e.target.value)} maxLength={60} />
        </div>
        <div className="pform__field">
          <label className="pform__label">Boyut / Yükseklik</label>
          <input className="pform__input" placeholder="120x180 cm veya 28 cm" value={form.size}
            onChange={(e) => set("size", e.target.value)} maxLength={40} />
        </div>
      </div>

      <div className="pform__field">
        <label className="pform__label">Açıklama</label>
        <textarea className="pform__textarea" placeholder="Ürün açıklaması" rows={3}
          value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={300} />
      </div>

      {error && <div className="pform__error">{error}</div>}

      <div className="pform__actions">
        <button type="button" className="sdash-btn sdash-btn--cancel" onClick={onCancel}>İptal</button>
        <button type="submit" className="sdash-btn sdash-btn--primary" disabled={loading}>
          <span className="ms">{product ? "save" : "add_circle"}</span>
          {loading ? "Kaydediliyor…" : product ? "Kaydet" : "Ürün Ekle"}
        </button>
      </div>
    </form>
  );
}

// ── Ana Dashboard ─────────────────────────────────────────────
export default function SellerDashboard() {
  const { user, refreshUser } = useAuth();
  const store = user?.store;

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionError, setActionError] = useState("");

  const handleStoreCreated = () => {};

  const handleProductSaved = async () => {
    await refreshUser();
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await api.delete(`/stores/${store.id}/products/${productId}`);
      await refreshUser();
      setDeleteConfirm(null);
    } catch (err) {
      setActionError(err.response?.data?.hata || "Ürün silinemedi.");
    }
  };

  // Dükkanı yok → dükkan oluşturma formu
  if (!store) {
    return <CreateStoreForm onCreated={handleStoreCreated} />;
  }

  const products = store.products || [];

  return (
    <div className="sdash">
      {/* Dükkan başlık kartı */}
      <div className="sdash-store-header" style={{ borderColor: store.accentColor }}>
        <div className="sdash-store-flag">{store.flag}</div>
        <div className="sdash-store-info">
          <h2 className="sdash-store-name">{store.name}</h2>
          <span className="sdash-store-cat">{store.category}</span>
          <span className="sdash-store-loc">
            <span className="ms" style={{ fontSize: 14 }}>location_on</span> {store.location}
          </span>
        </div>
        <span className="sdash-store-badge" style={{ background: store.accentColor }}>{store.badge}</span>
      </div>

      {/* Ürünler bölümü */}
      <div className="sdash-section">
        <div className="sdash-section__header">
          <h3 className="sdash-section__title">
            <span className="ms">inventory_2</span> Ürünlerim
            <span className="sdash-count">{products.length}</span>
          </h3>
          {!showProductForm && !editingProduct && (
            <button className="sdash-btn sdash-btn--primary sdash-btn--sm"
              onClick={() => { setShowProductForm(true); setEditingProduct(null); }}>
              <span className="ms">add</span> Ürün Ekle
            </button>
          )}
        </div>

        {actionError && <div className="sdash-error">{actionError}</div>}

        {(showProductForm && !editingProduct) && (
          <ProductForm
            storeId={store.id}
            onSaved={handleProductSaved}
            onCancel={() => setShowProductForm(false)}
          />
        )}

        {products.length === 0 && !showProductForm && (
          <div className="sdash-empty">
            <span className="ms sdash-empty__icon">inventory_2</span>
            <p>Henüz ürün eklemediniz.</p>
            <button className="sdash-btn sdash-btn--primary"
              onClick={() => setShowProductForm(true)}>
              <span className="ms">add</span> İlk Ürününüzü Ekleyin
            </button>
          </div>
        )}

        <div className="sdash-products">
          {products.map((p) => (
            <div key={p.id} className="sdash-product">
              {editingProduct?.id === p.id ? (
                <ProductForm
                  storeId={store.id}
                  product={p}
                  onSaved={handleProductSaved}
                  onCancel={() => setEditingProduct(null)}
                />
              ) : (
                <>
                  <div className="sdash-product__info">
                    <div className="sdash-product__name">{p.name}</div>
                    <div className="sdash-product__meta">
                      <span className="sdash-product__price">₺{Number(p.price).toLocaleString("tr-TR")}</span>
                      {p.material && <span className="sdash-product__tag">{p.material}</span>}
                      {p.size && <span className="sdash-product__tag">{p.size}</span>}
                      <span className={`sdash-product__stock${p.stock === 0 ? " sdash-product__stock--out" : ""}`}>
                        Stok: {p.stock}
                      </span>
                    </div>
                    {p.description && <p className="sdash-product__desc">{p.description}</p>}
                  </div>
                  <div className="sdash-product__actions">
                    <button className="sdash-icon-btn" title="Düzenle"
                      onClick={() => { setEditingProduct(p); setShowProductForm(false); }}>
                      <span className="ms">edit</span>
                    </button>
                    <button className="sdash-icon-btn sdash-icon-btn--danger" title="Sil"
                      onClick={() => setDeleteConfirm(p.id)}>
                      <span className="ms">delete</span>
                    </button>
                  </div>

                  {deleteConfirm === p.id && (
                    <div className="sdash-delete-confirm">
                      <span>Bu ürünü silmek istediğinizden emin misiniz?</span>
                      <div className="sdash-delete-confirm__btns">
                        <button className="sdash-btn sdash-btn--cancel sdash-btn--sm"
                          onClick={() => setDeleteConfirm(null)}>Hayır</button>
                        <button className="sdash-btn sdash-btn--danger sdash-btn--sm"
                          onClick={() => handleDeleteProduct(p.id)}>
                          <span className="ms">delete</span> Evet, Sil
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
