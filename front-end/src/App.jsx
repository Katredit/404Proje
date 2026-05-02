import { useState, useEffect } from 'react';
import MarketScene from './components/MarketScene';
import StorePanel from './components/StorePanel';
import StoreListSidebar from './components/StoreListSidebar';
import StoreDetailPage from './pages/StoreDetailPage';
import AIDesignPage from './pages/AIDesignPage';
import SellerPage from './pages/SellerPage';
import { stores as staticStores } from './data/stores';
import './App.css';

// Yeni satıcı için 3D pozisyon hesapla
function autoPosition(index) {
  const positions = [
    [-4, 0, 4], [4, 0, 4], [-8, 0, 4], [8, 0, 4],
    [-12, 0, -2], [12, 0, -2], [-12, 0, 4], [12, 0, 4],
    [0, 0, 8], [-6, 0, 8], [6, 0, 8],
  ];
  return positions[index % positions.length] || [0, 0, index * 5];
}

function App() {
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
      position: autoPosition(dynamicStores.length + staticStores.length),
    };
    const updated = [...dynamicStores, newStore];
    setDynamicStores(updated);
    localStorage.setItem('kappadokya_sellers', JSON.stringify(updated));
    setActivePage('market');
  };

  // Mağaza sayfasında isek
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

  // Yapay Zeka Tasarım sayfası
  if (activePage === 'ai') {
    return (
      <div className="app">
        <AIDesignPage onBack={() => setActivePage('market')} />
      </div>
    );
  }

  // Satıcı Ol sayfası
  if (activePage === 'seller') {
    return (
      <div className="app">
        <SellerPage
          onBack={() => setActivePage('market')}
          onSubmit={handleAddSeller}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="navbar-outer">
        <header className="navbar">
          <div className="navbar__brand" onClick={() => setActivePage('market')}>
            <span className="navbar__logo">🏔️</span>
            <div className="navbar__brand-text">
              <span className="navbar__title">Kapadokya Çarşısı</span>
              <span className="navbar__subtitle">El Sanatları & Yöresel Ürünler</span>
            </div>
          </div>
          <nav className="navbar__links">
            <button
              className={`navbar__link${activePage === 'market' ? ' navbar__link--active' : ''}`}
              onClick={() => setActivePage('market')}
            >Çarşı</button>
            <button
              className={`navbar__link${activePage === 'ai' ? ' navbar__link--active' : ''}`}
              onClick={() => setActivePage('ai')}
            >Yapay Zeka Tasarım</button>
            <button
              className={`navbar__link${activePage === 'seller' ? ' navbar__link--active' : ''}`}
              onClick={() => setActivePage('seller')}
            >Satıcı Ol</button>
          </nav>
          <div className="navbar__actions">
            <button className="navbar__btn navbar__btn--icon"><span className="ms">search</span></button>
            <button className="navbar__btn navbar__btn--icon"><span className="ms">shopping_basket</span></button>
            <button className="navbar__btn navbar__btn--primary">Giriş Yap</button>
          </div>
        </header>
      </div>

      <main className="main">
        <button
          className={`sidebar-toggle${sidebarOpen ? ' sidebar-toggle--open' : ''}`}
          onClick={() => setSidebarOpen((v) => !v)}
          title="Mağaza listesini göster/gizle"
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
            <span className="canvas-hint__item"><span className="ms">mouse</span>Sürükle: döndür</span>
            <span className="canvas-hint__sep">•</span>
            <span className="canvas-hint__item"><span className="ms">swap_vert</span>Scroll: zoom</span>
            <span className="canvas-hint__sep">•</span>
            <span className="canvas-hint__item"><span className="ms">store</span>Mağazaya tıkla: detay</span>
          </div>
          {!selectedStore && (
            <div className="canvas-overlay">
              <h1 className="canvas-overlay__title">Kapadokya 3D Çarşısı</h1>
              <p className="canvas-overlay__sub">Mağazaları keşfetmek için tıkla veya döndür</p>
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
      </main>
    </div>
  );
}

export default App;
