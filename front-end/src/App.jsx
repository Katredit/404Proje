import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MarketScene from './components/MarketScene';
import StorePanel from './components/StorePanel';
import StoreListSidebar from './components/StoreListSidebar';
import StoreDetailPage from './pages/StoreDetailPage';
import AIDesignPage from './pages/AIDesignPage';
import SellerPage from './pages/SellerPage';
import SellerDashboard from './pages/SellerDashboard';
import AuthPage from './pages/AuthPage';
import CheckoutPage from './pages/CheckoutPage';
import SpecialOrdersPage from './pages/SpecialOrdersPage';
import MySpecialOrdersPage from './pages/MySpecialOrdersPage';
import CartDrawer from './components/CartDrawer';
import LanguageSwitcher from './components/LanguageSwitcher';
import CurrencyRateBadge from './components/CurrencyRateBadge';
import { stores as staticStores, positions as storePositions } from './data/stores';
import api from './services/api';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import './App.css';

function App() {
  const { t } = useTranslation();
  const { user, loading: authLoading, logout } = useAuth();
  const { totalCount, setIsOpen: setCartOpen } = useCart();
  const [selectedStore, setSelectedStore] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('market'); // 'market' | 'ai' | 'seller' | 'dashboard' | 'checkout' | 'special-orders' | 'my-special-orders'
  const [visitingStore, setVisitingStore] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [customOrderCheckout, setCustomOrderCheckout] = useState(null); // { offer, order }

  // Backend'den gelen mağazalar
  const [apiStores, setApiStores] = useState([]);

  const fetchStores = () => {
    api.get('/stores').then((res) => setApiStores(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchStores();
  }, []);

  // Tüm mağazalar = statik + backend'den gelen
  const allStores = [
    ...staticStores,
    ...apiStores.filter((s) => !staticStores.some((st) => String(st.id) === String(s.id))),
  ];

  // Yeni satıcı ekle (backend kayıt sonrası store listesini yenile)
  const handleAddSeller = () => {
    fetchStores();
    setActivePage('market');
  };

  // Mağaza sayfasında isek (kendi navbar'ı var)
  if (visitingStore) {
    return (
      <div className="app">
        <StoreDetailPage
          store={visitingStore}
          onBack={() => setVisitingStore(null)}
          onOpenCart={() => setCartOpen(true)}
        />
        <CartDrawer onCheckout={() => { setVisitingStore(null); setActivePage('checkout'); }} />
      </div>
    );
  }

  const hasSeller = !!user?.store;

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
            {/* Satıcı ol: sadece giriş yapmış ve henüz dükkanı olmayan kullanıcılara */}
            {user && !hasSeller && (
              <button
                className={`navbar__link${activePage === 'seller' ? ' navbar__link--active' : ''}`}
                onClick={() => setActivePage('seller')}
              >{t('nav.seller')}</button>
            )}
            {/* Dükkanım + Özel Siparişler: dükkanı olan satıcılara */}
            {user && hasSeller && (
              <>
                <button
                  className={`navbar__link${activePage === 'dashboard' ? ' navbar__link--active' : ''}`}
                  onClick={() => setActivePage('dashboard')}
                >
                  <span className="ms" style={{ fontSize: 16, verticalAlign: 'middle' }}>storefront</span>{' '}
                  Dükkanım
                </button>
                <button
                  className={`navbar__link${activePage === 'special-orders' ? ' navbar__link--active' : ''}`}
                  onClick={() => setActivePage('special-orders')}
                >
                  <span className="ms" style={{ fontSize: 16, verticalAlign: 'middle' }}>palette</span>{' '}
                  Özel Siparişler
                </button>
              </>
            )}
            {/* Giriş yapmış tüm kullanıcılar: Özel Sipariş Durumum */}
            {user && (
              <button
                className={`navbar__link${activePage === 'my-special-orders' ? ' navbar__link--active' : ''}`}
                onClick={() => setActivePage('my-special-orders')}
              >
                <span className="ms" style={{ fontSize: 16, verticalAlign: 'middle' }}>pending_actions</span>{' '}
                Özel Sipariş Durumum
              </button>
            )}
          </nav>
          <div className="navbar__actions">
            <button className="navbar__btn navbar__btn--icon"><span className="ms">search</span></button>
            <button
              className="navbar__btn navbar__btn--icon navbar__cart-btn"
              onClick={() => setCartOpen(true)}
              aria-label="Sepetim"
            >
              <span className="ms">shopping_bag</span>
              {totalCount > 0 && <span className="navbar__cart-badge">{totalCount}</span>}
            </button>

            {authLoading ? null : user ? (
              <div className="navbar__user">
                <span className="navbar__user-name">{user.name}</span>
                <button className="navbar__btn navbar__btn--outline" onClick={logout}>Çıkış</button>
              </div>
            ) : (
              <button className="navbar__btn navbar__btn--primary" onClick={() => setShowAuth(true)}>
                {t('nav.login')}
              </button>
            )}
            <CurrencyRateBadge />
            <LanguageSwitcher />
          </div>
        </header>
      </div>

      {/* ── Auth Modal ── */}
      {showAuth && <AuthPage onClose={() => setShowAuth(false)} />}

      {/* ── Cart Drawer ── */}
      <CartDrawer onCheckout={() => setActivePage('checkout')} />

      {/* ── Checkout sayfası ── */}
      {activePage === 'checkout' && (
        <CheckoutPage
          onBack={() => { setActivePage('market'); setCustomOrderCheckout(null); }}
          customOrder={customOrderCheckout}
        />
      )}

      {/* ── AI Tasarım sayfası ── */}
      {activePage === 'ai' && (
        <AIDesignPage onBack={() => setActivePage('market')} onNavigate={setActivePage} />
      )}

      {/* ── Satıcı Ol sayfası (eski tasarım, backend'e bağlı) ── */}
      {activePage === 'seller' && user && !hasSeller && (
        <SellerPage
          onBack={() => setActivePage('market')}
          onNavigate={setActivePage}
        />
      )}

      {/* ── Satıcı Ol — giriş gerekilir ── */}
      {activePage === 'seller' && !user && (
        <main className="main main--full">
          <div className="app-auth-gate">
            <span className="ms app-auth-gate__icon">storefront</span>
            <h2>Satıcı olmak için giriş yapın</h2>
            <p>Dükkan açmak ve ürün satmak için hesabınıza giriş yapın.</p>
            <button className="navbar__btn navbar__btn--primary" onClick={() => setShowAuth(true)}>
              Giriş Yap / Kayıt Ol
            </button>
          </div>
        </main>
      )}

      {/* ── Satıcı Dashboard (sadece dükkanı olanlar) ── */}
      {activePage === 'dashboard' && user && (
        <main className="main main--full">
          <SellerDashboard />
        </main>
      )}

      {/* ── Özel Siparişler (satıcılar) ── */}
      {activePage === 'special-orders' && (
        <SpecialOrdersPage onBack={() => setActivePage('market')} />
      )}

      {/* ── Özel Siparişlerim (müşteriler) ── */}
      {activePage === 'my-special-orders' && (
        <MySpecialOrdersPage
          onBack={() => setActivePage('market')}
          onCheckoutCustom={(offer, order) => {
            setCustomOrderCheckout({ offer, order });
            setActivePage('checkout');
          }}
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
              onVisit={(s) => {
                // Güncel ürünleri API'den çek
                api.get(`/stores/${s.id}`).then((res) => {
                  setVisitingStore(res.data);
                }).catch(() => {
                  setVisitingStore(s);
                });
                setSelectedStore(null);
              }}
            />
          </div>
        )}
      </main>}
    </div>
  );
}

export default App;

