import { useTranslation } from 'react-i18next';

const CAT_ICONS = {
  'Kilim': 'grid_view',
  'Seramik': 'dining',
  'Porselen': 'dining',
  'Taş': 'diamond',
  'Takı': 'diamond',
  'default': 'storefront',
};

function getCatIcon(category) {
  if (!category) return CAT_ICONS.default;
  for (const key of Object.keys(CAT_ICONS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return CAT_ICONS[key];
  }
  return CAT_ICONS.default;
}

function StoreListSidebar({ stores, selectedStore, onSelectStore, hoveredId, onHover }) {
  const { t } = useTranslation();
  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <h2 className="sidebar__title">{t('sidebar.title')}</h2>
        <p className="sidebar__subtitle">{t('sidebar.subtitle')}</p>
      </div>
      <ul className="sidebar__list">
        {stores.map((store) => {
          const isActive = selectedStore?.id === store.id;
          const isHov = hoveredId === store.id;
          const icon = getCatIcon(store.category);
          return (
            <li
              key={store.id}
              className={`sidebar__item${isActive ? ' sidebar__item--active' : ''}${isHov ? ' sidebar__item--hovered' : ''}`}
              onClick={() => onSelectStore(isActive ? null : store)}
              onMouseEnter={() => onHover(store.id)}
              onMouseLeave={() => onHover(null)}
            >
              <span className="sidebar__item-icon ms">{icon}</span>
              <div className="sidebar__item-body">
                <span className="sidebar__item-name">{store.name}</span>
                <span className="sidebar__item-cat">{store.category}</span>
              </div>
              <span className="sidebar__item-rating">⭐ {store.rating}</span>
            </li>
          );
        })}
      </ul>
      <button className="sidebar__filter-btn">
        <span className="ms" style={{fontSize:16}}>filter_list</span>{t('sidebar.filter')}
      </button>
    </div>
  );
}

export default StoreListSidebar;
