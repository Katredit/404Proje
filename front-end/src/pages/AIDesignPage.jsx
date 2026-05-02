import { useState, useRef } from 'react';
import './AIDesignPage.css';

const BASE_URL = 'http://localhost:5000';

const PRODUCT_TYPES = [
  { key: 'vazo',  label: 'Vazo',  emoji: '🏺' },
  { key: 'kilim', label: 'Kilim', emoji: '🧶' },
];

const PRESETS = {
  vazo: [
    { key: 'vazo_kapadokya', label: 'Kapadokya', prompt: 'Kapadokya toprak tonlarında geleneksel Türk vazo tasarımı, lale ve geometrik motifler', emoji: '🏺' },
    { key: 'vazo_iznik',     label: 'İznik',     prompt: 'İznik çini desenli mavi-beyaz vazo, lale ve sümbül motifleri', emoji: '🌷' },
    { key: 'vazo_selcuk',    label: 'Selçuklu',  prompt: 'Selçuklu sanatı geometrik motifli Türk vazosu, kırmızı ve lacivert', emoji: '✦' },
  ],
  kilim: [
    { key: 'kilim_anadolu', label: 'Anadolu', prompt: 'Kırmızı ve lacivert tonlarda geometrik Anadolu kilim deseni', emoji: '🧶' },
    { key: 'kilim_bergama', label: 'Bergama', prompt: 'Geleneksel Bergama kilimi, koyu kırmızı ve beyaz geometrik motifler', emoji: '🔴' },
    { key: 'kilim_konya',   label: 'Konya',   prompt: 'Konya yöresi kilimi, yıldız motifleri ve pastel renkler', emoji: '⭐' },
  ],
};
export default function AIDesignPage({ onBack, onNavigate }) {
  const [productType, setProductType]   = useState('vazo');
  const [prompt, setPrompt]             = useState('');
  const [photo, setPhoto]               = useState(null);
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const [sessionId, setSessionId]       = useState(null);
  const [editPrompt, setEditPrompt]     = useState('');
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

  const handleProductTypeChange = (type) => {
    setProductType(type);
    setActivePreset(null);
    setPrompt('');
  };

  const handlePreset = (preset) => {
    setPrompt(preset.prompt);
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
    if (!prompt.trim()) { setError('Lütfen bir tasarım açıklaması girin.'); return; }
    setError('');
    setLoading(true);
    setResult(null);
    setSessionId(null);
    setCanUndo(false);
    try {
      let imgSrc;
      if (photo) {
        const form = new FormData();
        form.append('istek', `${productType} tasarımı: ${prompt}`);
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
    if (!sessionId || !editPrompt.trim()) { setEditError('Düzenleme açıklaması girin.'); return; }
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
      setHistory((h) => [{ url: imgSrc, prompt: 'Desen fotoğrafı uygulandı', ts: Date.now() }, ...h.slice(0, 7)]);
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
  };

  return (
    <div className="ai-page">
      <div className="ai-page__body">

        {/* Sol panel */}
        <aside className="ai-page__sidebar">

          <div className="ai-page__sidebar-header">
            <div className="ai-page__sidebar-top">
              <h1 className="ai-page__sidebar-title">AI Tasarım Stüdyosu</h1>
              <span className="ai-page__beta-badge">Beta</span>
            </div>
            <p className="ai-page__sidebar-sub">
              Geleneksel Kapadokya el sanatları için yapay zeka ile özgün tasarımlar oluşturun.
            </p>
          </div>

          {/* Ürün tipi */}
          <div className="ai-page__section">
            <label className="ai-page__label">Ürün Tipi</label>
            <div className="ai-page__type-group">
              {PRODUCT_TYPES.map((pt) => (
                <button
                  key={pt.key}
                  className={`ai-page__type-btn${productType === pt.key ? ' ai-page__type-btn--active' : ''}`}
                  onClick={() => handleProductTypeChange(pt.key)}
                >
                  <span>{pt.emoji}</span>
                  <span>{pt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Şablonlar */}
          <div className="ai-page__section">
            <label className="ai-page__label">Hazır Şablonlar</label>
            <div className="ai-page__presets">
              {PRESETS[productType].map((p) => (
                <button
                  key={p.key}
                  className={`ai-page__preset-btn${activePreset === p.key ? ' ai-page__preset-btn--active' : ''}`}
                  onClick={() => handlePreset(p)}
                >
                  <span>{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tasarım açıklaması */}
          <div className="ai-page__section">
            <label className="ai-page__label" htmlFor="ai-prompt">
              Tasarım Açıklaması <span className="ai-page__required">*</span>
            </label>
            <textarea
              id="ai-prompt"
              ref={promptRef}
              className="ai-page__textarea"
              placeholder={
                productType === 'vazo'
                  ? 'Örn: Mavi ve beyaz tonlarda lale motifli, Kapadokya stilinde bir vazo...'
                  : 'Örn: Kırmızı ve lacivert geometrik desenli, Anadolu motifli kilim...'
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          {/* Desen fotoğrafı */}
          <div className="ai-page__section">
            <label className="ai-page__label">
              Desen Fotoğrafı <span className="ai-page__label-hint">— opsiyonel</span>
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
                  <img src={URL.createObjectURL(photo)} alt="önizleme" />
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
                  <span>Fotoğraf ekle veya sürükle</span>
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
              ? <><span className="ai-page__spinner" />Oluşturuluyor...</>
              : <><span className="ms">auto_awesome</span>Tasarım Oluştur</>
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
                <p>Tasarımınız oluşturuluyor...</p>
                <span>Bu işlem 15–30 saniye sürebilir</span>
              </div>
            )}

            {!loading && result && (
              <div className="ai-page__result">
                <img src={result} alt="AI Tasarım" className="ai-page__result-img" />
                <div className="ai-page__result-actions">
                  <a href={result} download="kapadokya-tasarim.png" className="ai-page__result-btn">
                    <span className="ms">download</span>İndir
                  </a>
                  {canUndo && (
                    <button className="ai-page__result-btn ai-page__result-btn--outline" onClick={handleUndo} disabled={editLoading}>
                      <span className="ms">undo</span>Geri Al
                    </button>
                  )}
                  <button
                    className="ai-page__result-btn ai-page__result-btn--outline"
                    onClick={handleReset}
                  >
                    <span className="ms">refresh</span>Yeni Tasarım
                  </button>
                </div>
              </div>
            )}

            {!loading && !result && (
              <div className="ai-page__placeholder">
                <div className="ai-page__placeholder-icon-wrap">
                  <span className="ms" style={{ fontVariationSettings: "'FILL' 1" }}>palette</span>
                </div>
                <h2>Tasarımınız burada görünecek</h2>
                <p>Sol panelden ürün tipi seçin, açıklama yazın ve "Tasarım Oluştur"a tıklayın.</p>
              </div>
            )}
          </div>

          {/* Düzenleme paneli */}
          {result && sessionId && (
            <div className="ai-page__edit-panel">
              <div className="ai-page__edit-panel__title">
                <span className="ms">edit</span>
                Tasarımı Düzenle
              </div>

              <div className="ai-page__edit-row">
                <textarea
                  className="ai-page__textarea ai-page__textarea--sm"
                  placeholder='Örn: "renkleri koyulaştır", "ortaya lale motifi ekle"...'
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
                  Uygula
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
                      <img src={URL.createObjectURL(editPhoto)} alt="desen" />
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
                      <span>Desen fotoğrafı ekle</span>
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
                  Deseni Uygula
                </button>
              </div>

              {editError && <div className="ai-page__error">{editError}</div>}
            </div>
          )}

          {history.length > 0 && (
            <div className="ai-page__history">
              <div className="ai-page__history-header">
                <span className="ai-page__history-title">Geçmiş Tasarımlar</span>
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

