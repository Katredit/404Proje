import { useCart } from '../context/CartContext';
import { useCurrencyPrice } from '../hooks/useCurrencyPrice';
import { useTranslation } from 'react-i18next';
import './CartDrawer.css';

const API_BASE = 'http://localhost:3001';
const resolvePhotoUrl = (photo) => (photo?.startsWith('http') ? photo : `${API_BASE}${photo}`);
const CATEGORY_ICONS = {
  kilim: '🧶',
  ceramic: '🏺',
  stone: '💎',
  wood: '🪵',
  metal: '⚒️',
  textile: '🧵',
  glass: '🔮',
  leather: '👜',
  spice: '🫙',
  painting: '🖼️',
  other: '📦',
};

function CartItem({ item }) {
  const { removeItem, updateQuantity } = useCart();
  const { format } = useCurrencyPrice();
  const { t } = useTranslation();
  const { product, store, quantity } = item;

  const previewStyle = product.colors
    ? { background: `linear-gradient(135deg, ${product.colors[0]} 0%, ${product.colors[1] || '#f4f0ea'} 100%)` }
    : { background: '#ffead7' };

  return (
    <div className="cart-item">
      <div className="cart-item__thumb" style={previewStyle}>
        {product.photo ? (
          <img src={resolvePhotoUrl(product.photo)} alt={product.name} className="cart-item__thumb-img" />
        ) : (
          <span>{CATEGORY_ICONS[product.type] || '📦'}</span>
        )}
      </div>
      <div className="cart-item__info">
        <p className="cart-item__name">{product.name}</p>
        <p className="cart-item__store">{store.name}</p>
        <span className="cart-item__price">{format(product.price * quantity)}</span>
        <div className="cart-item__qty">
          <button
            className="cart-item__qty-btn"
            onClick={() => updateQuantity(product.id, store.id, -1)}
            aria-label={t('cart.decrease')}
          >−</button>
          <span className="cart-item__qty-num">{quantity}</span>
          <button
            className="cart-item__qty-btn"
            onClick={() => updateQuantity(product.id, store.id, 1)}
            aria-label={t('cart.increase')}
          >+</button>
        </div>
      </div>
      <button
        className="cart-item__remove"
        onClick={() => removeItem(product.id, store.id)}
        aria-label={t('cart.remove')}
      >
        <span className="ms">close</span>
      </button>
    </div>
  );
}

export default function CartDrawer({ onCheckout }) {
  const { items, isOpen, setIsOpen, totalCount, totalPrice } = useCart();
  const { format } = useCurrencyPrice();
  const { t } = useTranslation();

  if (!isOpen) return null;

  const shipping = totalPrice > 500 ? 0 : 29.9;

  return (
    <>
      <div className="cart-drawer-overlay" onClick={() => setIsOpen(false)} />
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label={t('cart.title')}>
        {/* Header */}
        <div className="cart-drawer__header">
          <div className="cart-drawer__title">
            <span className="ms">shopping_bag</span>
            {t('cart.title')}
            {totalCount > 0 && (
              <span className="cart-drawer__count">{totalCount}</span>
            )}
          </div>
          <button className="cart-drawer__close" onClick={() => setIsOpen(false)} aria-label={t('cart.close')}>
            <span className="ms">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="cart-drawer__body">
          {items.length === 0 ? (
            <div className="cart-drawer__empty">
              <span className="ms">shopping_cart</span>
              <p>{t('cart.empty')}</p>
              <span>{t('cart.emptyHint')}</span>
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
                <span>{t('cart.subtotalCount', { count: totalCount })}</span>
                <span>{format(totalPrice)}</span>
              </div>
              <div className="cart-drawer__summary-row">
                <span>{t('cart.shipping')}</span>
                <span>{shipping === 0 ? t('cart.shippingFree') : format(shipping)}</span>
              </div>
              <div className="cart-drawer__summary-row cart-drawer__summary-row--total">
                <span>{t('cart.total')}</span>
                <span>{format(totalPrice + shipping)}</span>
              </div>
            </div>
            <button
              className="cart-drawer__checkout-btn"
              onClick={() => { setIsOpen(false); onCheckout(); }}
            >
              <span className="ms">payments</span>
              {t('cart.checkout')}
            </button>
            <button
              className="cart-drawer__continue-btn"
              onClick={() => setIsOpen(false)}
            >
              {t('cart.continueShopping')}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
