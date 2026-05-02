import { useState } from 'react';
import './SellerPage.css';

const CATEGORIES = [
  { value: 'kilim', label: 'Kilim & Halı', icon: '🧶', color: '#C0392B', accent: '#E74C3C', roof: '#922B21' },
  { value: 'ceramic', label: 'Porselen & Seramik', icon: '🏺', color: '#2980B9', accent: '#3498DB', roof: '#1A5276' },
  { value: 'stone', label: 'Taş & Takı', icon: '💎', color: '#27AE60', accent: '#2ECC71', roof: '#1E8449' },
  { value: 'textile', label: 'Tekstil & Giyim', icon: '👗', color: '#8E44AD', accent: '#9B59B6', roof: '#6C3483' },
  { value: 'pottery', label: 'Çömlek & Toprak', icon: '🫙', color: '#D35400', accent: '#E67E22', roof: '#A04000' },
  { value: 'food', label: 'Yöresel Ürünler', icon: '🫒', color: '#F39C12', accent: '#F1C40F', roof: '#B7770D' },
  { value: 'art', label: 'El Sanatları & Sanat', icon: '🎨', color: '#16A085', accent: '#1ABC9C', roof: '#0E6655' },
  { value: 'leather', label: 'Deri & El Çantası', icon: '👜', color: '#7F8C8D', accent: '#95A5A6', roof: '#626567' },
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

const STEPS = ['Mağaza Bilgileri', 'Konum & Görünüm', 'Onay'];

const initialForm = {
  name: '',
  owner: '',
  category: '',
  description: '',
  location: '',
  openSince: new Date().getFullYear(),
  flag: '🔴',
  badge: 'Yeni',
  color: '#C0392B',
  accentColor: '#E74C3C',
  roofColor: '#922B21',
};

function StepIndicator({ current }) {
  return (
    <div className="seller-steps">
      {STEPS.map((label, i) => (
        <div
          key={i}
          className={`seller-step${i === current ? ' seller-step--active' : ''}${i < current ? ' seller-step--done' : ''}`}
        >
          <div className="seller-step__circle">
            {i < current ? '✓' : i + 1}
          </div>
          <span className="seller-step__label">{label}</span>
          {i < STEPS.length - 1 && <div className="seller-step__line" />}
        </div>
      ))}
    </div>
  );
}

export default function SellerPage({ onBack, onSubmit }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleCategorySelect = (cat) => {
    setForm((f) => ({
      ...f,
      category: cat.label,
      color: cat.color,
      accentColor: cat.accent,
      roofColor: cat.roof,
    }));
    setErrors((e) => ({ ...e, category: undefined }));
  };

  const validateStep0 = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Mağaza adı zorunludur.';
    if (!form.owner.trim()) e.owner = 'Yetkili ad-soyad zorunludur.';
    if (!form.category) e.category = 'Kategori seçiniz.';
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

  if (submitted) {
    return (
      <div className="seller-page">
        <header className="seller-page__navbar">
          <button className="seller-page__back" onClick={onBack}>← Çarşıya Dön</button>
          <h1 className="seller-page__navbar-title">Satıcı Başvurusu</h1>
        </header>
        <div className="seller-page__success">
          <div className="seller-page__success-icon">🎉</div>
          <h2>Mağazanız Açıldı!</h2>
          <p>
            <strong>{form.name}</strong> artık Kapadokya Çarşısı'nda yerini aldı.<br />
            3D çarşıya dönerek mağazanızı görebilirsiniz.
          </p>
          <button className="seller-page__success-btn" onClick={onBack}>
            🏔️ Çarşıya Git
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-page">
      {/* Navbar */}
      <header className="seller-page__navbar">
        <button className="seller-page__back" onClick={onBack}>← Çarşıya Dön</button>
        <div className="seller-page__navbar-brand">
          <span className="seller-page__navbar-icon">🏪</span>
          <div>
            <h1 className="seller-page__navbar-title">Satıcı Ol</h1>
            <span className="seller-page__navbar-sub">Kapadokya 3D Çarşısında kendi dükkanını aç</span>
          </div>
        </div>
      </header>

      <div className="seller-page__body">
        {/* Sol – bilgi paneli */}
        <aside className="seller-page__info-panel">
          <div className="seller-page__info-hero">
            <div className="seller-page__info-icon">🏔️</div>
            <h2>Neden Kapadokya Çarşısı?</h2>
          </div>
          <ul className="seller-page__benefits">
            <li>
              <span className="seller-page__benefit-icon">🌐</span>
              <div>
                <strong>3D Vitrin</strong>
                <p>Mağazanız sanal çarşıda 3 boyutlu olarak görünür</p>
              </div>
            </li>
            <li>
              <span className="seller-page__benefit-icon">✨</span>
              <div>
                <strong>Yapay Zeka Desteği</strong>
                <p>AI ile özgün ürün tasarımları oluştur</p>
              </div>
            </li>
            <li>
              <span className="seller-page__benefit-icon">📱</span>
              <div>
                <strong>Kolay Yönetim</strong>
                <p>Ürünlerini, siparişlerini kolayca takip et</p>
              </div>
            </li>
            <li>
              <span className="seller-page__benefit-icon">🛒</span>
              <div>
                <strong>Geniş Kitle</strong>
                <p>Kapadokya'yı seven alıcılara ulaş</p>
              </div>
            </li>
          </ul>

          {/* Canlı önizleme */}
          {form.name && (
            <div className="seller-page__preview" style={{ borderColor: form.accentColor }}>
              <div className="seller-page__preview-label">Canlı Önizleme</div>
              <div className="seller-page__preview-card" style={{ background: form.color + '18' }}>
                <span className="seller-page__preview-flag">{form.flag}</span>
                <div>
                  <div className="seller-page__preview-name">{form.name}</div>
                  <div className="seller-page__preview-cat">{form.category}</div>
                </div>
                <span
                  className="seller-page__preview-badge"
                  style={{ background: form.accentColor }}
                >
                  {form.badge}
                </span>
              </div>
            </div>
          )}
        </aside>

        {/* Sağ – form */}
        <main className="seller-page__form-area">
          <StepIndicator current={step} />

          <div className="seller-page__form-card">
            {/* ADIM 0 – Mağaza Bilgileri */}
            {step === 0 && (
              <div className="seller-page__step-content">
                <h2 className="seller-page__step-title">Mağaza Bilgileri</h2>

                <div className="seller-page__field">
                  <label className="seller-page__label">
                    Mağaza Adı <span className="seller-page__req">*</span>
                  </label>
                  <input
                    className={`seller-page__input${errors.name ? ' seller-page__input--error' : ''}`}
                    placeholder="Örn: Kapadokya Kilim Evi"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    maxLength={60}
                  />
                  {errors.name && <span className="seller-page__error">{errors.name}</span>}
                </div>

                <div className="seller-page__field">
                  <label className="seller-page__label">
                    Yetkili Ad Soyad <span className="seller-page__req">*</span>
                  </label>
                  <input
                    className={`seller-page__input${errors.owner ? ' seller-page__input--error' : ''}`}
                    placeholder="Örn: Mehmet Yılmaz"
                    value={form.owner}
                    onChange={(e) => set('owner', e.target.value)}
                    maxLength={60}
                  />
                  {errors.owner && <span className="seller-page__error">{errors.owner}</span>}
                </div>

                <div className="seller-page__field">
                  <label className="seller-page__label">
                    Kategori <span className="seller-page__req">*</span>
                  </label>
                  <div className="seller-page__categories">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        className={`seller-page__cat-btn${form.category === cat.label ? ' seller-page__cat-btn--active' : ''}`}
                        style={form.category === cat.label ? { borderColor: cat.accent, background: cat.color + '15', color: cat.color } : {}}
                        onClick={() => handleCategorySelect(cat)}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                  {errors.category && <span className="seller-page__error">{errors.category}</span>}
                </div>

                <div className="seller-page__field">
                  <label className="seller-page__label">
                    Mağaza Tanıtımı <span className="seller-page__req">*</span>
                  </label>
                  <textarea
                    className={`seller-page__textarea${errors.description ? ' seller-page__input--error' : ''}`}
                    placeholder="Mağazanızı ve ürünlerinizi kısaca tanıtın..."
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    rows={3}
                    maxLength={300}
                  />
                  <div className="seller-page__char">{form.description.length} / 300</div>
                  {errors.description && <span className="seller-page__error">{errors.description}</span>}
                </div>
              </div>
            )}

            {/* ADIM 1 – Konum & Görünüm */}
            {step === 1 && (
              <div className="seller-page__step-content">
                <h2 className="seller-page__step-title">Konum & Görünüm</h2>

                <div className="seller-page__row">
                  <div className="seller-page__field seller-page__field--half">
                    <label className="seller-page__label">
                      Konum <span className="seller-page__req">*</span>
                    </label>
                    <input
                      className={`seller-page__input${errors.location ? ' seller-page__input--error' : ''}`}
                      placeholder="Örn: Göreme, Nevşehir"
                      value={form.location}
                      onChange={(e) => set('location', e.target.value)}
                    />
                    {errors.location && <span className="seller-page__error">{errors.location}</span>}
                  </div>
                  <div className="seller-page__field seller-page__field--half">
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

            {/* ADIM 2 – Onay */}
            {step === 2 && (
              <div className="seller-page__step-content">
                <h2 className="seller-page__step-title">Bilgileri Onayla</h2>

                <div className="seller-page__review">
                  <div className="seller-page__review-header" style={{ background: form.color + '18', borderColor: form.accentColor }}>
                    <span style={{ fontSize: 36 }}>{form.flag}</span>
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
                    <a href="#" onClick={(e) => e.preventDefault()}>Kullanım Şartları</a>'nı
                    ve{' '}
                    <a href="#" onClick={(e) => e.preventDefault()}>Satıcı Politikası</a>'nı
                    kabul etmiş olursunuz.
                  </p>
                </div>
              </div>
            )}

            {/* Navigasyon butonları */}
            <div className="seller-page__form-actions">
              {step > 0 && (
                <button
                  className="seller-page__btn seller-page__btn--secondary"
                  onClick={() => setStep((s) => s - 1)}
                >
                  ← Geri
                </button>
              )}
              <div style={{ flex: 1 }} />
              {step < STEPS.length - 1 ? (
                <button
                  className="seller-page__btn seller-page__btn--primary"
                  style={{ background: form.accentColor || 'var(--color-accent)' }}
                  onClick={handleNext}
                >
                  Devam Et →
                </button>
              ) : (
                <button
                  className="seller-page__btn seller-page__btn--primary seller-page__btn--submit"
                  style={{ background: form.accentColor || 'var(--color-accent)' }}
                  onClick={handleSubmit}
                >
                  🏪 Mağazamı Aç
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
