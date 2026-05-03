import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './AIDesignPage.css';

const BASE_URL = 'http://localhost:5000';

const PRODUCT_TYPES = [
  { key: 'vazo', emoji: '🏺' },
  { key: 'kilim', emoji: '🧶' },
];

const PRESETS = {
  vazo: [
    { key: 'vazo_kapadokya', emoji: '🏺' },
    { key: 'vazo_iznik', emoji: '🌷' },
    { key: 'vazo_selcuk', emoji: '✦' },
  ],
  kilim: [
    { key: 'kilim_anadolu', emoji: '🧶' },
    { key: 'kilim_bergama', emoji: '🔴' },
    { key: 'kilim_konya', emoji: '⭐' },
  ],
};
export default function AIDesignPage({ onBack, onNavigate }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [productType, setProductType]   = useState('vazo');
  const [prompt, setPrompt]             = useState('');
  const [photo, setPhoto]               = useState(null);
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const [sessionId, setSessionId]       = useState(null);
  const [editPrompt, setEditPrompt]     = useState('');
  const [orderNote, setOrderNote]       = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError]     = useState('');
  const [editPhoto, setEditPhoto]       = useState(null);
  const [editLoading, setEditLoading]   = useState(false);
  const [canUndo, setCanUndo]           = useState(false);
  const [error, setError]               = useState('');
  const [editError, setEditError]       = useState('');
  const [history, setHistory]           = useState([]);
  const [activePreset, setActivePreset] = useState(null);
  const [dragOver, setDragOver]         = useState(false);
  const [editDragOver, setEditDragOver] = useState(false);

  const promptRef    = useRef(null);
  const photoRef     = useRef(null);
  const editPhotoRef = useRef(null);

  const toDataUrl = (b64) => `data:image/png;base64,${b64}`;

  useEffect(() => {
    if (!activePreset) return;
    setPrompt(t(`ai.presetPrompt_${activePreset}`));
  }, [activePreset, i18n.language, t]);

  const handleProductTypeChange = (type) => {
    setProductType(type);
    setActivePreset(null);
    setPrompt('');
  };

  const handlePreset = (preset) => {
    setPrompt(t(`ai.presetPrompt_${preset.key}`));
    setActivePreset(preset.key);
    promptRef.current?.focus();
  };

  const handlePhotoFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setPhoto(file);
  };

  const handleEditPhotoFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setEditPhoto(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError(t('ai.errPrompt')); return; }
    setError('');
    setLoading(true);
    setResult(null);
    setSessionId(null);
    setCanUndo(false);
    try {
      let imgSrc;
      if (photo) {
        const form = new FormData();
        form.append('istek', `${productType} ${t('ai.promptLabel').toLowerCase()}: ${prompt}`);
        form.append('fotograf', photo);
        const res = await fetch(`${BASE_URL}/uret`, { method: 'POST', body: form });
        if (!res.ok) throw new Error(`Sunucu hatası: ${res.status}`);
        const data = await res.json();
        if (!data.basarili) throw new Error(data.hata || 'Görsel üretilemedi.');
        imgSrc = toDataUrl(data.gorsel_base64);
      } else {
        const res = await fetch(`${BASE_URL}/tasarim/baslat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: `${productType} tasarımı: ${prompt}`, urun_tipi: productType }),
        });
        if (!res.ok) throw new Error(`Sunucu hatası: ${res.status}`);
        const data = await res.json();
        if (!data.basarili) throw new Error(data.hata || 'Görsel üretilemedi.');
        imgSrc = toDataUrl(data.gorsel_base64);
        setSessionId(data.session_id);
      }
      setResult(imgSrc);
      setHistory((h) => [{ url: imgSrc, prompt, ts: Date.now() }, ...h.slice(0, 7)]);
    } catch (err) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!sessionId || !editPrompt.trim()) { setEditError(t('ai.errEditPrompt')); return; }
    setEditError('');
    setEditLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/tasarim/duzenle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, duzenleme: editPrompt }),
      });
      if (!res.ok) throw new Error(`Sunucu hatası: ${res.status}`);
      const data = await res.json();
      if (!data.basarili) throw new Error(data.hata || 'Düzenleme başarısız.');
      const imgSrc = toDataUrl(data.gorsel_base64);
      setResult(imgSrc);
      setCanUndo(true);
      setEditPrompt('');
      setHistory((h) => [{ url: imgSrc, prompt: editPrompt, ts: Date.now() }, ...h.slice(0, 7)]);
    } catch (err) {
      setEditError(err.message || 'Bir hata oluştu.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditPhoto = async () => {
    if (!sessionId || !editPhoto) return;
    setEditError('');
    setEditLoading(true);
    try {
      const form = new FormData();
      form.append('session_id', sessionId);
      form.append('fotograf', editPhoto);
      const res = await fetch(`${BASE_URL}/tasarim/fotograf_ekle`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Sunucu hatası: ${res.status}`);
      const data = await res.json();
      if (!data.basarili) throw new Error(data.hata || 'Fotoğraf eklenemedi.');
      const imgSrc = toDataUrl(data.gorsel_base64);
      setResult(imgSrc);
      setCanUndo(true);
      setEditPhoto(null);
      setHistory((h) => [{ url: imgSrc, prompt: t('ai.patternApplied'), ts: Date.now() }, ...h.slice(0, 7)]);
    } catch (err) {
      setEditError(err.message || 'Bir hata oluştu.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!sessionId) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/tasarim/gerial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (!data.basarili) { setEditError(data.hata || 'Geri alınamadı.'); return; }
      setResult(toDataUrl(data.gorsel_base64));
      setCanUndo(false);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSessionId(null);
    setCanUndo(false);
    setEditPrompt('');
    setEditPhoto(null);
    setEditError('');
    setPhoto(null);
    setOrderNote('');
    setOrderSuccess(false);
    setOrderError('');
  };

  const handleSubmitOrder = async () => {
    if (!result) return;
    if (!user) { setOrderError(t('ai.errLogin')); return; }
    setOrderLoading(true);
    setOrderError('');
    setOrderSuccess(false);
    try {
      // data:image/png;base64,XXX formatından sadece base64 kısmını al
      const base64 = result.split(',')[1];
      await api.post('/custom-orders', {
        productType,
        prompt,
        imageBase64: base64,
        note: orderNote,
      });
      setOrderSuccess(true);
    } catch (err) {
      setOrderError(err.response?.data?.hata || 'Sipariş gönderilemedi.');
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <div className="ai-page">
      <div className="ai-page__body">

        {/* Sol panel */}
        <aside className="ai-page__sidebar">

          <div className="ai-page__sidebar-header">
            <div className="ai-page__sidebar-top">
              <h1 className="ai-page__sidebar-title">{t('ai.title')}</h1>
              <span className="ai-page__beta-badge">{t('ai.beta')}</span>
            </div>
            <p className="ai-page__sidebar-sub">
              {t('ai.subtitle')}
            </p>
          </div>

          {/* Ürün tipi */}
          <div className="ai-page__section">
            <label className="ai-page__label">{t('ai.productType')}</label>
            <div className="ai-page__type-group">
              {PRODUCT_TYPES.map((pt) => (
                <button
                  key={pt.key}
                  className={`ai-page__type-btn${productType === pt.key ? ' ai-page__type-btn--active' : ''}`}
                  onClick={() => handleProductTypeChange(pt.key)}
                >
                  <span>{pt.emoji}</span>
                  <span>{t(`ai.type_${pt.key}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Şablonlar */}
          <div className="ai-page__section">
            <label className="ai-page__label">{t('ai.presets')}</label>
            <div className="ai-page__presets">
              {PRESETS[productType].map((p) => (
                <button
                  key={p.key}
                  className={`ai-page__preset-btn${activePreset === p.key ? ' ai-page__preset-btn--active' : ''}`}
                  onClick={() => handlePreset(p)}
                >
                  <span>{p.emoji}</span>
                  <span>{t(`ai.preset_${p.key}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tasarım açıklaması */}
          <div className="ai-page__section">
            <label className="ai-page__label" htmlFor="ai-prompt">
              {t('ai.promptLabel')} <span className="ai-page__required">*</span>
            </label>
            <textarea
              id="ai-prompt"
              ref={promptRef}
              className="ai-page__textarea"
              placeholder={
                productType === 'vazo'
                  ? t('ai.promptPh_vazo')
                  : t('ai.promptPh_kilim')
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          {/* Desen fotoğrafı */}
          <div className="ai-page__section">
            <label className="ai-page__label">
              {t('ai.photoLabel')} <span className="ai-page__label-hint">{t('ai.photoOptional')}</span>
            </label>
            <div
              className={`ai-page__upload${dragOver ? ' ai-page__upload--drag' : ''}${photo ? ' ai-page__upload--has-file' : ''}`}
              onClick={() => photoRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handlePhotoFile(e.dataTransfer.files[0]); }}
            >
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handlePhotoFile(e.target.files[0])}
              />
              {photo ? (
                <div className="ai-page__upload-preview">
                  <img src={URL.createObjectURL(photo)} alt={t('ai.photoPreviewAlt')} />
                  <div className="ai-page__upload-preview-name">{photo.name}</div>
                  <button
                    className="ai-page__upload-remove"
                    onClick={(e) => { e.stopPropagation(); setPhoto(null); photoRef.current.value = ''; }}
                  >
                    <span className="ms">close</span>
                  </button>
                </div>
              ) : (
                <div className="ai-page__upload-empty">
                  <span className="ms">add_photo_alternate</span>
                  <span>{t('ai.photoUpload')}</span>
                </div>
              )}
            </div>
          </div>

          {error && <div className="ai-page__error">⚠️ {error}</div>}

          <button
            className="ai-page__generate-btn"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading
              ? <><span className="ai-page__spinner" />{t('ai.generating')}</>
              : <><span className="ms">auto_awesome</span>{t('ai.generate')}</>
            }
          </button>

        </aside>

        {/* Sağ alan */}
        <div className="ai-page__right">

          <div className="ai-page__canvas-area">
            <div className="ai-page__canvas-bg" />

            {loading && (
              <div className="ai-page__loading">
                <div className="ai-page__loading-ring" />
                <p>{t('ai.loadingTitle')}</p>
                <span>{t('ai.loadingSub')}</span>
              </div>
            )}

            {!loading && result && (
              <div className="ai-page__result">
                <img src={result} alt={t('ai.title')} className="ai-page__result-img" />
                <div className="ai-page__result-actions">
                  <a href={result} download="kapadokya-tasarim.png" className="ai-page__result-btn">
                    <span className="ms">download</span>{t('ai.download')}
                  </a>
                  {canUndo && (
                    <button className="ai-page__result-btn ai-page__result-btn--outline" onClick={handleUndo} disabled={editLoading}>
                      <span className="ms">undo</span>{t('ai.undo')}
                    </button>
                  )}
                  <button
                    className="ai-page__result-btn ai-page__result-btn--outline"
                    onClick={handleReset}
                  >
                    <span className="ms">refresh</span>{t('ai.newDesign')}
                  </button>
                </div>

                {/* Özel Sipariş Paneli */}
                {!orderSuccess ? (
                  <div className="ai-page__order-panel">
                    <div className="ai-page__order-panel__title">
                      <span className="ms">send</span>
                      {t('ai.orderTitle')}
                    </div>
                    <p className="ai-page__order-panel__desc">
                      {t('ai.orderDesc')}
                    </p>
                    <textarea
                      className="ai-page__textarea ai-page__textarea--sm"
                      placeholder={t('ai.orderNotePh')}
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      rows={2}
                      maxLength={500}
                    />
                    {orderError && <div className="ai-page__error">{orderError}</div>}
                    <button
                      className="ai-page__order-btn"
                      onClick={handleSubmitOrder}
                      disabled={orderLoading}
                    >
                      {orderLoading
                        ? <><span className="ai-page__spinner ai-page__spinner--sm" />{t('ai.sending')}</>
                        : <><span className="ms">storefront</span>{t('ai.sendToSellers')}</>
                      }
                    </button>
                  </div>
                ) : (
                  <div className="ai-page__order-success">
                    <span className="ms">check_circle</span>
                    <div>
                      <strong>{t('ai.orderSent')}</strong>
                      <p>{t('ai.orderSentDesc')}</p>
                    </div>
                    <button
                      className="ai-page__result-btn"
                      onClick={() => onNavigate?.('my-special-orders')}
                    >
                      <span className="ms">arrow_forward</span>{t('ai.viewOrders')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!loading && !result && (
              <div className="ai-page__placeholder">
                <div className="ai-page__placeholder-icon-wrap">
                  <span className="ms" style={{ fontVariationSettings: "'FILL' 1" }}>palette</span>
                </div>
                <h2>{t('ai.placeholderTitle')}</h2>
                <p>{t('ai.placeholderSub')}</p>
              </div>
            )}
          </div>

          {/* Düzenleme paneli */}
          {result && sessionId && (
            <div className="ai-page__edit-panel">
              <div className="ai-page__edit-panel__title">
                <span className="ms">edit</span>
                {t('ai.editTitle')}
              </div>

              <div className="ai-page__edit-row">
                <textarea
                  className="ai-page__textarea ai-page__textarea--sm"
                  placeholder={t('ai.editPh')}
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={2}
                />
                <button
                  className="ai-page__edit-btn"
                  onClick={handleEdit}
                  disabled={editLoading || !editPrompt.trim()}
                >
                  {editLoading
                    ? <span className="ai-page__spinner ai-page__spinner--sm" />
                    : <span className="ms">auto_fix_high</span>
                  }
                  {t('ai.apply')}
                </button>
              </div>

              <div className="ai-page__edit-photo-row">
                <div
                  className={`ai-page__upload ai-page__upload--sm${editDragOver ? ' ai-page__upload--drag' : ''}${editPhoto ? ' ai-page__upload--has-file' : ''}`}
                  onClick={() => editPhotoRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setEditDragOver(true); }}
                  onDragLeave={() => setEditDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setEditDragOver(false); handleEditPhotoFile(e.dataTransfer.files[0]); }}
                >
                  <input
                    ref={editPhotoRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleEditPhotoFile(e.target.files[0])}
                  />
                  {editPhoto ? (
                    <div className="ai-page__upload-preview ai-page__upload-preview--sm">
                      <img src={URL.createObjectURL(editPhoto)} alt={t('ai.editPhotoPreviewAlt')} />
                      <span className="ai-page__upload-preview-name">{editPhoto.name}</span>
                      <button
                        className="ai-page__upload-remove"
                        onClick={(e) => { e.stopPropagation(); setEditPhoto(null); editPhotoRef.current.value = ''; }}
                      >
                        <span className="ms">close</span>
                      </button>
                    </div>
                  ) : (
                    <div className="ai-page__upload-empty">
                      <span className="ms">add_photo_alternate</span>
                      <span>{t('ai.editPhotoUpload')}</span>
                    </div>
                  )}
                </div>
                <button
                  className="ai-page__edit-btn"
                  onClick={handleEditPhoto}
                  disabled={editLoading || !editPhoto}
                >
                  {editLoading
                    ? <span className="ai-page__spinner ai-page__spinner--sm" />
                    : <span className="ms">brush</span>
                  }
                  {t('ai.applyPattern')}
                </button>
              </div>

              {editError && <div className="ai-page__error">{editError}</div>}
            </div>
          )}

          {history.length > 0 && (
            <div className="ai-page__history">
              <div className="ai-page__history-header">
                <span className="ai-page__history-title">{t('ai.history')}</span>
              </div>
              <div className="ai-page__history-grid">
                {history.map((item) => (
                  <div
                    key={item.ts}
                    className="ai-page__history-item"
                    onClick={() => setResult(item.url)}
                    title={item.prompt}
                  >
                    <img src={item.url} alt={item.prompt} />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

