import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MarketScene from './components/MarketScene';
import StorePanel from './components/StorePanel';
import StoreListSidebar from './components/StoreListSidebar';
import StoreDetailPage from './pages/StoreDetailPage';
import AIDesignPage from './pages/AIDesignPage';
import SellerPage from './pages/SellerPage';
import LanguageSwitcher from './components/LanguageSwitcher';
import { stores as staticStores, positions as storePositions } from './data/stores';
import './App.css';

function App() {
  const { t } = useTranslation();
  const [selectedStore, setSelectedStore] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('market'); // 'market' | 'ai' | 'seller'
  const [visitingStore, setVisitingStore] = useState(null);

  // Dinamik satıcılar: localStorage'dan yükle
  const [dynamicStores, setDynamicStores] = useState(() => {
    try {
      const saved = localStorage.getItem('kappadokya_sellers');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Tüm mağazalar = statik + dinamik
  const allStores = [...staticStores, ...dynamicStores];

  // Yeni satıcı ekle
  const handleAddSeller = (sellerData) => {
    const newStore = {
      ...sellerData,
      id: Date.now(),
      rating: 5.0,
      reviewCount: 0,
      products: [],
      badge: 'Yeni',
      position: storePositions[(dynamicStores.length + staticStores.length) % storePositions.length],
    };
    const updated = [...dynamicStores, newStore];
    setDynamicStores(updated);
    localStorage.setItem('kappadokya_sellers', JSON.stringify(updated));
    setActivePage('market');
  };

  // Mağaza sayfasında isek (kendi navbar'ı var)
  if (visitingStore) {
    return (
      <div className="app">
        <StoreDetailPage
          store={visitingStore}
          onBack={() => setVisitingStore(null)}
        />
      </div>
    );
  }

  return (
    <div className="app">
      {/* ── Her sayfada ortak navbar ── */}
      <div className="navbar-outer">
        <header className="navbar">
          <div className="navbar__brand" onClick={() => setActivePage('market')}>
            <span className="navbar__logo">🏔️</span>
            <div className="navbar__brand-text">
              <span className="navbar__title">{t('nav.brand')}</span>
              <span className="navbar__subtitle">{t('nav.subtitle')}</span>
            </div>
          </div>
          <nav className="navbar__links">
            <button
              className={`navbar__link${activePage === 'market' ? ' navbar__link--active' : ''}`}
              onClick={() => setActivePage('market')}
            >{t('nav.market')}</button>
            <button
              className={`navbar__link${activePage === 'ai' ? ' navbar__link--active' : ''}`}
              onClick={() => setActivePage('ai')}
            >{t('nav.aiLong')}</button>
            <button
              className={`navbar__link${activePage === 'seller' ? ' navbar__link--active' : ''}`}
              onClick={() => setActivePage('seller')}
            >{t('nav.seller')}</button>
          </nav>
          <div className="navbar__actions">
            <button className="navbar__btn navbar__btn--icon"><span className="ms">search</span></button>
            <button className="navbar__btn navbar__btn--icon"><span className="ms">shopping_basket</span></button>
            <button className="navbar__btn navbar__btn--primary">{t('nav.login')}</button>
            <LanguageSwitcher />
          </div>
        </header>
      </div>

      {/* ── AI Tasarım sayfası ── */}
      {activePage === 'ai' && (
        <AIDesignPage onBack={() => setActivePage('market')} onNavigate={setActivePage} />
      )}

      {/* ── Satıcı Ol sayfası ── */}
      {activePage === 'seller' && (
        <SellerPage
          onBack={() => setActivePage('market')}
          onSubmit={handleAddSeller}
          onNavigate={setActivePage}
        />
      )}

      {/* ── Çarşı sayfası ── */}
      {activePage === 'market' && <main className="main">
        <button
          className={`sidebar-toggle${sidebarOpen ? ' sidebar-toggle--open' : ''}`}
          onClick={() => setSidebarOpen((v) => !v)}
          title={t('sidebar.title')}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        <div className={`sidebar-wrapper${sidebarOpen ? ' sidebar-wrapper--open' : ''}`}>
          <StoreListSidebar
            stores={allStores}
            selectedStore={selectedStore}
            onSelectStore={setSelectedStore}
            hoveredId={hoveredId}
            onHover={setHoveredId}
          />
        </div>

        <div className="canvas-wrapper">
          <MarketScene
            stores={allStores}
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />
          <div className="canvas-hint">
            <span className="canvas-hint__item"><span className="ms">mouse</span>{t('market.hintRotate')}</span>
            <span className="canvas-hint__sep">•</span>
            <span className="canvas-hint__item"><span className="ms">swap_vert</span>{t('market.hintZoom')}</span>
            <span className="canvas-hint__sep">•</span>
            <span className="canvas-hint__item"><span className="ms">store</span>{t('market.hintClick')}</span>
          </div>
          {!selectedStore && (
            <div className="canvas-overlay">
              <h1 className="canvas-overlay__title">{t('market.title')}</h1>
              <p className="canvas-overlay__sub">{t('market.subtitle')}</p>
            </div>
          )}
        </div>

        {selectedStore && (
          <div className="panel-wrapper">
            <StorePanel
              store={selectedStore}
              onClose={() => setSelectedStore(null)}
              onVisit={(s) => { setVisitingStore(s); setSelectedStore(null); }}
            />
          </div>
        )}
      </main>}
    </div>
  );
}

export default App;
