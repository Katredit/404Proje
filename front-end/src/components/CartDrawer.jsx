import { useCart } from '../context/CartContext';
import { useCurrencyPrice } from '../hooks/useCurrencyPrice';
import './CartDrawer.css';

const CATEGORY_ICONS = { kilim: '🧶', ceramic: '🏺', other: '📦' };

function CartItem({ item }) {
  const { removeItem, updateQuantity } = useCart();
  const { format } = useCurrencyPrice();
  const { product, store, quantity } = item;

  const previewStyle = product.colors
    ? { background: `linear-gradient(135deg, ${product.colors[0]} 0%, ${product.colors[1] || '#f4f0ea'} 100%)` }
    : { background: '#ffead7' };

  return (
    <div className="cart-item">
      <div className="cart-item__thumb" style={previewStyle}>
        <span>{CATEGORY_ICONS[product.type] || '📦'}</span>
      </div>
      <div className="cart-item__info">
        <p className="cart-item__name">{product.name}</p>
        <p className="cart-item__store">{store.name}</p>
        <span className="cart-item__price">{format(product.price * quantity)}</span>
        <div className="cart-item__qty">
          <button
            className="cart-item__qty-btn"
            onClick={() => updateQuantity(product.id, store.id, -1)}
            aria-label="Azalt"
          >−</button>
          <span className="cart-item__qty-num">{quantity}</span>
          <button
            className="cart-item__qty-btn"
            onClick={() => updateQuantity(product.id, store.id, 1)}
            aria-label="Artır"
          >+</button>
        </div>
      </div>
      <button
        className="cart-item__remove"
        onClick={() => removeItem(product.id, store.id)}
        aria-label="Kaldır"
      >
        <span className="ms">close</span>
      </button>
    </div>
  );
}

export default function CartDrawer({ onCheckout }) {
  const { items, isOpen, setIsOpen, totalCount, totalPrice } = useCart();
  const { format } = useCurrencyPrice();

  if (!isOpen) return null;

  const shipping = totalPrice > 500 ? 0 : 29.9;

  return (
    <>
      <div className="cart-drawer-overlay" onClick={() => setIsOpen(false)} />
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Sepetim">
        {/* Header */}
        <div className="cart-drawer__header">
          <div className="cart-drawer__title">
            <span className="ms">shopping_bag</span>
            Sepetim
            {totalCount > 0 && (
              <span className="cart-drawer__count">{totalCount}</span>
            )}
          </div>
          <button className="cart-drawer__close" onClick={() => setIsOpen(false)} aria-label="Kapat">
            <span className="ms">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="cart-drawer__body">
          {items.length === 0 ? (
            <div className="cart-drawer__empty">
              <span className="ms">shopping_cart</span>
              <p>Sepetiniz boş</p>
              <span>Ürünleri keşfetmek için mağazaları ziyaret edin</span>
            </div>
          ) : (
            items.map((item, idx) => <CartItem key={idx} item={item} />)
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-drawer__footer">
            <div className="cart-drawer__summary">
              <div className="cart-drawer__summary-row">
                <span>Ara toplam ({totalCount} ürün)</span>
                <span>{format(totalPrice)}</span>
              </div>
              <div className="cart-drawer__summary-row">
                <span>Kargo</span>
                <span>{shipping === 0 ? 'Ücretsiz' : format(shipping)}</span>
              </div>
              <div className="cart-drawer__summary-row cart-drawer__summary-row--total">
                <span>Toplam</span>
                <span>{format(totalPrice + shipping)}</span>
              </div>
            </div>
            <button
              className="cart-drawer__checkout-btn"
              onClick={() => { setIsOpen(false); onCheckout(); }}
            >
              <span className="ms">payments</span>
              Alışverişi Tamamla
            </button>
            <button
              className="cart-drawer__continue-btn"
              onClick={() => setIsOpen(false)}
            >
              Alışverişe Devam Et
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
