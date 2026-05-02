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
  const [productType, setProductType] = useState('vazo');
  const [prompt, setPrompt]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState('');
  const [history, setHistory]         = useState([]);
  const [activePreset, setActivePreset] = useState(null);
  const promptRef = useRef(null);

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

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError('Lütfen bir tasarım açıklaması girin.'); return; }
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('istek', `${productType} tasarımı: ${prompt}`);
      const response = await fetch(`${BASE_URL}/uret`, { method: 'POST', body: form });
      if (!response.ok) throw new Error(`Sunucu hatası: ${response.status}`);
      const data = await response.json();
      if (!data.basarili) throw new Error(data.hata || 'Görsel üretilemedi.');
      const imgSrc = `data:image/png;base64,${data.gorsel_base64}`;
      setResult(imgSrc);
      setHistory((h) => [{ url: imgSrc, prompt, ts: Date.now() }, ...h.slice(0, 7)]);
    } catch (err) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
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
                  <button
                    className="ai-page__result-btn ai-page__result-btn--outline"
                    onClick={() => setResult(null)}
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

