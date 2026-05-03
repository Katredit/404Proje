import '../pages/StoreDetail.css';

function Product3DModal({ product, store, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose} aria-label="Kapat">✕</button>

        <div className="modal__content">
          {/* Ürün Bilgileri */}
          <div className="modal__info">
            <span
              className="modal__category-tag"
              style={{ backgroundColor: store.accentColor + '22', color: store.accentColor }}
            >
              {store.category}
            </span>

            <h2 className="modal__name">{product.name}</h2>

            <div className="modal__price">
              ₺{product.price.toLocaleString('tr-TR')}
            </div>

            <p className="modal__desc">{product.description}</p>

            {/* Teknik özellikler */}
            <div className="modal__specs">
              {product.material && (
                <div className="modal__spec-row">
                  <span className="modal__spec-label">Malzeme</span>
                  <span className="modal__spec-val">{product.material}</span>
                </div>
              )}
              {product.size && (
                <div className="modal__spec-row">
                  <span className="modal__spec-label">Boyut</span>
                  <span className="modal__spec-val">{product.size}</span>
                </div>
              )}
              {product.height && (
                <div className="modal__spec-row">
                  <span className="modal__spec-label">Yükseklik</span>
                  <span className="modal__spec-val">{product.height}</span>
                </div>
              )}
              {product.pieces && (
                <div className="modal__spec-row">
                  <span className="modal__spec-label">Parça</span>
                  <span className="modal__spec-val">{product.pieces}</span>
                </div>
              )}
              <div className="modal__spec-row">
                <span className="modal__spec-label">Stok</span>
                <span className="modal__spec-val">{product.stock} adet</span>
              </div>
            </div>

            {/* Renk paleti */}
            {product.colors && (
              <div className="modal__colors">
                <span className="modal__colors-label">Renkler</span>
                <div className="modal__color-dots">
                  {product.colors.map((c, i) => (
                    <span
                      key={i}
                      className="modal__color-dot"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Mağaza bilgisi */}
            <div className="modal__store-info">
              <span className="modal__store-name">📍 {store.name}</span>
              <span className="modal__store-owner">👤 {store.owner}</span>
            </div>

            {/* Aksiyonlar */}
            <div className="modal__actions">
              <button
                className="modal__btn modal__btn--buy"
                style={{ backgroundColor: store.accentColor }}
              >
                🛒 Sepete Ekle
              </button>
              <button className="modal__btn modal__btn--fav">
                ♡ Favorilere Ekle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Product3DModal;
