import { useState } from 'react';
import Product3DModal from '../components/Product3DModal';
import './StoreDetail.css';

const CATEGORY_ICONS = {
  'kilim': '🧶',
  'ceramic': '🏺',
  'other': '📦',
};

function ProductCard({ product, store, onView3D }) {
  const is3D = product.type === 'kilim' || product.type === 'ceramic';

  const previewStyle = product.colors
    ? { background: `linear-gradient(135deg, ${product.colors[0]} 0%, ${product.colors[1] || '#fff'} 100%)` }
    : { background: '#f4f0ea' };

  return (
    <div className={`pcard${is3D ? ' pcard--3d' : ''}`}>
      {is3D && (
        <div
          className="pcard__3d-stripe"
          style={{ backgroundColor: store.accentColor }}
        />
      )}

      {/* Önizleme alanı */}
      <div className="pcard__preview" style={previewStyle}>
        <span className="pcard__icon">{CATEGORY_ICONS[product.type]}</span>
        {is3D && <span className="pcard__3d-badge">3D</span>}
      </div>

      {/* Bilgi */}
      <div className="pcard__body">
        <div className="pcard__header">
          <h3 className="pcard__name">{product.name}</h3>
          <span className="pcard__price">₺{product.price.toLocaleString('tr-TR')}</span>
        </div>

        <p className="pcard__desc">{product.description}</p>

        <div className="pcard__tags">
          {product.material && <span className="pcard__tag">📌 {product.material}</span>}
          {product.size && <span className="pcard__tag">📐 {product.size}</span>}
          {product.height && <span className="pcard__tag">📏 {product.height}</span>}
          <span className="pcard__tag">📦 {product.stock} adet</span>
        </div>

        {product.colors && (
          <div className="pcard__colors">
            {product.colors.map((c, i) => (
              <span
                key={i}
                className="pcard__color-dot"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Aksiyon butonları */}
      <div className="pcard__actions">
        {is3D && (
          <button
            className="pcard__btn pcard__btn--3d"
            style={{ borderColor: store.accentColor, color: store.accentColor }}
            onClick={() => onView3D(product)}
          >
            🔍 3D İncele
          </button>
        )}
        <button
          className="pcard__btn pcard__btn--buy"
          style={{ backgroundColor: store.accentColor }}
        >
          🛒 Sepete Ekle
        </button>
      </div>
    </div>
  );
}

function StoreDetailPage({ store, onBack }) {
  const [activeProduct, setActiveProduct] = useState(null);

  return (
    <div className="store-detail">
      {/* ── Üst Navigasyon ── */}
      <header className="store-detail__navbar">
        <button className="store-detail__back" onClick={onBack}>
          ← Çarşıya Dön
        </button>
        <div className="store-detail__brand">
          <span className="store-detail__flag">{store.flag}</span>
          <div>
            <h1 className="store-detail__title">{store.name}</h1>
            <span className="store-detail__meta">
              {store.category} &nbsp;·&nbsp; {store.location} &nbsp;·&nbsp;
              ⭐ {store.rating} ({store.reviewCount} yorum)
            </span>
          </div>
        </div>
        <div className="store-detail__nav-actions">
          <button className="store-detail__nav-btn">🔍</button>
          <button className="store-detail__nav-btn">🛒</button>
        </div>
      </header>

      {/* ── Mağaza Hero Bandı ── */}
      <div
        className="store-detail__hero"
        style={{ borderBottomColor: store.accentColor }}
      >
        <div className="store-detail__hero-left">
          <div
            className="store-detail__avatar"
            style={{ backgroundColor: store.color + '22', borderColor: store.accentColor }}
          >
            <span style={{ fontSize: 36 }}>{store.flag}</span>
          </div>
          <div>
            <div className="store-detail__badge" style={{ backgroundColor: store.accentColor }}>
              {store.badge}
            </div>
            <p className="store-detail__desc">{store.description}</p>
            <div className="store-detail__info-row">
              <span>👤 {store.owner}</span>
              <span>🗓️ {store.openSince}'den beri</span>
              <span>📍 {store.location}</span>
            </div>
          </div>
        </div>
        <div className="store-detail__hero-stats">
          <div className="store-detail__stat">
            <span className="store-detail__stat-val">{store.rating}</span>
            <span className="store-detail__stat-lbl">Puan</span>
          </div>
          <div className="store-detail__stat">
            <span className="store-detail__stat-val">{store.reviewCount}</span>
            <span className="store-detail__stat-lbl">Yorum</span>
          </div>
          <div className="store-detail__stat">
            <span className="store-detail__stat-val">{store.products.length}</span>
            <span className="store-detail__stat-lbl">Ürün</span>
          </div>
        </div>
      </div>

      {/* ── Ürün Izgarası ── */}
      <main className="store-detail__main">
        <div className="store-detail__section-header">
          <h2 className="store-detail__section-title">Ürünler</h2>
          <span className="store-detail__section-sub">
            {store.products.filter(p => p.type !== 'other').length} ürün 3D görüntülenebilir
          </span>
        </div>

        <div className="product-grid">
          {store.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              store={store}
              onView3D={setActiveProduct}
            />
          ))}
        </div>
      </main>

      {/* ── 3D Ürün Modal ── */}
      {activeProduct && (
        <Product3DModal
          product={activeProduct}
          store={store}
          onClose={() => setActiveProduct(null)}
        />
      )}
    </div>
  );
}

export default StoreDetailPage;
