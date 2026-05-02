import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './SellerPage.css';

const CATEGORY_DEFS = [
  { value: 'ceramic', icon: 'local_dining', color: '#C0392B', accent: '#E74C3C', roof: '#922B21' },
  { value: 'kilim',   icon: 'grid_view',    color: '#2980B9', accent: '#3498DB', roof: '#1A5276' },
  { value: 'stone',   icon: 'diamond',      color: '#27AE60', accent: '#2ECC71', roof: '#1E8449' },
  { value: 'wood',    icon: 'forest',       color: '#8E44AD', accent: '#9B59B6', roof: '#6C3483' },
  { value: 'metal',   icon: 'local_cafe',   color: '#D35400', accent: '#E67E22', roof: '#A04000' },
  { value: 'textile', icon: 'checkroom',    color: '#F39C12', accent: '#F1C40F', roof: '#B7770D' },
  { value: 'glass',   icon: 'water_drop',   color: '#16A085', accent: '#1ABC9C', roof: '#0E6655' },
  { value: 'leather', icon: 'style',        color: '#7F8C8D', accent: '#95A5A6', roof: '#626567' },
];

const FLAG_EMOJIS = [
  { emoji: '🔴', key: 'red' },
  { emoji: '🔵', key: 'blue' },
  { emoji: '🟢', key: 'green' },
  { emoji: '🟣', key: 'purple' },
  { emoji: '🟠', key: 'orange' },
  { emoji: '🟡', key: 'yellow' },
  { emoji: '🟤', key: 'brown' },
  { emoji: '⚪', key: 'white' },
];

const initialForm = {
  name: '', owner: '', category: '', description: '',
  location: '', openSince: new Date().getFullYear(),
  flag: '🔴', badge: 'Yeni',
  color: '#C0392B', accentColor: '#E74C3C', roofColor: '#922B21',
};

function StepIndicator({ current, steps }) {
  const progress = current === 0 ? '0%' : current === 1 ? '50%' : '100%';
  return (
    <div className="seller-steps">
      <div className="seller-steps__track" />
      <div className="seller-steps__progress" style={{ width: progress }} />
      {steps.map((label, i) => (
        <div
          key={i}
          className={`seller-step${i === current ? ' seller-step--active' : ''}${i < current ? ' seller-step--done' : ''}`}
        >
          <div className="seller-step__dot">
            {i < current ? <span className="ms">check</span> : i + 1}
          </div>
          <span className="seller-step__label">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function SellerPage({ onBack, onSubmit, onNavigate }) {
  const { t } = useTranslation();

  const CATEGORIES = CATEGORY_DEFS.map((c) => ({ ...c, label: t(`seller.categories.${c.value}`) }));
  const FLAGS = FLAG_EMOJIS.map((f) => ({ ...f, label: t(`seller.flags.${f.key}`) }));
  const STEPS = t('seller.steps', { returnObjects: true });

  const [step, setStep]           = useState(0);
  const [form, setForm]           = useState(initialForm);
  const [errors, setErrors]       = useState({});
  const [submitted, setSubmitted] = useState(false);

  const navigate = (page) => { onNavigate?.(page); onBack?.(); };

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleCategorySelect = (cat) => {
    setForm((f) => ({ ...f, category: cat.label, color: cat.color, accentColor: cat.accent, roofColor: cat.roof }));
    setErrors((e) => ({ ...e, category: undefined }));
  };

  const validateStep0 = () => {
    const e = {};
    if (!form.name.trim())        e.name = t('seller.errorName');
    if (!form.owner.trim())       e.owner = t('seller.errorOwner');
    if (!form.category)           e.category = t('seller.errorCategory');
    if (!form.description.trim()) e.description = t('seller.errorDescription');
    return e;
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.location.trim()) e.location = t('seller.errorLocation');
    return e;
  };

  const handleNext = () => {
    const e = step === 0 ? validateStep0() : step === 1 ? validateStep1() : {};
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setStep((s) => s + 1);
  };

  const handleSubmit = () => {
    onSubmit(form);
    setSubmitted(true);
  };

  /* ── Başarı ekranı ── */
  if (submitted) {
    return (
      <div className="seller-page">
        <div className="seller-page__nav-outer">
          <header className="seller-page__nav">
            <div className="seller-page__brand" onClick={() => navigate('market')}>{t('nav.brand')}</div>
          </header>
        </div>
        <div className="seller-page__success">
          <div className="seller-page__success-icon">🎉</div>
          <h2>{t('seller.successTitle')}</h2>
          <p dangerouslySetInnerHTML={{ __html: t('seller.successText', { name: form.name }) }} />
          <button className="seller-page__success-btn" onClick={onBack}>
            <span className="ms">storefront</span>{t('seller.goToMarket')}
          </button>
        </div>
      </div>
    );
  }

  const previewCat = CATEGORIES.find((c) => c.label === form.category);

  return (
    <div className="seller-page">

      {/* ── Navbar ── */}
      <div className="seller-page__nav-outer">
        <header className="seller-page__nav">
          <div className="seller-page__brand" onClick={() => navigate('market')}>{t('nav.brand')}</div>
          <nav className="seller-page__nav-links">
            <button className="seller-page__nav-link" onClick={() => navigate('market')}>{t('nav.market')}</button>
            <button className="seller-page__nav-link" onClick={() => navigate('ai')}>{t('nav.ai')}</button>
            <button className="seller-page__nav-link seller-page__nav-link--active">{t('nav.seller')}</button>
          </nav>
          <div className="seller-page__nav-actions">
            <button className="seller-page__nav-icon-btn"><span className="ms">shopping_basket</span></button>
            <button className="seller-page__nav-icon-btn"><span className="ms">person</span></button>
            <LanguageSwitcher />
          </div>
        </header>
      </div>

      <main className="seller-page__main">

        {/* ── Sol bilgi kolonu ── */}
        <aside className="seller-page__info">
          <h1 className="seller-page__info-title">{t('seller.whyTitle')}</h1>
          <p className="seller-page__info-desc">{t('seller.whyDesc')}</p>

          <div className="seller-page__benefits">
            <div className="seller-page__benefit">
              <div className="seller-page__benefit-icon">
                <span className="ms">view_in_ar</span>
              </div>
              <div className="seller-page__benefit-body">
                <h3>{t('seller.benefit3D')}</h3>
                <p>{t('seller.benefit3DDesc')}</p>
              </div>
            </div>
            <div className="seller-page__benefit">
              <div className="seller-page__benefit-icon">
                <span className="ms">smart_toy</span>
              </div>
              <div className="seller-page__benefit-body">
                <h3>{t('seller.benefitAI')}</h3>
                <p>{t('seller.benefitAIDesc')}</p>
              </div>
            </div>
            <div className="seller-page__benefit">
              <div className="seller-page__benefit-icon">
                <span className="ms">public</span>
              </div>
              <div className="seller-page__benefit-body">
                <h3>{t('seller.benefitGlobal')}</h3>
                <p>{t('seller.benefitGlobalDesc')}</p>
              </div>
            </div>
          </div>

          {/* Canlı önizleme kartı */}
          <div className="seller-page__preview-card">
            <div className="seller-page__preview-label">{t('seller.previewLabel')}</div>
            <div
              className="seller-page__preview-img"
              style={{ background: (previewCat?.color ?? '#fce4cc') + '33' }}
            >
              {form.flag}
            </div>
            <div className="seller-page__preview-store">
              <div className="seller-page__preview-avatar">
                {form.name ? form.name[0].toUpperCase() : 'Z'}
              </div>
              <div>
                <div className="seller-page__preview-name">
                  {form.name || t('seller.previewDefault')}
                </div>
                <div className="seller-page__preview-cat">
                  {form.category || t('seller.previewCatDefault')}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Sağ sihirbaz kolonu ── */}
        <div className="seller-page__wizard">

          <div>
            <StepIndicator current={step} steps={STEPS} />

            {/* ── ADIM 0 – Mağaza Bilgileri ── */}
            {step === 0 && (
              <div className="seller-page__step-content">
                <h2 className="seller-page__step-title">{t('seller.step0Title')}</h2>

                <div className="seller-page__field-row">
                  <div className="seller-page__field">
                    <label className="seller-page__label">{t('seller.fieldStoreName')} <span className="seller-page__req">*</span></label>
                    <input
                      className={`seller-page__input${errors.name ? ' seller-page__input--error' : ''}`}
                      placeholder={t('seller.storeNamePlaceholder')}
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      maxLength={60}
                    />
                    {errors.name && <span className="seller-page__error-msg">{errors.name}</span>}
                  </div>
                  <div className="seller-page__field">
                    <label className="seller-page__label">{t('seller.fieldOwner')} <span className="seller-page__req">*</span></label>
                    <input
                      className={`seller-page__input${errors.owner ? ' seller-page__input--error' : ''}`}
                      placeholder={t('seller.ownerPlaceholder')}
                      value={form.owner}
                      onChange={(e) => set('owner', e.target.value)}
                      maxLength={60}
                    />
                    {errors.owner && <span className="seller-page__error-msg">{errors.owner}</span>}
                  </div>
                </div>

                <div className="seller-page__field">
                  <label className="seller-page__label">{t('seller.fieldCategory')} <span className="seller-page__req">*</span></label>
                  <div className="seller-page__categories">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        className={`seller-page__cat-card${form.category === cat.label ? ' seller-page__cat-card--active' : ''}`}
                        onClick={() => handleCategorySelect(cat)}
                      >
                        <span className="ms">{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                  {errors.category && <span className="seller-page__error-msg">{errors.category}</span>}
                </div>

                <div className="seller-page__field">
                  <label className="seller-page__label">{t('seller.fieldDescription')} <span className="seller-page__req">*</span></label>
                  <textarea
                    className={`seller-page__textarea${errors.description ? ' seller-page__input--error' : ''}`}
                    placeholder={t('seller.descPlaceholder')}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    rows={3}
                    maxLength={300}
                  />
                  <div className="seller-page__char">{form.description.length} / 300</div>
                  {errors.description && <span className="seller-page__error-msg">{errors.description}</span>}
                </div>
              </div>
            )}

            {/* ── ADIM 1 – Konum ── */}
            {step === 1 && (
              <div className="seller-page__step-content">
                <h2 className="seller-page__step-title">{t('seller.step1Title')}</h2>

                <div className="seller-page__field-row">
                  <div className="seller-page__field">
                    <label className="seller-page__label">{t('seller.fieldLocation')} <span className="seller-page__req">*</span></label>
                    <input
                      className={`seller-page__input${errors.location ? ' seller-page__input--error' : ''}`}
                      placeholder={t('seller.locationPlaceholder')}
                      value={form.location}
                      onChange={(e) => set('location', e.target.value)}
                    />
                    {errors.location && <span className="seller-page__error-msg">{errors.location}</span>}
                  </div>
                  <div className="seller-page__field">
                    <label className="seller-page__label">{t('seller.fieldYear')}</label>
                    <input
                      className="seller-page__input"
                      type="number"
                      min={1900}
                      max={new Date().getFullYear()}
                      value={form.openSince}
                      onChange={(e) => set('openSince', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="seller-page__field">
                  <label className="seller-page__label">{t('seller.fieldBadge')}</label>
                  <input
                    className="seller-page__input"
                    placeholder={t('seller.fieldBadgePlaceholder')}
                    value={form.badge}
                    onChange={(e) => set('badge', e.target.value)}
                    maxLength={20}
                  />
                </div>

                <div className="seller-page__field">
                  <label className="seller-page__label">{t('seller.fieldFlag')}</label>
                  <div className="seller-page__flags">
                    {FLAGS.map((f) => (
                      <button
                        key={f.emoji}
                        type="button"
                        className={`seller-page__flag-btn${form.flag === f.emoji ? ' seller-page__flag-btn--active' : ''}`}
                        title={f.label}
                        onClick={() => set('flag', f.emoji)}
                      >
                        {f.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="seller-page__field">
                  <label className="seller-page__label">{t('seller.fieldColor')}</label>
                  <div className="seller-page__color-row">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        className={`seller-page__color-dot${form.accentColor === cat.accent ? ' seller-page__color-dot--active' : ''}`}
                        style={{ background: cat.accent }}
                        title={cat.label}
                        onClick={() => setForm((f) => ({ ...f, color: cat.color, accentColor: cat.accent, roofColor: cat.roof }))}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ADIM 2 – Onay ── */}
            {step === 2 && (
              <div className="seller-page__step-content">
                <h2 className="seller-page__step-title">{t('seller.step2Title')}</h2>

                <div className="seller-page__review">
                  <div className="seller-page__review-header" style={{ background: form.color + '18', borderColor: form.accentColor }}>
                    <span className="seller-page__review-flag">{form.flag}</span>
                    <div>
                      <div className="seller-page__review-name">{form.name}</div>
                      <div className="seller-page__review-cat">{form.category}</div>
                    </div>
                    <span className="seller-page__review-badge" style={{ background: form.accentColor }}>{form.badge}</span>
                  </div>
                  <table className="seller-page__review-table">
                    <tbody>
                      <tr><td>{t('seller.tableOwner')}</td><td>{form.owner}</td></tr>
                      <tr><td>{t('seller.tableLocation')}</td><td>{form.location}</td></tr>
                      <tr><td>{t('seller.tableYear')}</td><td>{form.openSince}</td></tr>
                      <tr><td>{t('seller.tableDesc')}</td><td>{form.description}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="seller-page__terms">
                  <p>
                    {t('seller.termsText')}{' '}
                    <a href="#" onClick={(e) => e.preventDefault()}>{t('seller.termsLink1')}</a>{' '}
                    {t('seller.termsAnd')}{' '}
                    <a href="#" onClick={(e) => e.preventDefault()}>{t('seller.termsLink2')}</a>
                    {t('seller.termsEnd')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer aksiyon butonları ── */}
          <div className="seller-page__actions">
            <button
              className="seller-page__btn seller-page__btn--cancel"
              onClick={step > 0 ? () => setStep((s) => s - 1) : onBack}
            >
              {step > 0 ? t('seller.back') : t('seller.cancel')}
            </button>

            {step < STEPS.length - 1 ? (
              <button className="seller-page__btn seller-page__btn--primary" onClick={handleNext}>
                {t('seller.next')} <span className="ms">arrow_forward</span>
              </button>
            ) : (
              <button className="seller-page__btn seller-page__btn--primary" onClick={handleSubmit}>
                <span className="ms">storefront</span>{t('seller.submit')}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

