import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useCurrencyPrice } from '../hooks/useCurrencyPrice';
import './CartSidebar.css';

export default function CartSidebar({ onCheckout }) {
  const { t } = useTranslation();
  const { items, removeItem, updateQty, totalCount, totalPrice, cartOpen, setCartOpen } = useCart();
  const { format } = useCurrencyPrice();

  if (!cartOpen) return null;

  return (
    <>
      <div className="cart-overlay" onClick={() => setCartOpen(false)} />
      <aside className="cart-sidebar">
        <div className="cart-sidebar__header">
          <h2 className="cart-sidebar__title">
            <span className="ms">shopping_basket</span>
            {t('cart.title')}
            {totalCount > 0 && <span className="cart-sidebar__count">{totalCount}</span>}
          </h2>
          <button className="cart-sidebar__close" onClick={() => setCartOpen(false)}>
            <span className="ms">close</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-sidebar__empty">
            <span className="ms cart-sidebar__empty-icon">shopping_basket</span>
            <p>{t('cart.empty')}</p>
          </div>
        ) : (
          <>
            <ul className="cart-sidebar__list">
              {items.map(item => (
                <li key={`${item.storeId}-${item.product.id}`} className="cart-item">
                  <div className="cart-item__info">
                    <span className="cart-item__store">{item.storeFlag} {item.storeName}</span>
                    <span className="cart-item__name">{item.product.name}</span>
                    <span className="cart-item__price">{format(item.product.price)}</span>
                  </div>
                  <div className="cart-item__controls">
                    <button className="cart-item__qty-btn" onClick={() => updateQty(item.product.id, item.storeId, item.qty - 1)}>
                      <span className="ms">remove</span>
                    </button>
                    <span className="cart-item__qty">{item.qty}</span>
                    <button className="cart-item__qty-btn" onClick={() => updateQty(item.product.id, item.storeId, item.qty + 1)}>
                      <span className="ms">add</span>
                    </button>
                    <button className="cart-item__remove" onClick={() => removeItem(item.product.id, item.storeId)}>
                      <span className="ms">delete</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="cart-sidebar__footer">
              <div className="cart-sidebar__total">
                <span>{t('cart.total')}</span>
                <strong>{format(totalPrice)}</strong>
              </div>
              <button
                className="cart-sidebar__checkout-btn"
                onClick={() => { setCartOpen(false); onCheckout(); }}
              >
                <span className="ms">payment</span>
                {t('cart.checkout')}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
