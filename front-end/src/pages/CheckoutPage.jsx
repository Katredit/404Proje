import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useCurrencyPrice } from '../hooks/useCurrencyPrice';
import api from '../services/api';
import './CheckoutPage.css';

const CATEGORY_ICONS = { kilim: '🧶', ceramic: '🏺', other: '📦' };

/* ─── helpers ─── */
function generateOrderId() {
  return 'KAP-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function validate(step, data) {
  const errs = {};
  if (step === 0) {
    if (!data.firstName?.trim()) errs.firstName = 'checkout.errFirstName';
    if (!data.lastName?.trim()) errs.lastName = 'checkout.errLastName';
    if (!data.phone?.trim()) errs.phone = 'checkout.errPhone';
    if (!data.address?.trim()) errs.address = 'checkout.errAddress';
    if (!data.city?.trim()) errs.city = 'checkout.errCity';
    if (!data.postalCode?.trim()) errs.postalCode = 'checkout.errPostalCode';
  }
  if (step === 1) {
    const num = data.cardNumber?.replace(/\s/g, '');
    if (!num || num.length < 16) errs.cardNumber = 'checkout.errCardNumber';
    if (!data.cardHolder?.trim()) errs.cardHolder = 'checkout.errCardHolder';
    if (!data.expiry?.trim() || !/^\d{2}\/\d{2}$/.test(data.expiry)) errs.expiry = 'checkout.errExpiry';
    if (!data.cvv?.trim() || !/^\d{3,4}$/.test(data.cvv)) errs.cvv = 'checkout.errCvv';
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

const ETA_LEVELS = [
  { limit: 3, label: 'Hızlı', color: '#4a9a5a', bg: '#eaf5ec', icon: '⚡' },
  { limit: 7, label: 'Standart', color: '#d28a35', bg: '#fdf6e8', icon: '📦' },
  { limit: Infinity, label: 'Uzak Mesafe', color: '#b96a45', bg: '#faf0ea', icon: '🛫' },
];

function getEtaLevel(day) {
  return ETA_LEVELS.find((e) => day <= e.limit);
}

/* ─── Carbon Offset helpers ─── */
const TEMA_FEE_PER_TREE = 50; // TL per tree

function calcOffset(co2Kg) {
  const trees = Math.max(1, Math.ceil(co2Kg / 20));
  return { trees, fee: trees * TEMA_FEE_PER_TREE };
}

/* ─── Carbon Card ─── */
function CarbonCard({ data, loading, error }) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="carbon-card carbon-card--loading">
        <span className="carbon-card__spinner" />
        <span>{t('checkout.carbonLoading')}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="carbon-card carbon-card--error">
        <span className="ms" style={{ fontSize: 18 }}>info</span>
        <span style={{ fontSize: 12 }}>{t('checkout.carbonError')}</span>
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
          <span className="carbon-card__title" style={{ color: level.color }}>{t('checkout.carbonTitle')}</span>
          <span className="carbon-card__badge" style={{ background: level.color }}>{level.label}</span>
        </div>
      </div>
      <div className="carbon-card__big" style={{ color: level.color }}>
        {data.sonuc.toplamCo2Kg.toFixed(2)}
        <span className="carbon-card__unit">kg CO₂</span>
      </div>
      <div className="carbon-card__rows">
        <div className="carbon-card__row">
          <span>📍 {t('checkout.carbonDistance')}</span>
          <strong>{data.mesafe.km.toLocaleString()} km</strong>
        </div>
        <div className="carbon-card__row">
          <span>🚛 {t('checkout.carbonTransport')}</span>
          <strong>{data.tasima.etiket}</strong>
        </div>
        <div className="carbon-card__row">
          <span>🏺 {t('checkout.carbonProduction')}</span>
          <strong>{data.uretim.uretimCo2Kg} kg CO₂</strong>
        </div>
      </div>
      <p className="carbon-card__note">
        {t('checkout.carbonNote', { city: data.kullanici.tamAd || data.kullanici.girilen })}
      </p>
    </div>
  );
}

function DeliveryEtaCard({ data, loading, error }) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="delivery-eta-card delivery-eta-card--loading">
        <span className="delivery-eta-card__spinner" />
        <span>{t('checkout.etaLoading')}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="delivery-eta-card delivery-eta-card--error">
        <span className="ms" style={{ fontSize: 18 }}>info</span>
        <span style={{ fontSize: 12 }}>{t('checkout.etaError')}</span>
      </div>
    );
  }
  if (!data) return null;

  const day = data.tahminiTeslimat.ortalamaGun;
  const level = getEtaLevel(day);

  return (
    <div className="delivery-eta-card" style={{ background: level.bg, borderColor: level.color + '44' }}>
      <div className="delivery-eta-card__header">
        <span className="delivery-eta-card__icon">{level.icon}</span>
        <div>
          <span className="delivery-eta-card__title" style={{ color: level.color }}>{t('checkout.etaTitle')}</span>
          <span className="delivery-eta-card__badge" style={{ background: level.color }}>{level.label}</span>
        </div>
      </div>

      <div className="delivery-eta-card__big" style={{ color: level.color }}>
        {t('checkout.etaDays', { day })}
      </div>

      <div className="delivery-eta-card__rows">
        <div className="delivery-eta-card__row">
          <span>🗓 {t('checkout.etaRange')}</span>
          <strong>
            {t('checkout.etaRangeVal', { min: data.tahminiTeslimat.aralik.minGun, max: data.tahminiTeslimat.aralik.maxGun })}
          </strong>
        </div>
        <div className="delivery-eta-card__row">
          <span>📍 {t('checkout.etaDistance')}</span>
          <strong>{data.mesafe.km.toLocaleString()} km</strong>
        </div>
        <div className="delivery-eta-card__row">
          <span>🚛 {t('checkout.etaTransport')}</span>
          <strong>{data.tasima === 'kara' ? t('checkout.etaRoad') : t('checkout.etaAir')}</strong>
        </div>
      </div>
    </div>
  );
}

/* ─── Carbon Offset Card ─── */
function CarbonOffsetCard({ co2Kg, checked, onToggle }) {
  const { t } = useTranslation();
  const { trees, fee } = calcOffset(co2Kg);
  return (
    <div className={`carbon-offset-card${checked ? ' carbon-offset-card--active' : ''}`}>
      <div className="carbon-offset-card__header">
        <span className="carbon-offset-card__tree">🌳</span>
        <div className="carbon-offset-card__texts">
          <span className="carbon-offset-card__title">{t('checkout.offsetTitle')}</span>
          <span className="carbon-offset-card__sub">{t('checkout.offsetSub')}</span>
        </div>
        <label className="carbon-offset-card__toggle">
          <input type="checkbox" checked={checked} onChange={onToggle} />
          <span className="carbon-offset-card__slider" />
        </label>
      </div>
      <p className="carbon-offset-card__desc">
        {t('checkout.offsetDesc', { co2: co2Kg.toFixed(1), trees })}
      </p>
      <div className="carbon-offset-card__fee">
        <span>{t('checkout.offsetFeeRow', { trees, fee: TEMA_FEE_PER_TREE })}</span>
        <strong>+{fee} ₺</strong>
      </div>
    </div>
  );
}

/* ─── Order Summary ─── */
function OrderSummary({
  items,
  totalPrice,
  format,
  carbonData,
  carbonLoading,
  carbonError,
  etaData,
  etaLoading,
  etaError,
  carbonOffset,
}) {
  const { t } = useTranslation();
  const shipping = totalPrice > 500 ? 0 : 29.9;
  const offsetFee = carbonOffset && carbonData ? calcOffset(carbonData.sonuc.toplamCo2Kg).fee : 0;

  return (
    <aside className="checkout-summary">
      <h3 className="checkout-summary__title">
        <span className="ms">receipt_long</span>
        {t('checkout.orderSummary')}
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
        <span>{t('checkout.subtotal')}</span>
        <span>{format(totalPrice)}</span>
      </div>
      <div className="checkout-summary__row">
        <span>{t('checkout.shipping')}</span>
        <span>{shipping === 0 ? t('checkout.shippingFree') : format(shipping)}</span>
      </div>
      {totalPrice <= 500 && (
        <div className="checkout-summary__row" style={{ color: '#9aaa78', fontSize: 12 }}>
          <span>{t('checkout.shippingNote')}</span>
        </div>
      )}
      {carbonOffset && offsetFee > 0 && (
        <div className="checkout-summary__row" style={{ color: '#4a8a5a' }}>
          <span>🌳 {t('checkout.temaDonation')}</span>
          <span>+{format(offsetFee)}</span>
        </div>
      )}
      <div className="checkout-summary__row checkout-summary__row--total">
        <span>{t('checkout.total')}</span>
        <span>{format(totalPrice + shipping + offsetFee)}</span>
      </div>
      {(carbonLoading || carbonData || carbonError) && (
        <>
          <hr className="checkout-summary__divider" />
          <CarbonCard data={carbonData} loading={carbonLoading} error={carbonError} />
        </>
      )}
      {(etaLoading || etaData || etaError) && (
        <>
          <hr className="checkout-summary__divider" />
          <DeliveryEtaCard data={etaData} loading={etaLoading} error={etaError} />
        </>
      )}
    </aside>
  );
}

/* ─── Step 0: Delivery ─── */
function DeliveryStep({ data, onChange, errors }) {
  const { t } = useTranslation();
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
      {errors[name] && <span className="checkout-field__err">{t(errors[name])}</span>}
    </div>
  );

  return (
    <div className="checkout-card">
      <h2 className="checkout-card__title">
        <span className="ms">local_shipping</span>
        {t('checkout.deliveryTitle')}
      </h2>
      <div className="checkout-form__grid">
        {field('firstName', t('checkout.firstName'), t('checkout.firstNamePh'))}
        {field('lastName', t('checkout.lastName'), t('checkout.lastNamePh'))}
        {field('phone', t('checkout.phone'), '05XX XXX XX XX')}
        {field('email', t('checkout.email'), t('checkout.emailPh'))}
        <div className={`checkout-field checkout-form__grid--span2${errors.address ? ' checkout-field--error' : ''}`}>
          <label htmlFor="address">{t('checkout.address')}</label>
          <input
            id="address"
            name="address"
            placeholder={t('checkout.addressPh')}
            value={data.address || ''}
            onChange={e => onChange('address', e.target.value)}
            autoComplete="street-address"
          />
          {errors.address && <span className="checkout-field__err">{t(errors.address)}</span>}
        </div>
        {field('city', t('checkout.city'), t('checkout.cityPh'))}
        {field('district', t('checkout.district'), t('checkout.districtPh'))}
        {field('postalCode', t('checkout.postalCode'), t('checkout.postalCodePh'))}
        <div className="checkout-field">
          <label htmlFor="country">{t('checkout.country')}</label>
          <select
            id="country"
            value={data.country || 'TR'}
            onChange={e => onChange('country', e.target.value)}
          >
            <option value="TR">{t('checkout.countryTR')}</option>
            <option value="DE">{t('checkout.countryDE')}</option>
            <option value="US">{t('checkout.countryUS')}</option>
            <option value="GB">{t('checkout.countryGB')}</option>
            <option value="FR">{t('checkout.countryFR')}</option>
            <option value="NL">{t('checkout.countryNL')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 1: Payment ─── */
function PaymentStep({ data, onChange, errors, carbonData, carbonLoading, carbonError, etaData, etaLoading, etaError, carbonOffset, onOffsetToggle }) {
  const { t } = useTranslation();
  return (
    <>
    <div className="checkout-card">
      <h2 className="checkout-card__title">
        <span className="ms">credit_card</span>
        {t('checkout.paymentTitle')}
      </h2>
      <div className="checkout-card-icons">
        <span className="checkout-card-icon">VISA</span>
        <span className="checkout-card-icon">MC</span>
        <span className="checkout-card-icon">AMEX</span>
      </div>
      <div className="checkout-form__grid">
        <div className={`checkout-field checkout-form__grid--span2${errors.cardNumber ? ' checkout-field--error' : ''}`}>
          <label htmlFor="cardNumber">{t('checkout.cardNumber')}</label>
          <input
            id="cardNumber"
            name="cardNumber"
            placeholder={t('checkout.cardNumberPh')}
            value={data.cardNumber || ''}
            onChange={e => onChange('cardNumber', formatCardNumber(e.target.value))}
            inputMode="numeric"
            maxLength={19}
            autoComplete="cc-number"
          />
          {errors.cardNumber && <span className="checkout-field__err">{t(errors.cardNumber)}</span>}
        </div>
        <div className={`checkout-field checkout-form__grid--span2${errors.cardHolder ? ' checkout-field--error' : ''}`}>
          <label htmlFor="cardHolder">{t('checkout.cardHolder')}</label>
          <input
            id="cardHolder"
            name="cardHolder"
            placeholder={t('checkout.cardHolderPh')}
            value={data.cardHolder || ''}
            onChange={e => onChange('cardHolder', e.target.value.toUpperCase())}
            autoComplete="cc-name"
          />
          {errors.cardHolder && <span className="checkout-field__err">{t(errors.cardHolder)}</span>}
        </div>
        <div className={`checkout-field${errors.expiry ? ' checkout-field--error' : ''}`}>
          <label htmlFor="expiry">{t('checkout.expiry')}</label>
          <input
            id="expiry"
            name="expiry"
            placeholder={t('checkout.expiryPh')}
            value={data.expiry || ''}
            onChange={e => onChange('expiry', formatExpiry(e.target.value))}
            inputMode="numeric"
            maxLength={5}
            autoComplete="cc-exp"
          />
          {errors.expiry && <span className="checkout-field__err">{t(errors.expiry)}</span>}
        </div>
        <div className={`checkout-field${errors.cvv ? ' checkout-field--error' : ''}`}>
          <label htmlFor="cvv">{t('checkout.cvv')}</label>
          <input
            id="cvv"
            name="cvv"
            placeholder={t('checkout.cvvPh')}
            value={data.cvv || ''}
            onChange={e => onChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            maxLength={4}
            autoComplete="cc-csc"
            type="password"
          />
          {errors.cvv && <span className="checkout-field__err">{t(errors.cvv)}</span>}
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#9a8880', marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="ms" style={{ fontSize: 16, color: '#6aab78' }}>lock</span>
        {t('checkout.secureNote')}
      </p>
    </div>
    {(carbonLoading || carbonData || carbonError) && (
      <CarbonCard data={carbonData} loading={carbonLoading} error={carbonError} />
    )}
    {carbonData && !carbonLoading && !carbonError && (
      <CarbonOffsetCard
        co2Kg={carbonData.sonuc.toplamCo2Kg}
        checked={carbonOffset}
        onToggle={onOffsetToggle}
      />
    )}
    {(etaLoading || etaData || etaError) && (
      <DeliveryEtaCard data={etaData} loading={etaLoading} error={etaError} />
    )}
    </>
  );
}

/* ─── Step 2: Confirm ─── */
function ConfirmStep({ deliveryData, paymentData, items, totalPrice, format, carbonData, etaData, carbonOffset }) {
  const { t } = useTranslation();
  const shipping = totalPrice > 500 ? 0 : 29.9;
  const offsetFee = carbonOffset && carbonData ? calcOffset(carbonData.sonuc.toplamCo2Kg).fee : 0;
  const maskedCard = paymentData.cardNumber
    ? '**** **** **** ' + paymentData.cardNumber.replace(/\s/g, '').slice(-4)
    : '';

  return (
    <div className="checkout-card">
      <h2 className="checkout-card__title">
        <span className="ms">fact_check</span>
        {t('checkout.confirmTitle')}
      </h2>

      {/* Delivery info */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#9a8880', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          {t('checkout.deliveryLabel')}
        </p>
        <p style={{ fontSize: 14, color: '#2a1f1a', fontWeight: 600 }}>{deliveryData.firstName} {deliveryData.lastName}</p>
        <p style={{ fontSize: 13, color: '#7a6a62', marginTop: 2 }}>{deliveryData.address}</p>
        <p style={{ fontSize: 13, color: '#7a6a62' }}>{deliveryData.district && deliveryData.district + ', '}{deliveryData.city} {deliveryData.postalCode}</p>
        <p style={{ fontSize: 13, color: '#7a6a62' }}>{deliveryData.phone}</p>
      </div>

      {/* Payment info */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#9a8880', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          {t('checkout.paymentLabel')}
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
        <span>{t('checkout.subtotal')}</span>
        <span>{format(totalPrice)}</span>
      </div>
      <div className="checkout-summary__row">
        <span>{t('checkout.shipping')}</span>
        <span>{shipping === 0 ? t('checkout.shippingFree') : format(shipping)}</span>
      </div>
      {carbonOffset && offsetFee > 0 && (
        <div className="checkout-summary__row" style={{ color: '#4a8a5a' }}>
          <span>🌳 {t('checkout.temaDonation')}</span>
          <span>+{format(offsetFee)}</span>
        </div>
      )}
      <div className="checkout-summary__row checkout-summary__row--total">
        <span>{t('checkout.totalDue')}</span>
        <span>{format(totalPrice + shipping + offsetFee)}</span>
      </div>

      {carbonData && (
        <div style={{ marginTop: 20 }}>
          <CarbonCard data={carbonData} loading={false} error={null} />
        </div>
      )}

      {etaData && (
        <div style={{ marginTop: 20 }}>
          <DeliveryEtaCard data={etaData} loading={false} error={null} />
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export default function CheckoutPage({ onBack, customOrder }) {
  const { items, totalPrice: cartTotalPrice, clearCart } = useCart();
  const { format } = useCurrencyPrice();
  const { t } = useTranslation();

  // Özel sipariş modunda fiyat ve ürün listesi farklı
  const isCustomOrder = !!customOrder;
  const checkoutItems = isCustomOrder
    ? [{
        product: {
          id: customOrder.order.id,
          name: `Özel ${customOrder.order.productType === 'vazo' ? 'Vazo' : 'Kilim'} Tasarımı`,
          price: customOrder.offer.price,
          type: customOrder.order.productType,
          colors: customOrder.order.productType === 'kilim' ? ['#C0392B', '#2980B9'] : ['#c0764a', '#8a4820'],
        },
        store: { id: customOrder.offer.storeId, name: customOrder.offer.storeName },
        quantity: 1,
      }]
    : items;
  const totalPrice = isCustomOrder ? customOrder.offer.price : cartTotalPrice;

  const [step, setStep] = useState(0);
  const [deliveryData, setDeliveryData] = useState({ country: 'TR' });
  const [paymentData, setPaymentData] = useState({});
  const [errors, setErrors] = useState({});
  const [orderId, setOrderId] = useState(null);
  const [carbonData, setCarbonData] = useState(null);
  const [carbonLoading, setCarbonLoading] = useState(false);
  const [carbonError, setCarbonError] = useState(false);
  const [carbonOffset, setCarbonOffset] = useState(false);
  const [etaData, setEtaData] = useState(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const [etaError, setEtaError] = useState(false);

  const handleDeliveryChange = (key, val) => {
    setDeliveryData(prev => ({ ...prev, [key]: val }));
    if (['address', 'district', 'city', 'country'].includes(key)) {
      setEtaData(null);
      setEtaError(false);
    }
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
      const adres = [district, city, countryName].filter(Boolean).join(', ');
      const tasima = getTasima(country);
      const urun = getUrunTipi(checkoutItems);

      setCarbonData(null);
      setCarbonError(false);
      setCarbonLoading(true);
      setCarbonOffset(false);

      setEtaData(null);
      setEtaError(false);
      setEtaLoading(true);

      api.get('/karbon/hesapla', { params: { sehir, tasima, urun } })
        .then(res => setCarbonData(res.data))
        .catch(() => setCarbonError(true))
        .finally(() => setCarbonLoading(false));

      api.get('/cografya/tahmini-teslimat', { params: { adres, tasima } })
        .then(res => setEtaData(res.data))
        .catch(() => setEtaError(true))
        .finally(() => setEtaLoading(false));
    }

    setStep(s => s + 1);
  };

  const handleConfirm = () => {
    const id = generateOrderId();
    setOrderId(id);
    if (!isCustomOrder) clearCart();
    setStep(3); // success screen
  };

  const shipping = totalPrice > 500 ? 0 : 29.9;
  const offsetFee = carbonOffset && carbonData ? calcOffset(carbonData.sonuc.toplamCo2Kg).fee : 0;

  return (
    <div className="checkout-page">
      {/* Navbar */}
      <nav className="checkout-navbar">
        <button className="checkout-navbar__back" onClick={onBack}>
          <span className="ms">arrow_back</span>
          {step === 0 ? t('checkout.backToCart') : t('checkout.back')}
        </button>
        <div className="checkout-navbar__brand">
          <span className="ms">storefront</span>
          {t('checkout.brand')}
        </div>
        <div style={{ width: 80 }} />
      </nav>

      {/* Steps indicator */}
      {step < 3 && (
        <div className="checkout-steps">
          {[
            t('checkout.stepDelivery'),
            t('checkout.stepPayment'),
            t('checkout.stepSummary'),
          ].map((label, idx) => (
            <div key={idx} className={`checkout-step${idx === step ? ' checkout-step--active' : ''}${idx < step ? ' checkout-step--done' : ''}`}>
              {idx > 0 && (
                <div className="checkout-step__sep" />
              )}
              <div className="checkout-step__circle">
                {idx < step ? <span className="ms" style={{ fontSize: 16 }}>check</span> : idx + 1}
              </div>
              <span className="checkout-step__label">{label}</span>
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
            <h1 className="checkout-success__title">{t('checkout.successTitle')}</h1>
            <p className="checkout-success__sub">
              {t('checkout.successSub')}<br />
              {t('checkout.successContact', { contact: deliveryData.email || deliveryData.phone })}
            </p>
            {carbonOffset && carbonData && (() => {
              const { trees } = calcOffset(carbonData.sonuc.toplamCo2Kg);
              return (
                <div className="checkout-success__tema">
                  <span className="checkout-success__tema-icon">🌳</span>
                  <div>
                    <strong>{t('checkout.temaSuccess', { trees })}</strong>
                    <p>{t('checkout.temaSuccessDetail', { trees })}</p>
                  </div>
                </div>
              );
            })()}
            <div className="checkout-success__order">
              {t('checkout.orderNo')} <strong>{orderId}</strong>
            </div>
            <button className="checkout-success__btn" onClick={onBack}>
              <span className="ms" style={{ verticalAlign: 'middle', marginRight: 6 }}>storefront</span>
              {t('checkout.backToMarket')}
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
                etaData={etaData}
                etaLoading={etaLoading}
                etaError={etaError}
                carbonOffset={carbonOffset}
                onOffsetToggle={() => setCarbonOffset(v => !v)}
              />
            )}
            {step === 2 && (
              <ConfirmStep
                deliveryData={deliveryData}
                paymentData={paymentData}
                items={checkoutItems}
                totalPrice={totalPrice}
                format={format}
                carbonData={carbonData}
                etaData={etaData}
                carbonOffset={carbonOffset}
              />
            )}

            {/* Actions */}
            <div className="checkout-actions">
              {step > 0 ? (
                <button className="checkout-btn--back" onClick={() => setStep(s => s - 1)}>
                  {t('checkout.back')}
                </button>
              ) : (
                <div />
              )}
              {step < 2 ? (
                <button className="checkout-btn--next" onClick={handleNext}>
                  {t('checkout.next')} <span className="ms">arrow_forward</span>
                </button>
              ) : (
                <button className="checkout-btn--next" onClick={handleConfirm}>
                  <span className="ms">payments</span>
                  {format(totalPrice + shipping + offsetFee)} {t('checkout.payBtn')}
                </button>
              )}
            </div>
          </div>

          <OrderSummary
            items={checkoutItems}
            totalPrice={totalPrice}
            format={format}
            carbonData={carbonData}
            carbonLoading={carbonLoading}
            carbonError={carbonError}
            etaData={etaData}
            etaLoading={etaLoading}
            etaError={etaError}
            carbonOffset={carbonOffset}
          />
        </div>
      )}
    </div>
  );
}
