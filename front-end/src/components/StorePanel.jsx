function StorePanel({ store, onClose, onVisit }) {
  if (!store) return null;

  return (
    <div className="store-panel">
      <button className="store-panel__close" onClick={onClose} aria-label="Kapat">
        ✕
      </button>

      <div className="store-panel__header" style={{ borderColor: store.accentColor }}>
        <span className="store-panel__flag">{store.flag}</span>
        <div>
          <h2 className="store-panel__name">{store.name}</h2>
          <span className="store-panel__category">{store.category}</span>
        </div>
      </div>

      <div className="store-panel__badge" style={{ backgroundColor: store.accentColor }}>
        {store.badge}
      </div>

      <div className="store-panel__rating">
        {'⭐'.repeat(Math.round(store.rating))}
        <span className="store-panel__rating-text">
          {store.rating} ({store.reviewCount} yorum)
        </span>
      </div>

      <p className="store-panel__description">{store.description}</p>

      <div className="store-panel__info">
        <div className="store-panel__info-item">
          <span className="store-panel__info-icon">📍</span>
          <span>{store.location}</span>
        </div>
        <div className="store-panel__info-item">
          <span className="store-panel__info-icon">👤</span>
          <span>{store.owner}</span>
        </div>
        <div className="store-panel__info-item">
          <span className="store-panel__info-icon">🗓️</span>
          <span>{store.openSince}'den beri açık</span>
        </div>
      </div>

      <div className="store-panel__products">
        <h3 className="store-panel__products-title">Öne Çıkan Ürünler</h3>
        <ul className="store-panel__product-list">
          {store.products.map((p) => (
            <li key={p.id} className="store-panel__product-item">
              <span
                className="store-panel__product-dot"
                style={{ backgroundColor: store.accentColor }}
              />
              {p.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="store-panel__actions">
        <button
          className="store-panel__btn store-panel__btn--primary"
          style={{ backgroundColor: store.accentColor }}
          onClick={() => onVisit && onVisit(store)}
        >
          Mağazayı Ziyaret Et
        </button>
        <button className="store-panel__btn store-panel__btn--secondary">
          Favorilere Ekle
        </button>
      </div>
    </div>
  );
}

export default StorePanel;
