import { useTranslation } from 'react-i18next';
import { useTranslatedStore } from '../hooks/useTranslatedStore';
import { useCurrencyPrice } from '../hooks/useCurrencyPrice';

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

function StorePanel({ store: rawStore, onClose, onVisit }) {
  const { t } = useTranslation();
  const store = useTranslatedStore(rawStore);
  const { format } = useCurrencyPrice();
  if (!store) return null;

  const bgColor = store.accentColor ? store.accentColor + '22' : '#fce4cc';

  return (
    <>
      <div className="store-panel__img-area" style={{ background: bgColor }}>
        <div className="store-panel__img-fallback">{store.flag}</div>
        <button className="store-panel__close" onClick={onClose} aria-label={t('panel.close')}>
          <span className="ms">close</span>
        </button>
      </div>

      <div className="store-panel">
        <div className="store-panel__top-row">
          <h3 className="store-panel__name">{store.name}</h3>
          <div className="store-panel__rating-badge">
            <span className="ms" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="store-panel__rating-num">{store.rating}</span>
          </div>
        </div>

        <p className="store-panel__description">{store.description}</p>

        <div className="store-panel__stats">
          <div className="store-panel__stat">
            <span className="store-panel__stat-val">{store.products.length}</span>
            <span className="store-panel__stat-lbl">{t('panel.products')}</span>
          </div>
          <div className="store-panel__stat">
            <span className="store-panel__stat-val">{store.reviewCount ?? 0}</span>
            <span className="store-panel__stat-lbl">{t('panel.reviews')}</span>
          </div>
        </div>

        <div className="store-panel__products">
          <h4 className="store-panel__products-title">{t('panel.featured')}</h4>
          <div className="store-panel__product-scroll">
            {store.products.map((p) => (
              <div key={p.id} className="store-panel__product-thumb">
                <div
                  className="store-panel__product-img"
                  style={{ background: (p.colors?.[0] ?? '#fce4cc') + '33' }}
                >
                  {p.photo ? (
                    <img src={resolvePhotoUrl(p.photo)} alt={p.name} className="store-panel__product-img-photo" />
                  ) : (
                    CATEGORY_ICONS[p.type] || '📦'
                  )}
                </div>
                <div className="store-panel__product-name">{p.name}</div>
                <div className="store-panel__product-price">{format(p.price)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="store-panel__actions">
          <button
            className="store-panel__btn store-panel__btn--primary"
            onClick={() => onVisit && onVisit(store)}
          >
            {t('panel.visit')}
          </button>
        </div>
      </div>
    </>
  );
}

export default StorePanel;
