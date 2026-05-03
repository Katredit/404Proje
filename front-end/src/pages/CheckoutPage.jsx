import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useCurrencyPrice } from '../hooks/useCurrencyPrice';
import './CheckoutPage.css';

const STEPS = ['address', 'payment', 'confirm'];

const EMPTY_ADDRESS = { fullName: '', phone: '', city: '', district: '', address: '', zip: '' };
const EMPTY_PAYMENT = { cardName: '', cardNumber: '', expiry: '', cvv: '' };

function formatCard(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

export default function CheckoutPage({ onBack, onSuccess }) {
  const { t } = useTranslation();
  const { items, totalPrice, totalCount, clearCart } = useCart();
  const { format } = useCurrencyPrice();
  const [step, setStep] = useState(0); // 0=address, 1=payment, 2=confirm
  const [addressData, setAddressData] = useState(EMPTY_ADDRESS);
  const [paymentData, setPaymentData] = useState(EMPTY_PAYMENT);
  const [errors, setErrors] = useState({});
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

  const validateAddress = () => {
    const e = {};
    if (!addressData.fullName.trim()) e.fullName = t('checkout.required');
    if (!addressData.phone.trim()) e.phone = t('checkout.required');
    if (!addressData.city.trim()) e.city = t('checkout.required');
    if (!addressData.district.trim()) e.district = t('checkout.required');
    if (!addressData.address.trim()) e.address = t('checkout.required');
    return e;
  };

  const validatePayment = () => {
    const e = {};
    if (!paymentData.cardName.trim()) e.cardName = t('checkout.required');
    const digits = paymentData.cardNumber.replace(/\s/g, '');
    if (digits.length < 16) e.cardNumber = t('checkout.invalidCard');
    if (paymentData.expiry.length < 5) e.expiry = t('checkout.required');
    if (paymentData.cvv.length < 3) e.cvv = t('checkout.required');
    return e;
  };

  const handleNext = () => {
    if (step === 0) {
      const e = validateAddress();
      setErrors(e);
      if (Object.keys(e).length > 0) return;
    }
    if (step === 1) {
      const e = validatePayment();
      setErrors(e);
      if (Object.keys(e).length > 0) return;
    }
    setErrors({});
    setStep(s => s + 1);
  };

  const handlePlace = async () => {
    setPlacing(true);
    // Simulate order placement
    await new Promise(r => setTimeout(r, 1400));
    setPlacing(false);
    setPlaced(true);
    clearCart();
  };

  if (placed) {
    return (
      <div className="checkout-page">
        <div className="checkout-success">
          <span className="ms checkout-success__icon">check_circle</span>
          <h2>{t('checkout.successTitle')}</h2>
          <p>{t('checkout.successDesc')}</p>
          <button className="checkout-btn checkout-btn--primary" onClick={onSuccess}>
            {t('checkout.backToMarket')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        {/* Header */}
        <div className="checkout-header">
          <button className="checkout-back" onClick={onBack}>
            <span className="ms">arrow_back</span>
            {t('checkout.backToCart')}
          </button>
          <h1 className="checkout-title">
            <span className="ms">payment</span>
            {t('checkout.title')}
          </h1>
        </div>

        {/* Stepper */}
        <div className="checkout-stepper">
          {STEPS.map((s, i) => (
            <div key={s} className={`checkout-step${step >= i ? ' checkout-step--done' : ''}${step === i ? ' checkout-step--active' : ''}`}>
              <div className="checkout-step__circle">
                {step > i ? <span className="ms">check</span> : i + 1}
              </div>
              <span className="checkout-step__label">{t(`checkout.step_${s}`)}</span>
              {i < STEPS.length - 1 && <div className="checkout-step__line" />}
            </div>
          ))}
        </div>

        <div className="checkout-body">
          {/* Left: form */}
          <div className="checkout-form-col">
            {step === 0 && (
              <AddressForm data={addressData} setData={setAddressData} errors={errors} t={t} />
            )}
            {step === 1 && (
              <PaymentForm data={paymentData} setData={setPaymentData} errors={errors} t={t} />
            )}
            {step === 2 && (
              <ConfirmStep
                address={addressData}
                payment={paymentData}
                items={items}
                format={format}
                totalPrice={totalPrice}
                placing={placing}
                onPlace={handlePlace}
                t={t}
              />
            )}

            {step < 2 && (
              <div className="checkout-nav">
                {step > 0 && (
                  <button className="checkout-btn checkout-btn--outline" onClick={() => setStep(s => s - 1)}>
                    <span className="ms">arrow_back</span> {t('checkout.prev')}
                  </button>
                )}
                <button className="checkout-btn checkout-btn--primary checkout-btn--next" onClick={handleNext}>
                  {t('checkout.next')} <span className="ms">arrow_forward</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: order summary */}
          <aside className="checkout-summary">
            <h3 className="checkout-summary__title">{t('checkout.orderSummary')}</h3>
            <ul className="checkout-summary__list">
              {items.map(item => (
                <li key={`${item.storeId}-${item.product.id}`} className="checkout-summary__item">
                  <div>
                    <span className="checkout-summary__item-name">{item.product.name}</span>
                    <span className="checkout-summary__item-store">{item.storeFlag} {item.storeName}</span>
                  </div>
                  <div className="checkout-summary__item-right">
                    <span className="checkout-summary__item-qty">x{item.qty}</span>
                    <span className="checkout-summary__item-price">{format(item.product.price * item.qty)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="checkout-summary__divider" />
            <div className="checkout-summary__total">
              <span>{t('checkout.total')}</span>
              <strong>{format(totalPrice)}</strong>
            </div>
            <div className="checkout-summary__count">{t('checkout.itemCount', { count: totalCount })}</div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className={`checkout-field${error ? ' checkout-field--error' : ''}`}>
      <label className="checkout-field__label">{label}</label>
      {children}
      {error && <span className="checkout-field__error">{error}</span>}
    </div>
  );
}

function AddressForm({ data, setData, errors, t }) {
  const set = (key) => (e) => setData(d => ({ ...d, [key]: e.target.value }));
  return (
    <div className="checkout-section">
      <h2 className="checkout-section__title">
        <span className="ms">location_on</span> {t('checkout.addressTitle')}
      </h2>
      <div className="checkout-grid">
        <Field label={t('checkout.fullName')} error={errors.fullName}>
          <input className="checkout-input" value={data.fullName} onChange={set('fullName')} placeholder={t('checkout.fullNamePh')} />
        </Field>
        <Field label={t('checkout.phone')} error={errors.phone}>
          <input className="checkout-input" value={data.phone} onChange={set('phone')} placeholder="+90 5xx xxx xx xx" />
        </Field>
        <Field label={t('checkout.city')} error={errors.city}>
          <input className="checkout-input" value={data.city} onChange={set('city')} placeholder={t('checkout.cityPh')} />
        </Field>
        <Field label={t('checkout.district')} error={errors.district}>
          <input className="checkout-input" value={data.district} onChange={set('district')} placeholder={t('checkout.districtPh')} />
        </Field>
      </div>
      <Field label={t('checkout.address')} error={errors.address}>
        <textarea className="checkout-input checkout-textarea" value={data.address} onChange={set('address')} placeholder={t('checkout.addressPh')} rows={3} />
      </Field>
      <Field label={t('checkout.zip')}>
        <input className="checkout-input checkout-input--sm" value={data.zip} onChange={set('zip')} placeholder="34000" maxLength={5} />
      </Field>
    </div>
  );
}

function PaymentForm({ data, setData, errors, t }) {
  const set = (key, transform) => (e) => {
    const val = transform ? transform(e.target.value) : e.target.value;
    setData(d => ({ ...d, [key]: val }));
  };
  return (
    <div className="checkout-section">
      <h2 className="checkout-section__title">
        <span className="ms">credit_card</span> {t('checkout.paymentTitle')}
      </h2>
      <div className="checkout-card-preview">
        <div className="checkout-card-preview__chip" />
        <div className="checkout-card-preview__number">
          {data.cardNumber || '•••• •••• •••• ••••'}
        </div>
        <div className="checkout-card-preview__bottom">
          <span>{data.cardName || t('checkout.cardNamePh')}</span>
          <span>{data.expiry || 'MM/YY'}</span>
        </div>
      </div>
      <div className="checkout-grid">
        <Field label={t('checkout.cardName')} error={errors.cardName}>
          <input className="checkout-input" value={data.cardName} onChange={set('cardName')} placeholder={t('checkout.cardNamePh')} />
        </Field>
        <Field label={t('checkout.cardNumber')} error={errors.cardNumber}>
          <input className="checkout-input" value={data.cardNumber} onChange={set('cardNumber', formatCard)} placeholder="0000 0000 0000 0000" />
        </Field>
        <Field label={t('checkout.expiry')} error={errors.expiry}>
          <input className="checkout-input checkout-input--sm" value={data.expiry} onChange={set('expiry', formatExpiry)} placeholder="MM/YY" maxLength={5} />
        </Field>
        <Field label="CVV" error={errors.cvv}>
          <input className="checkout-input checkout-input--sm" value={data.cvv} onChange={set('cvv')} placeholder="•••" maxLength={4} type="password" />
        </Field>
      </div>
      <div className="checkout-secure-note">
        <span className="ms">lock</span> {t('checkout.secureNote')}
      </div>
    </div>
  );
}

function ConfirmStep({ address, payment, items, format, totalPrice, placing, onPlace, t }) {
  return (
    <div className="checkout-section">
      <h2 className="checkout-section__title">
        <span className="ms">fact_check</span> {t('checkout.confirmTitle')}
      </h2>
      <div className="checkout-confirm-block">
        <h4><span className="ms">location_on</span> {t('checkout.addressTitle')}</h4>
        <p>{address.fullName} · {address.phone}</p>
        <p>{address.address}, {address.district}, {address.city} {address.zip}</p>
      </div>
      <div className="checkout-confirm-block">
        <h4><span className="ms">credit_card</span> {t('checkout.paymentTitle')}</h4>
        <p>{address.cardName} · **** **** **** {payment.cardNumber.replace(/\s/g,'').slice(-4)}</p>
      </div>
      <div className="checkout-confirm-total">
        {t('checkout.total')}: <strong>{format(totalPrice)}</strong>
      </div>
      <button
        className="checkout-btn checkout-btn--primary checkout-btn--place"
        onClick={onPlace}
        disabled={placing}
      >
        {placing ? (
          <><span className="ms checkout-spin">progress_activity</span> {t('checkout.placing')}</>
        ) : (
          <><span className="ms">check_circle</span> {t('checkout.placeOrder')}</>
        )}
      </button>
    </div>
  );
}
