import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './SpecialOrdersPage.css';

const TYPE_LABELS = { vazo: 'Vazo', kilim: 'Kilim' };
const TYPE_ICONS = { vazo: '🏺', kilim: '🧶' };

export default function SpecialOrdersPage({ onBack }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerError, setOfferError] = useState('');
  const [offerSuccess, setOfferSuccess] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/custom-orders');
      setOrders(res.data.siparisler || []);
    } catch (err) {
      setError(err.response?.data?.hata || 'Siparişler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenOffer = (order) => {
    setSelectedOrder(order);
    setOfferPrice(order.myOffer?.price?.toString() || '');
    setOfferNote(order.myOffer?.note || '');
    setOfferError('');
    setOfferSuccess('');
  };

  const handleSubmitOffer = async () => {
    const price = parseFloat(offerPrice);
    if (!price || price <= 0) {
      setOfferError('Lütfen geçerli bir fiyat girin.');
      return;
    }
    setOfferLoading(true);
    setOfferError('');
    setOfferSuccess('');
    try {
      await api.post(`/custom-orders/${selectedOrder.id}/offer`, {
        price,
        note: offerNote,
      });
      setOfferSuccess('Teklifiniz başarıyla gönderildi!');
      fetchOrders();
      setTimeout(() => {
        setSelectedOrder(null);
        setOfferSuccess('');
      }, 1500);
    } catch (err) {
      setOfferError(err.response?.data?.hata || 'Teklif gönderilemedi.');
    } finally {
      setOfferLoading(false);
    }
  };

  if (!user?.store) {
    return (
      <main className="sop-page">
        <div className="sop-gate">
          <span className="ms sop-gate__icon">storefront</span>
          <h2>Bu sayfaya yalnızca satıcılar erişebilir</h2>
          <p>Özel siparişleri görüntülemek için bir dükkan sahibi olmanız gerekiyor.</p>
          <button className="sop-btn sop-btn--primary" onClick={onBack}>Geri Dön</button>
        </div>
      </main>
    );
  }

  return (
    <main className="sop-page">
      <div className="sop-header">
        <button className="sop-back-btn" onClick={onBack}>
          <span className="ms">arrow_back</span>
        </button>
        <div>
          <h1 className="sop-title">
            <span className="ms">palette</span>
            Özel Siparişler
          </h1>
        </div>
        <button className="sop-refresh-btn" onClick={fetchOrders} title="Yenile">
          <span className="ms">refresh</span>
        </button>
      </div>

      {loading && (
        <div className="sop-loading">
          <div className="sop-spinner" />
          <span>Siparişler yükleniyor...</span>
        </div>
      )}

      {error && <div className="sop-error">⚠️ {error}</div>}

      {!loading && !error && orders.length === 0 && (
        <div className="sop-empty">
          <span className="ms sop-empty__icon">inbox</span>
          <h3>Henüz özel sipariş yok</h3>
          <p>Müşteriler yapay zeka ile tasarım oluşturdukça burada görünecek.</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="sop-grid">
          {orders.map((order) => (
            <div key={order.id} className={`sop-card${order.myOffer ? ' sop-card--offered' : ''}`}>
              <div className="sop-card__image-wrap">
                <img
                  src={`data:image/png;base64,${order.imageBase64}`}
                  alt={`${TYPE_LABELS[order.productType]} tasarımı`}
                  className="sop-card__image"
                />
                <div className="sop-card__type-badge">
                  {TYPE_ICONS[order.productType]} {TYPE_LABELS[order.productType]}
                </div>
                {order.status === 'accepted' && (
                  <div className="sop-card__status-badge sop-card__status-badge--accepted">
                    Teklif Kabul Edildi
                  </div>
                )}
              </div>

              <div className="sop-card__body">
                <p className="sop-card__prompt">{order.prompt || 'Açıklama yok'}</p>
                {order.note && <p className="sop-card__note">📝 {order.note}</p>}

                <div className="sop-card__meta">
                  <span className="sop-card__customer">
                    <span className="ms">person</span> {order.customerName}
                  </span>
                  <span className="sop-card__offers">
                    <span className="ms">local_offer</span> {order.offerCount} teklif
                  </span>
                </div>

                <div className="sop-card__date">
                  {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </div>

                {order.myOffer && (
                  <div className="sop-card__my-offer">
                    <span className="ms">check_circle</span>
                    Teklifiniz: <strong>{order.myOffer.price.toLocaleString('tr-TR')} ₺</strong>
                    {order.myOffer.note && <span className="sop-card__my-offer-note"> — {order.myOffer.note}</span>}
                  </div>
                )}

                {order.status === 'open' && (
                  <button
                    className={`sop-btn${order.myOffer ? ' sop-btn--outline' : ' sop-btn--primary'} sop-card__offer-btn`}
                    onClick={() => handleOpenOffer(order)}
                  >
                    <span className="ms">{order.myOffer ? 'edit' : 'local_offer'}</span>
                    {order.myOffer ? 'Teklifi Güncelle' : 'Teklif Ver'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Teklif Modal */}
      {selectedOrder && (
        <div className="sop-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="sop-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sop-modal__header">
              <h2 className="sop-modal__title">
                {TYPE_ICONS[selectedOrder.productType]} Fiyat Teklifi Ver
              </h2>
              <button className="sop-modal__close" onClick={() => setSelectedOrder(null)}>
                <span className="ms">close</span>
              </button>
            </div>

            <div className="sop-modal__preview">
              <img
                src={`data:image/png;base64,${selectedOrder.imageBase64}`}
                alt="tasarım"
                className="sop-modal__image"
              />
              <div className="sop-modal__info">
                <div className="sop-modal__type">
                  {TYPE_LABELS[selectedOrder.productType]}
                </div>
                <p className="sop-modal__prompt">{selectedOrder.prompt || 'Açıklama yok'}</p>
                {selectedOrder.note && (
                  <p className="sop-modal__note">📝 {selectedOrder.note}</p>
                )}
              </div>
            </div>

            <div className="sop-modal__form">
              <div className="sop-modal__field">
                <label className="sop-modal__label">
                  Fiyat Teklifiniz (₺) <span className="sop-req">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="sop-modal__input"
                  placeholder="Örn: 2500"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                />
              </div>
              <div className="sop-modal__field">
                <label className="sop-modal__label">Notunuz (opsiyonel)</label>
                <textarea
                  className="sop-modal__textarea"
                  rows={3}
                  placeholder="Üretim süresi, kargo bilgisi vb..."
                  value={offerNote}
                  onChange={(e) => setOfferNote(e.target.value)}
                  maxLength={300}
                />
              </div>

              {offerError && <div className="sop-error">{offerError}</div>}
              {offerSuccess && <div className="sop-success">{offerSuccess}</div>}

              <div className="sop-modal__actions">
                <button
                  className="sop-btn sop-btn--ghost"
                  onClick={() => setSelectedOrder(null)}
                  disabled={offerLoading}
                >
                  İptal
                </button>
                <button
                  className="sop-btn sop-btn--primary"
                  onClick={handleSubmitOffer}
                  disabled={offerLoading}
                >
                  {offerLoading
                    ? <><span className="sop-spinner sop-spinner--sm" />Gönderiliyor...</>
                    : <><span className="ms">send</span>Teklifi Gönder</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
