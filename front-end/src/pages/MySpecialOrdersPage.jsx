import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './MySpecialOrdersPage.css';

const TYPE_LABELS = { vazo: 'Vazo', kilim: 'Kilim' };
const TYPE_ICONS = { vazo: '🏺', kilim: '🧶' };

const STATUS_LABELS = {
  open: 'Teklif Bekleniyor',
  accepted: 'Teklif Kabul Edildi',
  completed: 'Tamamlandı',
};

const STATUS_COLORS = {
  open: '#e0a030',
  accepted: '#27ae60',
  completed: '#2980b9',
};

export default function MySpecialOrdersPage({ onBack, onCheckoutCustom }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acceptLoading, setAcceptLoading] = useState(null); // offerId
  const [expandedOrder, setExpandedOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/custom-orders/my');
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

  const handleAcceptOffer = async (orderId, offerId) => {
    setAcceptLoading(offerId);
    try {
      const res = await api.post(`/custom-orders/${orderId}/accept-offer/${offerId}`);
      const acceptedOffer = res.data.kabul_edilen_teklif;
      fetchOrders();
      if (onCheckoutCustom) {
        onCheckoutCustom(acceptedOffer, res.data.siparis);
      }
    } catch (err) {
      setError(err.response?.data?.hata || 'Teklif kabul edilemedi.');
    } finally {
      setAcceptLoading(null);
    }
  };

  if (!user) {
    return (
      <main className="msop-page">
        <div className="msop-gate">
          <span className="ms msop-gate__icon">login</span>
          <h2>Giriş yapmanız gerekiyor</h2>
          <p>Özel siparişlerinizi görüntülemek için hesabınıza giriş yapın.</p>
          <button className="msop-btn msop-btn--primary" onClick={onBack}>Geri Dön</button>
        </div>
      </main>
    );
  }

  return (
    <main className="msop-page">
      <div className="msop-header">
        <button className="msop-back-btn" onClick={onBack}>
          <span className="ms">arrow_back</span>
        </button>
        <div>
          <h1 className="msop-title">
            <span className="ms">pending_actions</span>
            Özel Sipariş Durumum
          </h1>
        </div>
        <button className="msop-refresh-btn" onClick={fetchOrders} title="Yenile">
          <span className="ms">refresh</span>
        </button>
      </div>

      {loading && (
        <div className="msop-loading">
          <div className="msop-spinner" />
          <span>Siparişler yükleniyor...</span>
        </div>
      )}

      {error && <div className="msop-error">⚠️ {error}</div>}

      {!loading && !error && orders.length === 0 && (
        <div className="msop-empty">
          <span className="ms msop-empty__icon">auto_awesome</span>
          <h3>Henüz özel sipariş vermediniz</h3>
          <p>Yapay Zeka Tasarım sayfasından bir tasarım oluşturun ve satıcılara gönderin.</p>
          <button className="msop-btn msop-btn--primary" onClick={onBack}>
            <span className="ms">arrow_back</span> Geri Dön
          </button>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="msop-list">
          {orders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            const acceptedOffer = order.offers?.find((o) => o.id === order.acceptedOfferId);

            return (
              <div key={order.id} className={`msop-card${order.status === 'accepted' ? ' msop-card--accepted' : ''}`}>
                {/* Kart başlığı */}
                <div className="msop-card__header" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                  <div className="msop-card__image-wrap">
                    <img
                      src={`data:image/png;base64,${order.imageBase64}`}
                      alt={`${TYPE_LABELS[order.productType]} tasarımı`}
                      className="msop-card__image"
                    />
                  </div>

                  <div className="msop-card__info">
                    <div className="msop-card__type">
                      {TYPE_ICONS[order.productType]} {TYPE_LABELS[order.productType]}
                    </div>
                    <p className="msop-card__prompt">{order.prompt || 'Açıklama yok'}</p>
                    <div className="msop-card__meta">
                      <span
                        className="msop-card__status"
                        style={{ color: STATUS_COLORS[order.status] }}
                      >
                        ● {STATUS_LABELS[order.status]}
                      </span>
                      <span className="msop-card__offer-count">
                        <span className="ms">local_offer</span> {(order.offers || []).length} teklif
                      </span>
                    </div>
                    {acceptedOffer && (
                      <div className="msop-card__accepted-offer">
                        <span className="ms">check_circle</span>
                        Kabul: <strong>{acceptedOffer.storeName}</strong> — {acceptedOffer.price.toLocaleString('tr-TR')} ₺
                      </div>
                    )}
                  </div>

                  <button className="msop-card__expand-btn">
                    <span className="ms">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                  </button>
                </div>

                {/* Teklifler paneli */}
                {isExpanded && (
                  <div className="msop-card__offers">
                    {order.note && (
                      <div className="msop-card__your-note">
                        <span className="ms">notes</span>
                        Notunuz: {order.note}
                      </div>
                    )}

                    <div className="msop-card__date">
                      Oluşturulma: {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>

                    {(order.offers || []).length === 0 ? (
                      <div className="msop-no-offers">
                        <span className="ms">hourglass_empty</span>
                        Henüz teklif gelmedi. Satıcılar tekliflerini hazırlıyor...
                      </div>
                    ) : (
                      <div className="msop-offers-list">
                        <h4 className="msop-offers-title">
                          <span className="ms">local_offer</span>
                          Gelen Teklifler ({order.offers.length})
                        </h4>
                        {[...order.offers]
                          .sort((a, b) => a.price - b.price)
                          .map((offer) => {
                            const isAccepted = offer.id === order.acceptedOfferId;
                            return (
                              <div
                                key={offer.id}
                                className={`msop-offer${isAccepted ? ' msop-offer--accepted' : ''}`}
                              >
                                <div className="msop-offer__store">
                                  <span className="ms">storefront</span>
                                  <strong>{offer.storeName}</strong>
                                </div>
                                <div className="msop-offer__price">
                                  {offer.price.toLocaleString('tr-TR')} ₺
                                </div>
                                {offer.note && (
                                  <div className="msop-offer__note">{offer.note}</div>
                                )}
                                <div className="msop-offer__date">
                                  {new Date(offer.createdAt).toLocaleDateString('tr-TR', {
                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                                  })}
                                </div>

                                {order.status === 'open' && (
                                  <button
                                    className="msop-btn msop-btn--primary msop-offer__accept-btn"
                                    onClick={() => handleAcceptOffer(order.id, offer.id)}
                                    disabled={acceptLoading === offer.id}
                                  >
                                    {acceptLoading === offer.id
                                      ? <><span className="msop-spinner msop-spinner--sm" />İşleniyor...</>
                                      : <><span className="ms">check_circle</span>Kabul Et & Öde</>
                                    }
                                  </button>
                                )}

                                {isAccepted && (
                                  <div className="msop-offer__accepted-badge">
                                    <span className="ms">check_circle</span>
                                    Kabul Edildi
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
