import { useState } from "react";

import { useAuth } from "../context/AuthContext";

import api from "../services/api";

import "./SellerDashboard.css";

const API_BASE = "http://localhost:3001";

const PRODUCT_TYPE_OPTIONS = [
  { value: "kilim", label: "Kilim / Halı", icon: "grid_view" },
  { value: "ceramic", label: "Seramik / Çömlek", icon: "local_dining" },
  { value: "stone", label: "Taş / Takı", icon: "diamond" },
  { value: "wood", label: "Ahşap El Sanatı", icon: "forest" },
  { value: "metal", label: "Metal / Bakır", icon: "construction" },
  { value: "textile", label: "Tekstil / Kumaş", icon: "checkroom" },
  { value: "glass", label: "Cam / Kristal", icon: "water_drop" },
  { value: "leather", label: "Deri El Sanatı", icon: "style" },
  { value: "spice", label: "Baharat / Gıda", icon: "nutrition" },
  { value: "painting", label: "Resim / Sanat", icon: "palette" },
  { value: "other", label: "Diğer", icon: "inventory_2" },
];

const PRODUCT_TYPE_ICONS = PRODUCT_TYPE_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.icon;
  return acc;
}, {});

const resolvePhotoUrl = (photo) => (photo?.startsWith("http") ? photo : `${API_BASE}${photo}`);



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

      setError("Lütfen tüm zorunlu alanları doldurun."); return;

    }

    setLoading(true); setError("");

    try {

      const payload = { ...form, category: CATEGORY_LABELS[form.category] || form.category };

      await api.post("/stores", payload);

      const updated = await refreshUser();

      onCreated?.(updated?.store);

    } catch (err) {

      setError(err.response?.data?.hata || "Dükkan oluşturulamadı.");

    } finally { setLoading(false); }

  };



  const STEPS = ["Dükkan Bilgileri", "Konum & Görünüm", "Özet"];



  return (

    <div className="sdash-page">

      <div className="sdash-create">

        <div className="sdash-create__header">

          <span className="ms sdash-create__icon">storefront</span>

          <div>

            <h2 className="sdash-create__title">Dükkanınızı Oluşturun</h2>

            <p className="sdash-create__sub">Kapadokya pazarındaki yerinizi alın</p>

          </div>

        </div>



        <div className="sdash-steps">

          {STEPS.map((s, i) => (

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

                      style={form.category === cat.value ? { borderColor: cat.accent, background: cat.color + "15" } : {}}

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

              {error && <div className="sdash-error">{error}</div>}

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

              {error && <div className="sdash-error">{error}</div>}

              <div className="sdash-actions">

                <button type="button" className="sdash-btn sdash-btn--ghost" onClick={() => { setError(""); setStep(0); }}>

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

                <div className="sdash-review__header" style={{ borderLeftColor: form.accentColor }}>

                  <div className="sdash-review__flag-wrap">{form.flag}</div>

                  <div className="sdash-review__body">

                    <div className="sdash-review__name">{form.name}</div>

                    <div className="sdash-review__meta">

                      <span className="sdash-review__cat-pill"

                        style={{ color: form.accentColor, background: form.color + "15" }}>

                        {CATEGORY_LABELS[form.category]}

                      </span>

                      <span className="sdash-review__loc">

                        <span className="ms">location_on</span>{form.location}

                      </span>

                    </div>

                  </div>

                  <span className="sdash-review__badge" style={{ background: form.accentColor }}>{form.badge}</span>

                </div>

                <table className="sdash-review__table">

                  <tbody>

                    <tr><td>Kuruluş</td><td>{form.openSince}</td></tr>

                    <tr><td>Açıklama</td><td>{form.description}</td></tr>

                  </tbody>

                </table>

              </div>

              {error && <div className="sdash-error">{error}</div>}

              <div className="sdash-actions">

                <button type="button" className="sdash-btn sdash-btn--ghost" onClick={() => { setError(""); setStep(1); }}>

                  <span className="ms">arrow_back</span> Geri

                </button>

                <button type="submit" className="sdash-btn sdash-btn--primary" disabled={loading}>

                  <span className="ms">storefront</span>

                  {loading ? "Oluşturuluyor…" : "Dükkanı Oluştur"}

                </button>

              </div>

            </>

          )}

        </form>

      </div>

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

    photo: product?.photo || "",

  });

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);



  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const photoPreview = form.photo
    ? resolvePhotoUrl(form.photo)
    : null;

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Fotoğraf boyutu en fazla 5 MB olabilir.");
      return;
    }

    const formData = new FormData();
    formData.append("photo", file);

    setUploadingPhoto(true);
    setError("");
    try {
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      set("photo", res.data.url);
    } catch (err) {
      setError(err.response?.data?.hata || "Fotoğraf yüklenemedi.");
    } finally {
      setUploadingPhoto(false);
    }
  };



  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!form.name || !form.price) { setError("Ürün adı ve fiyat zorunludur."); return; }

    setLoading(true); setError("");

    try {

      const res = product

        ? await api.put(`/stores/${storeId}/products/${product.id}`, form)

        : await api.post(`/stores/${storeId}/products`, form);

      onSaved?.(res.data);

    } catch (err) {

      setError(err.response?.data?.hata || "Ürün kaydedilemedi.");

    } finally { setLoading(false); }

  };



  return (

    <section className="pform-card">

      <div className="pform-card__head">

        <span className="ms pform-card__icon">add_circle</span>

        <h2 className="pform-card__title">{product ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</h2>

      </div>

      <form onSubmit={handleSubmit} className="pform-card__body">

        <div className="pform-grid">

          <div className="pform-field">

            <label className="pform-label">Ürün Adı <span className="pform-req">*</span></label>

            <input className="pform-input" placeholder="Örn: El Dokuması Kök Boya Kilim"

              value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={80} />

          </div>

          <div className="pform-field">

            <label className="pform-label">Fiyat (₺) <span className="pform-req">*</span></label>

            <input className="pform-input" type="number" min={0} step={0.01}

              placeholder="0.00" value={form.price} onChange={(e) => set("price", e.target.value)} />

          </div>

          <div className="pform-field">

            <label className="pform-label">Tür</label>

            <select className="pform-input" value={form.type} onChange={(e) => set("type", e.target.value)}>

              {PRODUCT_TYPE_OPTIONS.map((type) => (

                <option key={type.value} value={type.value}>{type.label}</option>

              ))}

            </select>

          </div>

          <div className="pform-field">

            <label className="pform-label">Stok</label>

            <input className="pform-input" type="number" min={0}

              placeholder="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} />

          </div>

          <div className="pform-field">

            <label className="pform-label">Malzeme</label>

            <input className="pform-input" placeholder="Örn: Yün, Pamuk"

              value={form.material} onChange={(e) => set("material", e.target.value)} maxLength={60} />

          </div>

          <div className="pform-field">

            <label className="pform-label">Boyut</label>

            <input className="pform-input" placeholder="Örn: 120x180 cm"

              value={form.size} onChange={(e) => set("size", e.target.value)} maxLength={40} />

          </div>

        </div>

        <div className="pform-field pform-field--full">

          <label className="pform-label">Açıklama</label>

          <textarea className="pform-input pform-textarea" placeholder="Ürün hikayesi ve özellikleri…"

            rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={300} />

        </div>

        <div className="pform-field pform-field--full">

          <label className="pform-label">Ürün Fotoğrafı</label>

          <div className="pform-photo-upload">

            {photoPreview ? (

              <div className="pform-photo-preview">

                <img src={photoPreview} alt={form.name || "Ürün fotoğrafı"} />

                <button

                  type="button"

                  className="pform-photo-remove"

                  onClick={() => set("photo", "")}

                  aria-label="Fotoğrafı kaldır"

                >

                  <span className="ms">close</span>

                </button>

              </div>

            ) : (

              <label className="pform-photo-drop" htmlFor={`pform-photo-${storeId}-${product?.id || "new"}`}>

                <span className="ms">add_a_photo</span>

                <span>{uploadingPhoto ? "Yükleniyor..." : "Fotoğraf seçmek için tıklayın"}</span>

              </label>

            )}

            <input

              id={`pform-photo-${storeId}-${product?.id || "new"}`}

              type="file"

              accept="image/png,image/jpeg,image/webp,image/gif"

              onChange={handlePhotoSelect}

              style={{ display: "none" }}

            />

          </div>

        </div>

        {error && <div className="pform-error">{error}</div>}

        <div className="pform-actions">

          <button type="button" className="sdash-btn sdash-btn--ghost" onClick={onCancel}>İptal</button>

          <button type="submit" className="sdash-btn sdash-btn--primary" disabled={loading || uploadingPhoto}>

            <span className="ms">{product ? "save" : "add_circle"}</span>

            {loading || uploadingPhoto ? "Kaydediliyor…" : product ? "Kaydet" : "Ürün Ekle"}

          </button>

        </div>

      </form>

    </section>

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



  if (!store) return <CreateStoreForm />;



  const products = store.products || [];



  return (

    <div className="sdash-page">
      <div className="sdash-inner">

      {/* ── Dükkan Başlık Kartı ── */}

      <section className="sdash-store-header">

        <div className="sdash-store-header__left">

          <div className="sdash-store-header__flag">{store.flag}</div>

          <div>

            <h1 className="sdash-store-header__name">{store.name}</h1>

            <div className="sdash-store-header__meta">

              <span className="sdash-store-header__cat-pill"

                style={{ color: "#c0392b", background: "rgba(192,57,43,0.08)" }}>

                {store.category}

              </span>

              <span className="sdash-store-header__loc">

                <span className="ms">location_on</span>{store.location}

              </span>

            </div>

          </div>

        </div>

        <span className="sdash-store-header__badge">

          {store.badge}

        </span>

        <svg className="sdash-store-header__deco" viewBox="0 0 100 100" preserveAspectRatio="none">

          <path d="M0,0 L100,100 M20,0 L100,80 M40,0 L100,60 M60,0 L100,40 M80,0 L100,20"

            stroke="currentColor" strokeWidth="2" fill="none" />

        </svg>

      </section>



      {/* ── Ürün Ekleme Formu ── */}

      {showProductForm && !editingProduct && (

        <ProductForm storeId={store.id} onSaved={handleProductSaved} onCancel={() => setShowProductForm(false)} />

      )}



      {/* ── Ürünler Listesi ── */}

      <section className="sdash-products-section">

        <div className="sdash-products-header">

          <div className="sdash-products-header__left">

            <span className="ms sdash-products-header__icon">inventory_2</span>

            <h2 className="sdash-products-header__title">Ürünlerim</h2>

            <span className="sdash-products-header__count">{products.length}</span>

          </div>

          {!showProductForm && !editingProduct && (

            <button className="sdash-btn sdash-btn--primary sdash-btn--sm"

              onClick={() => { setShowProductForm(true); setEditingProduct(null); }}>

              <span className="ms">add</span> Yeni Ürün

            </button>

          )}

        </div>



        {actionError && <div className="sdash-error">{actionError}</div>}



        {products.length === 0 && !showProductForm && (

          <div className="sdash-empty">

            <span className="ms sdash-empty__icon">inventory_2</span>

            <p className="sdash-empty__text">Henüz ürün eklemediniz.</p>

            <button className="sdash-btn sdash-btn--primary" onClick={() => setShowProductForm(true)}>

              <span className="ms">add</span> İlk Ürününüzü Ekleyin

            </button>

          </div>

        )}



        <div className="sdash-product-list">

          {products.map((p) => (

            <div key={p.id} className={`sdash-product-card${p.stock === 0 ? " sdash-product-card--out" : ""}`}>

              {editingProduct?.id === p.id ? (

                <ProductForm storeId={store.id} product={p}

                  onSaved={handleProductSaved} onCancel={() => setEditingProduct(null)} />

              ) : (

                <div className="sdash-product-card__inner">

                  {/* Thumbnail */}

                  <div className="sdash-product-thumb">

                    {p.photo ? (

                      <img src={resolvePhotoUrl(p.photo)} alt={p.name} className="sdash-product-thumb__img" />

                    ) : (

                      <span className="ms sdash-product-thumb__icon">

                        {PRODUCT_TYPE_ICONS[p.type] || "inventory_2"}

                      </span>

                    )}

                    {p.stock === 0 && <div className="sdash-product-thumb__sold-out"><span>Tükendi</span></div>}

                  </div>



                  {/* Bilgi */}

                  <div className="sdash-product-card__info">

                    <div className="sdash-product-card__top">

                      <div>

                        <h3 className="sdash-product-card__name">{p.name}</h3>

                        {p.description && <p className="sdash-product-card__desc">{p.description}</p>}

                      </div>

                      <div className="sdash-product-card__price-block">

                        <span className="sdash-product-card__price">₺{Number(p.price).toLocaleString("tr-TR")}</span>

                        <span className={`sdash-product-card__stock${p.stock === 0 ? " sdash-product-card__stock--out" : ""}`}>

                          Stok: {p.stock}

                        </span>

                      </div>

                    </div>



                    <div className="sdash-product-card__bottom">

                      <div className="sdash-product-card__tags">

                        {p.material && <span className="sdash-product-tag"><span className="ms">architecture</span>{p.material}</span>}

                        {p.size    && <span className="sdash-product-tag"><span className="ms">straighten</span>{p.size}</span>}

                      </div>

                      <div className="sdash-product-card__actions">

                        <button className="sdash-icon-btn" title="Düzenle"

                          onClick={() => { setEditingProduct(p); setShowProductForm(false); }}>

                          <span className="ms">edit</span>

                        </button>

                        <button className="sdash-icon-btn sdash-icon-btn--danger" title="Sil"

                          onClick={() => setDeleteConfirm(p.id)}>

                          <span className="ms">delete</span>

                        </button>

                      </div>

                    </div>



                    {deleteConfirm === p.id && (

                      <div className="sdash-delete-confirm">

                        <span>Bu ürünü silmek istediğinizden emin misiniz?</span>

                        <div className="sdash-delete-confirm__btns">

                          <button className="sdash-btn sdash-btn--ghost sdash-btn--sm"

                            onClick={() => setDeleteConfirm(null)}>Hayır</button>

                          <button className="sdash-btn sdash-btn--danger sdash-btn--sm"

                            onClick={() => handleDeleteProduct(p.id)}>

                            <span className="ms">delete</span> Evet, Sil

                          </button>

                        </div>

                      </div>

                    )}

                  </div>

                </div>

              )}

            </div>

          ))}

        </div>

      </section>

    </div>
    </div>

  );

}



