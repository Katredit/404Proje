import { useState, useRef } from 'react';
import './AIDesignPage.css';

const AI_API_URL = ''; // API URL buraya eklenecek

const STYLE_PRESETS = [
  { label: 'Geleneksel Kilim', prompt: 'Kırmızı ve lacivert tonlarda geometrik Anadolu kilim deseni', emoji: '🧶' },
  { label: 'Çömlek Motifi', prompt: 'Kapadokya toprak tonlarında geleneksel Türk çömlek deseni', emoji: '🏺' },
  { label: 'Peri Bacası', prompt: 'Kapadokya manzarasında peri bacaları, güneş batarken', emoji: '🗺️' },
  { label: 'İznik Seramiği', prompt: 'Lale motifli mavi-beyaz İznik seramiği desenli yüzey', emoji: '🌷' },
  { label: 'Halk Sanatı', prompt: 'Türk halk sanatı motifleriyle süslenmiş tekstil tasarımı', emoji: '🎨' },
  { label: 'Modern Füzyon', prompt: 'Geleneksel Kapadokya desenleri ile modern minimalist tasarım', emoji: '✨' },
];

const SIZE_OPTIONS = [
  { label: 'Kare (1:1)', value: '512x512' },
  { label: 'Dikey (2:3)', value: '512x768' },
  { label: 'Yatay (3:2)', value: '768x512' },
];

export default function AIDesignPage({ onBack }) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [style, setStyle] = useState('');
  const [size, setSize] = useState('512x512');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const promptRef = useRef(null);

  const handlePreset = (preset) => {
    setPrompt(preset.prompt);
    promptRef.current?.focus();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Lütfen bir tasarım açıklaması girin.');
      return;
    }
    if (!AI_API_URL) {
      setError('Yapay zeka API bağlantısı henüz yapılandırılmamış.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const [width, height] = size.split('x').map(Number);
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${style ? style + ', ' : ''}${prompt}`,
          negative_prompt: negativePrompt,
          width,
          height,
        }),
      });
      if (!response.ok) throw new Error(`Sunucu hatası: ${response.status}`);
      const data = await response.json();
      const imgUrl = data.image || data.url || data.output?.[0];
      if (!imgUrl) throw new Error('API geçerli bir görsel döndürmedi.');
      setResult(imgUrl);
      setHistory((h) => [{ url: imgUrl, prompt, ts: Date.now() }, ...h.slice(0, 7)]);
    } catch (err) {
      setError(err.message || 'Görsel oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-page">
      {/* Navbar */}
      <header className="ai-page__navbar">
        <button className="ai-page__back" onClick={onBack}>← Çarşıya Dön</button>
        <div className="ai-page__navbar-brand">
          <span className="ai-page__navbar-icon">✨</span>
          <div>
            <h1 className="ai-page__navbar-title">Yapay Zeka Tasarım Stüdyosu</h1>
            <span className="ai-page__navbar-sub">Kapadokya motifli özgün tasarımlar oluştur</span>
          </div>
        </div>
        <div className="ai-page__navbar-badge">Beta</div>
      </header>

      <div className="ai-page__body">
        {/* Sol panel – kontroller */}
        <aside className="ai-page__sidebar">
          <div className="ai-page__section">
            <label className="ai-page__label">Hızlı Stil Seç</label>
            <div className="ai-page__presets">
              {STYLE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  className="ai-page__preset-btn"
                  onClick={() => handlePreset(p)}
                  title={p.prompt}
                >
                  <span>{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="ai-page__section">
            <label className="ai-page__label" htmlFor="ai-prompt">
              Tasarım Açıklaması <span className="ai-page__required">*</span>
            </label>
            <textarea
              id="ai-prompt"
              ref={promptRef}
              className="ai-page__textarea"
              placeholder="Örn: Kırmızı geometrik kilim deseni, Kapadokya motifli..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
            <div className="ai-page__char-count">{prompt.length} / 500</div>
          </div>

          <div className="ai-page__section">
            <label className="ai-page__label" htmlFor="ai-neg">İstenmeyen Unsurlar</label>
            <textarea
              id="ai-neg"
              className="ai-page__textarea ai-page__textarea--sm"
              placeholder="Örn: bulanık, düşük kalite, modern..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              rows={2}
            />
          </div>

          <div className="ai-page__row">
            <div className="ai-page__section ai-page__section--half">
              <label className="ai-page__label" htmlFor="ai-style">Görsel Stili</label>
              <select
                id="ai-style"
                className="ai-page__select"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                <option value="">Otomatik</option>
                <option value="watercolor painting">Suluboya</option>
                <option value="oil painting">Yağlıboya</option>
                <option value="digital art">Dijital Sanat</option>
                <option value="photorealistic">Fotogerçekçi</option>
                <option value="sketch drawing">Eskiz</option>
                <option value="flat design">Düz Tasarım</option>
              </select>
            </div>
            <div className="ai-page__section ai-page__section--half">
              <label className="ai-page__label">Boyut</label>
              <div className="ai-page__size-options">
                {SIZE_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    className={`ai-page__size-btn${size === s.value ? ' ai-page__size-btn--active' : ''}`}
                    onClick={() => setSize(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="ai-page__error">
              ⚠️ {error}
            </div>
          )}

          <button
            className="ai-page__generate-btn"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <><span className="ai-page__spinner" /> Oluşturuluyor...</>
            ) : (
              <>✨ Tasarım Oluştur</>
            )}
          </button>

          {/* API yapılandırılmamış uyarısı */}
          {!AI_API_URL && (
            <div className="ai-page__api-notice">
              🔌 API henüz bağlı değil. Görsel oluşturma aktif hale geldiğinde burada çalışacak.
            </div>
          )}
        </aside>

        {/* Ana içerik – önizleme */}
        <main className="ai-page__main">
          <div className="ai-page__canvas-area">
            {loading && (
              <div className="ai-page__loading">
                <div className="ai-page__loading-ring" />
                <p>Yapay zeka tasarımınızı oluşturuyor...</p>
                <span>Bu işlem birkaç saniye sürebilir</span>
              </div>
            )}

            {!loading && result && (
              <div className="ai-page__result">
                <img src={result} alt="AI tarafından oluşturulan tasarım" className="ai-page__result-img" />
                <div className="ai-page__result-actions">
                  <a href={result} download="kapadokya-tasarim.png" className="ai-page__result-btn">
                    ⬇️ İndir
                  </a>
                  <button
                    className="ai-page__result-btn ai-page__result-btn--outline"
                    onClick={() => setResult(null)}
                  >
                    🔄 Yeniden Oluştur
                  </button>
                </div>
              </div>
            )}

            {!loading && !result && (
              <div className="ai-page__placeholder">
                <div className="ai-page__placeholder-icon">🎨</div>
                <h2>Tasarımını Hayata Geçir</h2>
                <p>Sol panelden bir stil seç veya kendi açıklamanı yaz,<br />ardından "Tasarım Oluştur" butonuna bas.</p>
                <div className="ai-page__placeholder-examples">
                  {STYLE_PRESETS.slice(0, 3).map((p) => (
                    <button
                      key={p.label}
                      className="ai-page__example-chip"
                      onClick={() => handlePreset(p)}
                    >
                      {p.emoji} {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Geçmiş */}
          {history.length > 0 && (
            <div className="ai-page__history">
              <h3 className="ai-page__history-title">Son Tasarımlar</h3>
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
        </main>
      </div>
    </div>
  );
}
