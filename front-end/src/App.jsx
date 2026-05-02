import { useState } from 'react';
import MarketScene from './components/MarketScene';
import StorePanel from './components/StorePanel';
import StoreListSidebar from './components/StoreListSidebar';
import './App.css';

function App() {
  const [selectedStore, setSelectedStore] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app">
      <header className="navbar">
        <div className="navbar__brand">
          <span className="navbar__logo">🏔️</span>
          <div>
            <span className="navbar__title">Kapadokya Çarşısı</span>
            <span className="navbar__subtitle">El Sanatları & Yöresel Ürünler</span>
          </div>
        </div>
        <nav className="navbar__links">
          <a href="#" className="navbar__link navbar__link--active">Çarşı</a>
          <a href="#" className="navbar__link">Ürünler</a>
          <a href="#" className="navbar__link">Yapay Zeka Tasarım</a>
          <a href="#" className="navbar__link">Satıcı Ol</a>
        </nav>
        <div className="navbar__actions">
          <button className="navbar__btn navbar__btn--icon">🔍</button>
          <button className="navbar__btn navbar__btn--icon">🛒</button>
          <button className="navbar__btn navbar__btn--primary">Giriş Yap</button>
        </div>
      </header>

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
            selectedStore={selectedStore}
            onSelectStore={setSelectedStore}
            hoveredId={hoveredId}
            onHover={setHoveredId}
          />
        </div>

        <div className="canvas-wrapper">
          <MarketScene
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />
          <div className="canvas-hint">
            <span>🖱️ Sürükle: döndür</span>
            <span>⚙️ Scroll: zoom</span>
            <span>🏪 Mağazaya tıkla: detay</span>
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
            <StorePanel store={selectedStore} onClose={() => setSelectedStore(null)} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
