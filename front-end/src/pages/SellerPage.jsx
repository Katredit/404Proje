import { useState } from 'react';
import './SellerPage.css';

const CATEGORIES = [
  { value: 'ceramic',  label: 'Seramik',       icon: 'local_dining', color: '#C0392B', accent: '#E74C3C', roof: '#922B21' },
  { value: 'kilim',    label: 'Halı & Kilim',   icon: 'grid_view',    color: '#2980B9', accent: '#3498DB', roof: '#1A5276' },
  { value: 'stone',    label: 'Takı',           icon: 'diamond',      color: '#27AE60', accent: '#2ECC71', roof: '#1E8449' },
  { value: 'wood',     label: 'Ahşap İşi',      icon: 'forest',       color: '#8E44AD', accent: '#9B59B6', roof: '#6C3483' },
  { value: 'metal',    label: 'Bakır & Metal',  icon: 'local_cafe',   color: '#D35400', accent: '#E67E22', roof: '#A04000' },
  { value: 'textile',  label: 'Tekstil',        icon: 'checkroom',    color: '#F39C12', accent: '#F1C40F', roof: '#B7770D' },
  { value: 'glass',    label: 'Cam Sanatı',     icon: 'water_drop',   color: '#16A085', accent: '#1ABC9C', roof: '#0E6655' },
  { value: 'leather',  label: 'Deri İşçiliği',  icon: 'style',        color: '#7F8C8D', accent: '#95A5A6', roof: '#626567' },
];

const FLAGS = [
  { emoji: '🔴', label: 'Kırmızı' },
  { emoji: '🔵', label: 'Mavi' },
  { emoji: '🟢', label: 'Yeşil' },
  { emoji: '🟣', label: 'Mor' },
  { emoji: '🟠', label: 'Turuncu' },
  { emoji: '🟡', label: 'Sarı' },
  { emoji: '🟤', label: 'Kahverengi' },
  { emoji: '⚪', label: 'Beyaz' },
];

const STEPS = ['Mağaza Bilgileri', 'Konum', 'Onay'];

const initialForm = {
  name: '', owner: '', category: '', description: '',
  location: '', openSince: new Date().getFullYear(),
  flag: '🔴', badge: 'Yeni',
  color: '#C0392B', accentColor: '#E74C3C', roofColor: '#922B21',
};

function StepIndicator({ current }) {
  const progress = current === 0 ? '0%' : current === 1 ? '50%' : '100%';
  return (
    <div className="seller-steps">
      <div className="seller-steps__track" />
      <div className="seller-steps__progress" style={{ width: progress }} />
      {STEPS.map((label, i) => (
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
  const [step, setStep]         = useState(0);
  const [form, setForm]         = useState(initialForm);
  const [errors, setErrors]     = useState({});
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
    if (!form.name.trim())        e.name = 'Mağaza adı zorunludur.';
    if (!form.owner.trim())       e.owner = 'Yetkili adı zorunludur.';
    if (!form.category)           e.category = 'Kategori seçiniz.';
    if (!form.description.trim()) e.description = 'Mağaza tanıtımı zorunludur.';
    return e;
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.location.trim()) e.location = 'Konum zorunludur.';
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
            <div className="seller-page__brand" onClick={() => navigate('market')}>Kapadokya Çarşısı</div>
          </header>
        </div>
        <div className="seller-page__success">
          <div className="seller-page__success-icon">🎉</div>
          <h2>Mağazanız Açıldı!</h2>
          <p>
            <strong>{form.name}</strong> artık Kapadokya Çarşısı'nda yerini aldı.<br />
            3D çarşıya dönerek mağazanızı görebilirsiniz.
          </p>
          <button className="seller-page__success-btn" onClick={onBack}>
            <span className="ms">storefront</span>Çarşıya Git
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
          <div className="seller-page__brand" onClick={() => navigate('market')}>Kapadokya Çarşısı</div>
          <nav className="seller-page__nav-links">
            <button className="seller-page__nav-link" onClick={() => navigate('market')}>Çarşı</button>
            <button className="seller-page__nav-link" onClick={() => navigate('ai')}>AI Tasarım</button>
            <button className="seller-page__nav-link seller-page__nav-link--active">Satıcı Ol</button>
          </nav>
          <div className="seller-page__nav-actions">
            <button className="seller-page__nav-icon-btn"><span className="ms">shopping_basket</span></button>
            <button className="seller-page__nav-icon-btn"><span className="ms">person</span></button>
          </div>
        </header>
      </div>

      <main className="seller-page__main">

        {/* ── Sol bilgi kolonu ── */}
        <aside className="seller-page__info">
          <h1 className="seller-page__info-title">Neden Kapadokya Çarşısı?</h1>
          <p className="seller-page__info-desc">
            Geleneksel zanaatınızı modern teknolojiyle birleştirin. Global bir pazarda,
            size özel araçlarla büyümeye hemen başlayın.
          </p>

          <div className="seller-page__benefits">
            <div className="seller-page__benefit">
              <div className="seller-page__benefit-icon">
                <span className="ms">view_in_ar</span>
              </div>
              <div className="seller-page__benefit-body">
                <h3>3D Vitrin Deneyimi</h3>
                <p>Müşterilerinize ürünlerinizi her açıdan gösterin.</p>
              </div>
            </div>
            <div className="seller-page__benefit">
              <div className="seller-page__benefit-icon">
                <span className="ms">smart_toy</span>
              </div>
              <div className="seller-page__benefit-body">
                <h3>Yapay Zeka Desteği</h3>
                <p>Koleksiyon yönetimi ve fiyatlandırma asistanı.</p>
              </div>
            </div>
            <div className="seller-page__benefit">
              <div className="seller-page__benefit-icon">
                <span className="ms">public</span>
              </div>
              <div className="seller-page__benefit-body">
                <h3>Global Müşteri Ağı</h3>
                <p>Sınırları aşın, tüm dünyaya satış yapın.</p>
              </div>
            </div>
          </div>

          {/* Canlı önizleme kartı */}
          <div className="seller-page__preview-card">
            <div className="seller-page__preview-label">Canlı Önizleme</div>
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
                  {form.name || 'Zanaatkar Koleksiyonu'}
                </div>
                <div className="seller-page__preview-cat">
                  {form.category || 'Seramik & Çini Sanatı'}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Sağ sihirbaz kolonu ── */}
        <div className="seller-page__wizard">

          <div>
            <StepIndicator current={step} />

            {/* ── ADIM 0 – Mağaza Bilgileri ── */}
            {step === 0 && (
              <div className="seller-page__step-content">
                <h2 className="seller-page__step-title">Mağazanızı Oluşturun</h2>

                <div className="seller-page__field-row">
                  <div className="seller-page__field">
                    <label className="seller-page__label">Mağaza Adı <span className="seller-page__req">*</span></label>
                    <input
                      className={`seller-page__input${errors.name ? ' seller-page__input--error' : ''}`}
                      placeholder="Örn: Kapadokya Çini Evi"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      maxLength={60}
                    />
                    {errors.name && <span className="seller-page__error-msg">{errors.name}</span>}
                  </div>
                  <div className="seller-page__field">
                    <label className="seller-page__label">Sahibinin Adı <span className="seller-page__req">*</span></label>
                    <input
                      className={`seller-page__input${errors.owner ? ' seller-page__input--error' : ''}`}
                      placeholder="Adınız Soyadınız"
                      value={form.owner}
                      onChange={(e) => set('owner', e.target.value)}
                      maxLength={60}
                    />
                    {errors.owner && <span className="seller-page__error-msg">{errors.owner}</span>}
                  </div>
                </div>

                <div className="seller-page__field">
                  <label className="seller-page__label">Ana Kategori Seçin <span className="seller-page__req">*</span></label>
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
                  <label className="seller-page__label">Mağaza Tanıtımı <span className="seller-page__req">*</span></label>
                  <textarea
                    className={`seller-page__textarea${errors.description ? ' seller-page__input--error' : ''}`}
                    placeholder="Mağazanızı ve ürünlerinizi kısaca tanıtın..."
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
                <h2 className="seller-page__step-title">Konum & Görünüm</h2>

                <div className="seller-page__field-row">
                  <div className="seller-page__field">
                    <label className="seller-page__label">Konum <span className="seller-page__req">*</span></label>
                    <input
                      className={`seller-page__input${errors.location ? ' seller-page__input--error' : ''}`}
                      placeholder="Örn: Göreme, Nevşehir"
                      value={form.location}
                      onChange={(e) => set('location', e.target.value)}
                    />
                    {errors.location && <span className="seller-page__error-msg">{errors.location}</span>}
                  </div>
                  <div className="seller-page__field">
                    <label className="seller-page__label">Kuruluş Yılı</label>
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
                  <label className="seller-page__label">Mağaza Rozeti</label>
                  <input
                    className="seller-page__input"
                    placeholder="Örn: El Yapımı, Çok Satan, Yeni..."
                    value={form.badge}
                    onChange={(e) => set('badge', e.target.value)}
                    maxLength={20}
                  />
                </div>

                <div className="seller-page__field">
                  <label className="seller-page__label">Mağaza Simgesi</label>
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
                  <label className="seller-page__label">Mağaza Rengi</label>
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
                <h2 className="seller-page__step-title">Bilgileri Onayla</h2>

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
                      <tr><td>Yetkili</td><td>{form.owner}</td></tr>
                      <tr><td>Konum</td><td>{form.location}</td></tr>
                      <tr><td>Kuruluş</td><td>{form.openSince}</td></tr>
                      <tr><td>Açıklama</td><td>{form.description}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="seller-page__terms">
                  <p>
                    "Mağazamı Aç" butonuna tıklayarak{' '}
                    <a href="#" onClick={(e) => e.preventDefault()}>Kullanım Şartları</a>'nı ve{' '}
                    <a href="#" onClick={(e) => e.preventDefault()}>Satıcı Politikası</a>'nı kabul etmiş olursunuz.
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
              {step > 0 ? 'Geri' : 'İptal'}
            </button>

            {step < STEPS.length - 1 ? (
              <button className="seller-page__btn seller-page__btn--primary" onClick={handleNext}>
                Devam Et <span className="ms">arrow_forward</span>
              </button>
            ) : (
              <button className="seller-page__btn seller-page__btn--primary" onClick={handleSubmit}>
                <span className="ms">storefront</span>Mağazamı Aç
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
