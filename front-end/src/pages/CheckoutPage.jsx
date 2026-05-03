import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useCurrencyPrice } from '../hooks/useCurrencyPrice';
import api from '../services/api';
import './CheckoutPage.css';

const CATEGORY_ICONS = { kilim: '🧶', ceramic: '🏺', other: '📦' };

const STEPS = [
  { label: 'Teslimat', icon: 'local_shipping' },
  { label: 'Ödeme', icon: 'credit_card' },
  { label: 'Özet', icon: 'fact_check' },
];

/* ─── helpers ─── */
function generateOrderId() {
  return 'KAP-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function validate(step, data) {
  const errs = {};
  if (step === 0) {
    if (!data.firstName?.trim()) errs.firstName = 'Ad zorunludur';
    if (!data.lastName?.trim()) errs.lastName = 'Soyad zorunludur';
    if (!data.phone?.trim()) errs.phone = 'Telefon zorunludur';
    if (!data.address?.trim()) errs.address = 'Adres zorunludur';
    if (!data.city?.trim()) errs.city = 'Şehir zorunludur';
    if (!data.postalCode?.trim()) errs.postalCode = 'Posta kodu zorunludur';
  }
  if (step === 1) {
    const num = data.cardNumber?.replace(/\s/g, '');
    if (!num || num.length < 16) errs.cardNumber = 'Geçerli bir kart numarası girin';
    if (!data.cardHolder?.trim()) errs.cardHolder = 'Kart üzerindeki ad zorunludur';
    if (!data.expiry?.trim() || !/^\d{2}\/\d{2}$/.test(data.expiry)) errs.expiry = 'GG/YY formatında girin';
    if (!data.cvv?.trim() || !/^\d{3,4}$/.test(data.cvv)) errs.cvv = 'CVV zorunludur';
  }
  return errs;
}

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val) {
  const d = val.replace(/\D/g, '').slice(0, 4);
  if (d.length >= 3) return d.slice(0, 2) + '/' + d.slice(2);
  return d;
}

/* ─── Carbon helpers ─── */
const COUNTRY_NAMES = {
  TR: 'Turkey', DE: 'Germany', US: 'United States',
  GB: 'United Kingdom', FR: 'France', NL: 'Netherlands',
};

const KARA_ULKELER = new Set(['TR', 'GR', 'BG', 'GE', 'AM', 'AZ', 'SY', 'IQ', 'IR']);

function getTasima(country) {
  return KARA_ULKELER.has(country) ? 'kara' : 'hava';
}

function getUrunTipi(items) {
  const counts = { kilim: 0, comlek: 0 };
  items.forEach(({ product }) => {
    if (product.type === 'kilim') counts.kilim++;
    else if (product.type === 'ceramic') counts.comlek++;
    else counts.kilim++;
  });
  return counts.comlek > counts.kilim ? 'comlek' : 'kilim';
}

const CO2_EMOJIS = [
  { limit: 5,  label: 'Çok Düşük', color: '#4a9a5a', bg: '#eaf5ec', icon: '🌱' },
  { limit: 20, label: 'Düşük',     color: '#6aab78', bg: '#f0f8f1', icon: '🌿' },
  { limit: 60, label: 'Orta',      color: '#e0a030', bg: '#fdf6e3', icon: '🍃' },
  { limit: Infinity, label: 'Yüksek', color: '#c05030', bg: '#fdf0ec', icon: '⚠️' },
];

function getCo2Level(kg) {
  return CO2_EMOJIS.find(e => kg < e.limit);
}

/* ─── Carbon Card ─── */
function CarbonCard({ data, loading, error }) {
  if (loading) {
    return (
      <div className="carbon-card carbon-card--loading">
        <span className="carbon-card__spinner" />
        <span>Karbon ayak izi hesaplanıyor...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="carbon-card carbon-card--error">
        <span className="ms" style={{ fontSize: 18 }}>info</span>
        <span style={{ fontSize: 12 }}>Karbon hesabı alınamadı</span>
      </div>
    );
  }
  if (!data) return null;

  const level = getCo2Level(data.sonuc.toplamCo2Kg);
  return (
    <div className="carbon-card" style={{ background: level.bg, borderColor: level.color + '44' }}>
      <div className="carbon-card__header">
        <span className="carbon-card__leaf">{level.icon}</span>
        <div>
          <span className="carbon-card__title" style={{ color: level.color }}>Karbon Ayak İzi</span>
          <span className="carbon-card__badge" style={{ background: level.color }}>{level.label}</span>
        </div>
      </div>
      <div className="carbon-card__big" style={{ color: level.color }}>
        {data.sonuc.toplamCo2Kg.toFixed(2)}
        <span className="carbon-card__unit">kg CO₂</span>
      </div>
      <div className="carbon-card__rows">
        <div className="carbon-card__row">
          <span>📍 Mesafe</span>
          <strong>{data.mesafe.km.toLocaleString()} km</strong>
        </div>
        <div className="carbon-card__row">
          <span>🚛 Taşıma</span>
          <strong>{data.tasima.etiket}</strong>
        </div>
        <div className="carbon-card__row">
          <span>🏺 Üretim</span>
          <strong>{data.uretim.uretimCo2Kg} kg CO₂</strong>
        </div>
      </div>
      <p className="carbon-card__note">
        Kapadokya'dan {data.kullanici.tamAd || data.kullanici.girilen} arası tahmini emisyon.
      </p>
    </div>
  );
}

/* ─── Order Summary ─── */
function OrderSummary({ items, totalPrice, format, carbonData, carbonLoading, carbonError }) {
  const shipping = totalPrice > 500 ? 0 : 29.9;

  return (
    <aside className="checkout-summary">
      <h3 className="checkout-summary__title">
        <span className="ms">receipt_long</span>
        Sipariş Özeti
      </h3>
      {items.map((item, idx) => {
        const previewStyle = item.product.colors
          ? { background: `linear-gradient(135deg, ${item.product.colors[0]} 0%, ${item.product.colors[1] || '#f4f0ea'} 100%)` }
          : { background: '#ffead7' };
        return (
          <div className="checkout-summary__item" key={idx}>
            <div className="checkout-summary__item-thumb" style={previewStyle}>
              {CATEGORY_ICONS[item.product.type] || '📦'}
            </div>
            <div className="checkout-summary__item-info">
              <p className="checkout-summary__item-name">{item.product.name}</p>
              <p className="checkout-summary__item-store">{item.store.name}</p>
            </div>
            <span className="checkout-summary__item-qty">x{item.quantity}</span>
            <span className="checkout-summary__item-price">{format(item.product.price * item.quantity)}</span>
          </div>
        );
      })}
      <hr className="checkout-summary__divider" />
      <div className="checkout-summary__row">
        <span>Ara toplam</span>
        <span>{format(totalPrice)}</span>
      </div>
      <div className="checkout-summary__row">
        <span>Kargo</span>
        <span>{shipping === 0 ? 'Ücretsiz' : format(shipping)}</span>
      </div>
      {totalPrice <= 500 && (
        <div className="checkout-summary__row" style={{ color: '#9aaa78', fontSize: 12 }}>
          <span>500 ₺ üzeri kargo ücretsiz</span>
        </div>
      )}
      <div className="checkout-summary__row checkout-summary__row--total">
        <span>Toplam</span>
        <span>{format(totalPrice + shipping)}</span>
      </div>
      {(carbonLoading || carbonData || carbonError) && (
        <>
          <hr className="checkout-summary__divider" />
          <CarbonCard data={carbonData} loading={carbonLoading} error={carbonError} />
        </>
      )}
    </aside>
  );
}

/* ─── Step 0: Delivery ─── */
function DeliveryStep({ data, onChange, errors }) {
  const field = (name, label, placeholder, col = '') => (
    <div className={`checkout-field${errors[name] ? ' checkout-field--error' : ''}${col ? ' ' + col : ''}`}>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        value={data[name] || ''}
        onChange={e => onChange(name, e.target.value)}
        autoComplete={name}
      />
      {errors[name] && <span className="checkout-field__err">{errors[name]}</span>}
    </div>
  );

  return (
    <div className="checkout-card">
      <h2 className="checkout-card__title">
        <span className="ms">local_shipping</span>
        Teslimat Adresi
      </h2>
      <div className="checkout-form__grid">
        {field('firstName', 'Ad', 'Adınız')}
        {field('lastName', 'Soyad', 'Soyadınız')}
        {field('phone', 'Telefon', '05XX XXX XX XX')}
        {field('email', 'E-posta (isteğe bağlı)', 'ornek@mail.com')}
        <div className={`checkout-field checkout-form__grid--span2${errors.address ? ' checkout-field--error' : ''}`}>
          <label htmlFor="address">Adres</label>
          <input
            id="address"
            name="address"
            placeholder="Sokak, mahalle, bina no ve daire no"
            value={data.address || ''}
            onChange={e => onChange('address', e.target.value)}
            autoComplete="street-address"
          />
          {errors.address && <span className="checkout-field__err">{errors.address}</span>}
        </div>
        {field('city', 'Şehir', 'İstanbul')}
        {field('district', 'İlçe', 'Kadıköy')}
        {field('postalCode', 'Posta Kodu', '34000')}
        <div className="checkout-field">
          <label htmlFor="country">Ülke</label>
          <select
            id="country"
            value={data.country || 'TR'}
            onChange={e => onChange('country', e.target.value)}
          >
            <option value="TR">Türkiye</option>
            <option value="DE">Almanya</option>
            <option value="US">ABD</option>
            <option value="GB">Birleşik Krallık</option>
            <option value="FR">Fransa</option>
            <option value="NL">Hollanda</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 1: Payment ─── */
function PaymentStep({ data, onChange, errors, carbonData, carbonLoading, carbonError }) {
  return (
    <>
    <div className="checkout-card">
      <h2 className="checkout-card__title">
        <span className="ms">credit_card</span>
        Ödeme Bilgileri
      </h2>
      <div className="checkout-card-icons">
        <span className="checkout-card-icon">VISA</span>
        <span className="checkout-card-icon">MC</span>
        <span className="checkout-card-icon">AMEX</span>
      </div>
      <div className="checkout-form__grid">
        <div className={`checkout-field checkout-form__grid--span2${errors.cardNumber ? ' checkout-field--error' : ''}`}>
          <label htmlFor="cardNumber">Kart Numarası</label>
          <input
            id="cardNumber"
            name="cardNumber"
            placeholder="0000 0000 0000 0000"
            value={data.cardNumber || ''}
            onChange={e => onChange('cardNumber', formatCardNumber(e.target.value))}
            inputMode="numeric"
            maxLength={19}
            autoComplete="cc-number"
          />
          {errors.cardNumber && <span className="checkout-field__err">{errors.cardNumber}</span>}
        </div>
        <div className={`checkout-field checkout-form__grid--span2${errors.cardHolder ? ' checkout-field--error' : ''}`}>
          <label htmlFor="cardHolder">Kart Üzerindeki Ad</label>
          <input
            id="cardHolder"
            name="cardHolder"
            placeholder="AD SOYAD"
            value={data.cardHolder || ''}
            onChange={e => onChange('cardHolder', e.target.value.toUpperCase())}
            autoComplete="cc-name"
          />
          {errors.cardHolder && <span className="checkout-field__err">{errors.cardHolder}</span>}
        </div>
        <div className={`checkout-field${errors.expiry ? ' checkout-field--error' : ''}`}>
          <label htmlFor="expiry">Son Kullanma</label>
          <input
            id="expiry"
            name="expiry"
            placeholder="AA/YY"
            value={data.expiry || ''}
            onChange={e => onChange('expiry', formatExpiry(e.target.value))}
            inputMode="numeric"
            maxLength={5}
            autoComplete="cc-exp"
          />
          {errors.expiry && <span className="checkout-field__err">{errors.expiry}</span>}
        </div>
        <div className={`checkout-field${errors.cvv ? ' checkout-field--error' : ''}`}>
          <label htmlFor="cvv">CVV</label>
          <input
            id="cvv"
            name="cvv"
            placeholder="000"
            value={data.cvv || ''}
            onChange={e => onChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            maxLength={4}
            autoComplete="cc-csc"
            type="password"
          />
          {errors.cvv && <span className="checkout-field__err">{errors.cvv}</span>}
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#9a8880', marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="ms" style={{ fontSize: 16, color: '#6aab78' }}>lock</span>
        Ödeme bilgileriniz SSL ile şifreli olarak işlenir. Kart bilgileriniz saklanmaz.
      </p>
    </div>
    {(carbonLoading || carbonData || carbonError) && (
      <CarbonCard data={carbonData} loading={carbonLoading} error={carbonError} />
    )}
    </>
  );
}

/* ─── Step 2: Confirm ─── */
function ConfirmStep({ deliveryData, paymentData, items, totalPrice, format, carbonData }) {
  const shipping = totalPrice > 500 ? 0 : 29.9;
  const maskedCard = paymentData.cardNumber
    ? '**** **** **** ' + paymentData.cardNumber.replace(/\s/g, '').slice(-4)
    : '';

  return (
    <div className="checkout-card">
      <h2 className="checkout-card__title">
        <span className="ms">fact_check</span>
        Sipariş Özeti & Onay
      </h2>

      {/* Delivery info */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#9a8880', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Teslimat Adresi
        </p>
        <p style={{ fontSize: 14, color: '#2a1f1a', fontWeight: 600 }}>{deliveryData.firstName} {deliveryData.lastName}</p>
        <p style={{ fontSize: 13, color: '#7a6a62', marginTop: 2 }}>{deliveryData.address}</p>
        <p style={{ fontSize: 13, color: '#7a6a62' }}>{deliveryData.district && deliveryData.district + ', '}{deliveryData.city} {deliveryData.postalCode}</p>
        <p style={{ fontSize: 13, color: '#7a6a62' }}>{deliveryData.phone}</p>
      </div>

      {/* Payment info */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#9a8880', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Ödeme
        </p>
        <p style={{ fontSize: 14, color: '#2a1f1a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ms" style={{ color: '#c07850' }}>credit_card</span>
          {maskedCard} — {paymentData.cardHolder}
        </p>
      </div>

      {/* Items */}
      <div style={{ borderTop: '1px solid #f0e8e0', paddingTop: 16, marginBottom: 16 }}>
        {items.map((item, idx) => {
          const previewStyle = item.product.colors
            ? { background: `linear-gradient(135deg, ${item.product.colors[0]} 0%, ${item.product.colors[1] || '#f4f0ea'} 100%)` }
            : { background: '#ffead7' };
          return (
            <div className="checkout-summary__item" key={idx}>
              <div className="checkout-summary__item-thumb" style={previewStyle}>
                {CATEGORY_ICONS[item.product.type] || '📦'}
              </div>
              <div className="checkout-summary__item-info">
                <p className="checkout-summary__item-name">{item.product.name}</p>
                <p className="checkout-summary__item-store">{item.store.name}</p>
              </div>
              <span className="checkout-summary__item-qty">x{item.quantity}</span>
              <span className="checkout-summary__item-price">{format(item.product.price * item.quantity)}</span>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="checkout-summary__row">
        <span>Ara toplam</span>
        <span>{format(totalPrice)}</span>
      </div>
      <div className="checkout-summary__row">
        <span>Kargo</span>
        <span>{shipping === 0 ? 'Ücretsiz' : format(shipping)}</span>
      </div>
      <div className="checkout-summary__row checkout-summary__row--total">
        <span>Ödenecek Tutar</span>
        <span>{format(totalPrice + shipping)}</span>
      </div>

      {carbonData && (
        <div style={{ marginTop: 20 }}>
          <CarbonCard data={carbonData} loading={false} error={null} />
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export default function CheckoutPage({ onBack }) {
  const { items, totalPrice, clearCart } = useCart();
  const { format } = useCurrencyPrice();

  const [step, setStep] = useState(0);
  const [deliveryData, setDeliveryData] = useState({ country: 'TR' });
  const [paymentData, setPaymentData] = useState({});
  const [errors, setErrors] = useState({});
  const [orderId, setOrderId] = useState(null);
  const [carbonData, setCarbonData] = useState(null);
  const [carbonLoading, setCarbonLoading] = useState(false);
  const [carbonError, setCarbonError] = useState(false);

  const handleDeliveryChange = (key, val) => {
    setDeliveryData(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  };

  const handlePaymentChange = (key, val) => {
    setPaymentData(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  };

  const handleNext = () => {
    const errs = validate(step, step === 0 ? deliveryData : paymentData);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    // Adres adımından sonra karbon ayak izini hesapla
    if (step === 0) {
      const { city, district, country = 'TR' } = deliveryData;
      const countryName = COUNTRY_NAMES[country] || country;
      const sehir = [city, district, countryName].filter(Boolean).join(', ');
      const tasima = getTasima(country);
      const urun = getUrunTipi(items);

      setCarbonData(null);
      setCarbonError(false);
      setCarbonLoading(true);

      api.get('/karbon/hesapla', { params: { sehir, tasima, urun } })
        .then(res => setCarbonData(res.data))
        .catch(() => setCarbonError(true))
        .finally(() => setCarbonLoading(false));
    }

    setStep(s => s + 1);
  };

  const handleConfirm = () => {
    const id = generateOrderId();
    setOrderId(id);
    clearCart();
    setStep(3); // success screen
  };

  const shipping = totalPrice > 500 ? 0 : 29.9;

  return (
    <div className="checkout-page">
      {/* Navbar */}
      <nav className="checkout-navbar">
        <button className="checkout-navbar__back" onClick={onBack}>
          <span className="ms">arrow_back</span>
          {step === 0 ? 'Sepete Dön' : 'Geri'}
        </button>
        <div className="checkout-navbar__brand">
          <span className="ms">storefront</span>
          Kapadokya Çarşısı
        </div>
        <div style={{ width: 80 }} />
      </nav>

      {/* Steps indicator */}
      {step < 3 && (
        <div className="checkout-steps">
          {STEPS.map((s, idx) => (
            <div key={idx} className={`checkout-step${idx === step ? ' checkout-step--active' : ''}${idx < step ? ' checkout-step--done' : ''}`}>
              {idx > 0 && (
                <div className="checkout-step__sep" />
              )}
              <div className="checkout-step__circle">
                {idx < step ? <span className="ms" style={{ fontSize: 16 }}>check</span> : idx + 1}
              </div>
              <span className="checkout-step__label">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Success */}
      {step === 3 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="checkout-success">
            <div className="checkout-success__icon">
              <span className="ms">check</span>
            </div>
            <h1 className="checkout-success__title">Siparişiniz Alındı!</h1>
            <p className="checkout-success__sub">
              Teşekkürler! Siparişiniz başarıyla oluşturuldu.<br />
              Kargo bilgileriniz {deliveryData.email || deliveryData.phone} adresine iletilecektir.
            </p>
            <div className="checkout-success__order">
              Sipariş No: <strong>{orderId}</strong>
            </div>
            <button className="checkout-success__btn" onClick={onBack}>
              <span className="ms" style={{ verticalAlign: 'middle', marginRight: 6 }}>storefront</span>
              Çarşıya Dön
            </button>
          </div>
        </div>
      )}

      {/* Form steps */}
      {step < 3 && (
        <div className="checkout-layout">
          <div>
            {step === 0 && (
              <DeliveryStep data={deliveryData} onChange={handleDeliveryChange} errors={errors} />
            )}
            {step === 1 && (
              <PaymentStep
                data={paymentData}
                onChange={handlePaymentChange}
                errors={errors}
                carbonData={carbonData}
                carbonLoading={carbonLoading}
                carbonError={carbonError}
              />
            )}
            {step === 2 && (
              <ConfirmStep
                deliveryData={deliveryData}
                paymentData={paymentData}
                items={items}
                totalPrice={totalPrice}
                format={format}
                carbonData={carbonData}
              />
            )}

            {/* Actions */}
            <div className="checkout-actions">
              {step > 0 ? (
                <button className="checkout-btn--back" onClick={() => setStep(s => s - 1)}>
                  ← Geri
                </button>
              ) : (
                <div />
              )}
              {step < 2 ? (
                <button className="checkout-btn--next" onClick={handleNext}>
                  Devam Et <span className="ms">arrow_forward</span>
                </button>
              ) : (
                <button className="checkout-btn--next" onClick={handleConfirm}>
                  <span className="ms">payments</span>
                  {format(totalPrice + shipping)} Öde &amp; Onayla
                </button>
              )}
            </div>
          </div>

          <OrderSummary
            items={items}
            totalPrice={totalPrice}
            format={format}
            carbonData={carbonData}
            carbonLoading={carbonLoading}
            carbonError={carbonError}
          />
        </div>
      )}
    </div>
  );
}
