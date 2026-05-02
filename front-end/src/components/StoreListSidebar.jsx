function StoreListSidebar({ stores, selectedStore, onSelectStore, hoveredId, onHover }) {
  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <h3 className="sidebar__title">Tüm Mağazalar</h3>
        <span className="sidebar__count">{stores?.length ?? 0} mağaza</span>
      </div>
      <ul className="sidebar__list">
        {stores.map((store) => {
          const isActive = selectedStore?.id === store.id;
          const isHov = hoveredId === store.id;
          return (
            <li
              key={store.id}
              className={`sidebar__item${isActive ? ' sidebar__item--active' : ''}${isHov ? ' sidebar__item--hovered' : ''}`}
              style={isActive ? { borderLeftColor: store.accentColor } : {}}
              onClick={() => onSelectStore(isActive ? null : store)}
              onMouseEnter={() => onHover(store.id)}
              onMouseLeave={() => onHover(null)}
            >
              <span className="sidebar__item-flag">{store.flag}</span>
              <div className="sidebar__item-body">
                <span className="sidebar__item-name">{store.name}</span>
                <span className="sidebar__item-cat">{store.category}</span>
              </div>
              <span className="sidebar__item-rating">⭐ {store.rating}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default StoreListSidebar;
