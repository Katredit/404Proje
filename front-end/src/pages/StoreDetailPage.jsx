import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Product3DModal from '../components/Product3DModal';
import { useTranslatedStore } from '../hooks/useTranslatedStore';
import './StoreDetail.css';

const CATEGORY_ICONS = { kilim: '🧶', ceramic: '🏺', other: '📦' };

function ProductCard({ product, store, onView3D }) {
  const { t } = useTranslation();
  const is3D = product.type === 'kilim' || product.type === 'ceramic';

  const previewStyle = product.colors
    ? { background: `linear-gradient(135deg, ${product.colors[0]} 0%, ${product.colors[1] || '#f4f0ea'} 100%)` }
    : { background: '#ffead7' };

  return (
    <article className={`pcard${is3D ? ' pcard--3d' : ''}`}>
      {/* Önizleme alanı */}
      <div className="pcard__preview" style={previewStyle}>
        {is3D && (
          <div className="pcard__3d-badge">
            <span className="ms">view_in_ar</span> 3D
          </div>
        )}
        <span className="pcard__icon">{CATEGORY_ICONS[product.type] || '📦'}</span>
        <div className="pcard__hover-overlay">
          <button className="pcard__quick-btn">Hızlı Ekle</button>
        </div>
      </div>

      {/* Gövde */}
      <div className="pcard__body">
        <div className="pcard__top-row">
          <h3 className="pcard__name">{product.name}</h3>
          <span className="pcard__price">₺{product.price.toLocaleString('tr-TR')}</span>
        </div>
        <p className="pcard__desc">{product.description}</p>
        <div className="pcard__tags">
          {product.material && <span className="pcard__tag">{product.material}</span>}
          {product.size     && <span className="pcard__tag">{product.size}</span>}
          {product.height   && <span className="pcard__tag">{product.height}</span>}
          <span className="pcard__tag pcard__tag--stock">
            {t('storeDetail.stock', { count: product.stock })}
          </span>
        </div>
      </div>

      {/* Aksiyon */}
      <div className="pcard__actions">
        {is3D ? (
          <button className="pcard__btn pcard__btn--3d" onClick={() => onView3D(product)}>
            <span className="ms">view_in_ar</span> {t('storeDetail.view3D')}
          </button>
        ) : product.colors ? (
          <div className="pcard__colors">
            {product.colors.map((c, i) => (
              <span key={i} className="pcard__color-dot" style={{ backgroundColor: c }} />
            ))}
          </div>
        ) : (
          <span />
        )}
        <button className="pcard__btn pcard__btn--buy">
          <span className="ms">shopping_cart</span> {t('storeDetail.addToCart')}
        </button>
      </div>
    </article>
  );
}

function StoreDetailPage({ store: rawStore, onBack }) {
  const { t } = useTranslation();
  const store = useTranslatedStore(rawStore);
  const [activeProduct, setActiveProduct] = useState(null);

  if (!store) return null;

  return (
    <div className="store-detail">
      {/* ── Sticky Navbar ── */}
      <div className="sd-navbar-outer">
        <header className="sd-navbar">
          <button className="sd-navbar__back" onClick={onBack}>
            <span className="ms">arrow_back</span>
            {t('storeDetail.back')}
          </button>
          <div className="sd-navbar__brand">
            <span className="sd-navbar__flag">{store.flag}</span>
            <div>
              <span className="sd-navbar__name">{store.name}</span>
              <span className="sd-navbar__meta">{store.category} · ⭐ {store.rating}</span>
            </div>
          </div>
          <div className="sd-navbar__actions">
            <button className="sd-navbar__icon-btn"><span className="ms">shopping_basket</span></button>
            <button className="sd-navbar__icon-btn"><span className="ms">person</span></button>
          </div>
        </header>
      </div>

      <main className="sd-main">
        {/* ── Hero ── */}
        <section className="sd-hero" style={{ borderBottomColor: store.accentColor }}>
          <div className="sd-hero__left">
            <div className="sd-hero__avatar" style={{ backgroundColor: store.color + '22' }}>
              <span>{store.flag}</span>
            </div>
            <div className="sd-hero__info">
              <h1 className="sd-hero__name">{store.name}</h1>
              <p className="sd-hero__desc">{store.description}</p>
              <div className="sd-hero__chips">
                <span className="sd-hero__chip">
                  <span className="ms">location_on</span> {store.location}
                </span>
                <span className="sd-hero__chip">
                  <span className="ms">person</span> {store.owner}
                </span>
                <span className="sd-hero__chip">
                  <span className="ms">storefront</span> {t('storeDetail.since', { year: store.openSince })}
                </span>
              </div>
            </div>
          </div>
          <div className="sd-hero__stats">
            <div className="sd-hero__stat">
              <span className="sd-hero__stat-val" style={{ color: store.accentColor }}>{store.rating}</span>
              <span className="sd-hero__stat-lbl">{t('storeDetail.score')}</span>
            </div>
            <div className="sd-hero__divider" />
            <div className="sd-hero__stat">
              <span className="sd-hero__stat-val">{store.reviewCount}</span>
              <span className="sd-hero__stat-lbl">{t('storeDetail.reviews')}</span>
            </div>
            <div className="sd-hero__divider" />
            <div className="sd-hero__stat">
              <span className="sd-hero__stat-val">{store.products.length}</span>
              <span className="sd-hero__stat-lbl">{t('storeDetail.products')}</span>
            </div>
          </div>
        </section>

        {/* ── Ürünler başlık ── */}
        <div className="sd-products-header">
          <h2 className="sd-products-title">{t('storeDetail.productsTitle')}</h2>
          <button className="sd-filter-btn">
            Filtrele <span className="ms">filter_list</span>
          </button>
        </div>

        {/* ── Ürün ızgaraı ── */}
        {store.products.length === 0 ? (
          <div className="sd-empty">
            <span className="ms" style={{ fontSize: 56, color: '#c9b6b0' }}>inventory_2</span>
            <p>Henüz ürün eklenmemiş.</p>
          </div>
        ) : (
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
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="sd-footer">
        <div className="sd-footer__inner">
          <span className="sd-footer__brand">Kapadokya Çarşısı</span>
          <nav className="sd-footer__links">
            <a href="#">Hakkımızda</a>
            <a href="#">Kullanım Koşulları</a>
            <a href="#">Gizlilik Politikası</a>
            <a href="#">İletişim</a>
          </nav>
          <span className="sd-footer__copy">© 2024 Kapadokya Çarşısı. Tüm Hakları Saklıdır.</span>
        </div>
      </footer>

      {/* ── 3D Modal ── */}
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
