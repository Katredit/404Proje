import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './AIDesignPage.css';

const AI_API_URL = ''; // API URL buraya eklenecek

const RATIO_OPTIONS = ['1:1', '16:9', '9:16'];
const RATIO_TO_SIZE = { '1:1': '512x512', '16:9': '768x432', '9:16': '432x768' };

export default function AIDesignPage({ onBack, onNavigate }) {
  const { t } = useTranslation();

  const STYLE_PRESETS = [
    { key: 'kilim',  label: t('ai.presets.kilim'),  prompt: 'Kırmızı ve lacivert tonlarda geometrik Anadolu kilim deseni', emoji: '🧶' },
    { key: 'comlek', label: t('ai.presets.comlek'), prompt: 'Kapadokya toprak tonlarında geleneksel Türk çömlek vazo tasarımı', emoji: '🏺' },
    { key: 'cini',   label: t('ai.presets.cini'),   prompt: 'Lale motifli mavi-beyaz İznik çini deseni', emoji: '🧿' },
    { key: 'hali',   label: t('ai.presets.hali'),   prompt: 'Anadolu motifleriyle geleneksel el dokuma halı tasarımı', emoji: '🧵' },
    { key: 'bakir',  label: t('ai.presets.bakir'),  prompt: 'Geleneksel Türk bakır işlemeciliği, dövme motifler ve şekiller', emoji: '🪔' },
    { key: 'ahsap',  label: t('ai.presets.ahsap'),  prompt: 'Kapadokya el sanatları, oyma ahşap desen tasarımı', emoji: '🪚' },
  ];

  const STYLE_OPTIONS = [
    { value: '',                label: t('ai.styles.modern') },
    { value: 'minimalist',      label: t('ai.styles.minimalist') },
    { value: 'otantik klasik',  label: t('ai.styles.authentic') },
    { value: 'avangard',        label: t('ai.styles.avangard') },
  ];

  const [prompt, setPrompt]               = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [style, setStyle]                 = useState('');
  const [ratio, setRatio]                 = useState('1:1');
  const [loading, setLoading]             = useState(false);
  const [result, setResult]               = useState(null);
  const [error, setError]                 = useState('');
  const [history, setHistory]             = useState([]);
  const [activePreset, setActivePreset]   = useState(null);
  const promptRef = useRef(null);

  const navigate = (page) => { onNavigate?.(page); onBack?.(); };

  const handlePreset = (preset) => {
    setPrompt(preset.prompt);
    setActivePreset(preset.key);
    promptRef.current?.focus();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError(t('ai.errorEmpty')); return; }
    if (!AI_API_URL)    { setError(t('ai.errorNoApi')); return; }
    setError('');
    setLoading(true);
    try {
      const [width, height] = (RATIO_TO_SIZE[ratio] || '512x512').split('x').map(Number);
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
      if (!response.ok) throw new Error(t('ai.errorServer', { code: response.status }));
      const data = await response.json();
      const imgUrl = data.image || data.url || data.output?.[0];
      if (!imgUrl) throw new Error(t('ai.errorNoImage'));
      setResult(imgUrl);
      setHistory((h) => [{ url: imgUrl, prompt, ts: Date.now() }, ...h.slice(0, 7)]);
    } catch (err) {
      setError(err.message || t('ai.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-page">

      {/* ── Navbar ── */}
      <div className="ai-page__nav-outer">
        <header className="ai-page__nav">
          <div className="ai-page__brand" onClick={() => navigate('market')}>
            {t('nav.brand')}
          </div>
          <nav className="ai-page__nav-links">
            <button className="ai-page__nav-link" onClick={() => navigate('market')}>{t('nav.market')}</button>
            <button className="ai-page__nav-link ai-page__nav-link--active">{t('nav.ai')}</button>
            <button className="ai-page__nav-link" onClick={() => navigate('seller')}>{t('nav.seller')}</button>
          </nav>
          <div className="ai-page__nav-actions">
            <div className="ai-page__nav-search">
              <span className="ms">search</span>
              <input type="text" placeholder={t('nav.search')} />
            </div>
            <button className="ai-page__nav-icon-btn"><span className="ms">shopping_basket</span></button>
            <button className="ai-page__nav-icon-btn"><span className="ms">person</span></button>
            <LanguageSwitcher />
          </div>
        </header>
      </div>

      {/* ── Body ── */}
      <div className="ai-page__body">

        {/* Sol panel */}
        <aside className="ai-page__sidebar">

          <div className="ai-page__sidebar-header">
            <div className="ai-page__sidebar-top">
              <h1 className="ai-page__sidebar-title">{t('ai.pageTitle')}</h1>
              <span className="ai-page__beta-badge">Beta</span>
            </div>
            <p className="ai-page__sidebar-sub">
              {t('ai.pageSub')}
            </p>
          </div>

          {/* Şablonlar */}
          <div className="ai-page__section">
            <label className="ai-page__label">{t('ai.templates')}</label>
            <div className="ai-page__presets">
              {STYLE_PRESETS.map((p) => (
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
              {t('ai.promptLabel')} <span className="ai-page__required">*</span>
            </label>
            <textarea
              id="ai-prompt"
              ref={promptRef}
              className="ai-page__textarea"
              placeholder={t('ai.promptPlaceholder')}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          {/* Hariç tutulacaklar */}
          <div className="ai-page__section">
            <label className="ai-page__label" htmlFor="ai-neg">
              {t('ai.negativeLabel')}
            </label>
            <textarea
              id="ai-neg"
              className="ai-page__textarea ai-page__textarea--sm"
              placeholder={t('ai.negativePlaceholder')}
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              rows={2}
            />
          </div>

          {/* Stil + Oran */}
          <div className="ai-page__row">
            <div className="ai-page__section">
              <label className="ai-page__label" htmlFor="ai-style">{t('ai.styleLabel')}</label>
              <select
                id="ai-style"
                className="ai-page__select"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                {STYLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="ai-page__section">
              <label className="ai-page__label">{t('ai.ratioLabel')}</label>
              <div className="ai-page__ratio-group">
                {RATIO_OPTIONS.map((r) => (
                  <button
                    key={r}
                    className={`ai-page__ratio-btn${ratio === r ? ' ai-page__ratio-btn--active' : ''}`}
                    onClick={() => setRatio(r)}
                  >{r}</button>
                ))}
              </div>
            </div>
          </div>

          {error && <div className="ai-page__error">⚠️ {error}</div>}

          {/* Oluştur butonu */}
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

          {!AI_API_URL && (
            <div className="ai-page__api-notice">
              {t('ai.apiNotice')}
            </div>
          )}
        </aside>

        {/* Sağ alan */}
        <div className="ai-page__right">

          {/* Canvas */}
          <div className="ai-page__canvas-area">
            <div className="ai-page__canvas-bg" />

            {loading && (
              <div className="ai-page__loading">
                <div className="ai-page__loading-ring" />
                <p>{t('ai.loadingText')}</p>
                <span>{t('ai.loadingSub')}</span>
              </div>
            )}

            {!loading && result && (
              <div className="ai-page__result">
                <img src={result} alt={t('ai.resultAlt')} className="ai-page__result-img" />
                <div className="ai-page__result-actions">
                  <a href={result} download="kapadokya-tasarim.png" className="ai-page__result-btn">
                    <span className="ms">download</span>{t('ai.download')}
                  </a>
                  <button
                    className="ai-page__result-btn ai-page__result-btn--outline"
                    onClick={() => setResult(null)}
                  >
                    <span className="ms">refresh</span>{t('ai.redo')}
                  </button>
                </div>
              </div>
            )}

            {!loading && !result && (
              <div className="ai-page__placeholder">
                <div className="ai-page__placeholder-icon-wrap">
                  <span className="ms" style={{ fontVariationSettings: "'FILL' 1" }}>palette</span>
                </div>
                <h2>{t('ai.placeholderTitle')}</h2>
                <p>{t('ai.placeholderText')}</p>
              </div>
            )}
          </div>

          {/* Geçmiş */}
          <div className="ai-page__history">
            <div className="ai-page__history-header">
              <span className="ai-page__history-title">{t('ai.historyTitle')}</span>
              <button className="ai-page__history-see-all">{t('ai.historySeeAll')}</button>
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
              <div className="ai-page__history-empty">
                <span className="ms">add</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="ai-page__footer">
        <div className="ai-page__footer-inner">
          <div className="ai-page__footer-brand">
            <span className="ai-page__footer-name">{t('nav.brand')}</span>
            <span className="ai-page__footer-copy">© 2024 {t('nav.brand')}.</span>
          </div>
          <nav className="ai-page__footer-links">
            <a href="#" className="ai-page__footer-link">Hakkımızda</a>
            <a href="#" className="ai-page__footer-link">Kullanım Koşulları</a>
            <a href="#" className="ai-page__footer-link">Gizlilik Politikası</a>
            <a href="#" className="ai-page__footer-link">İletişim</a>
          </nav>
        </div>
      </footer>

    </div>
  );
}

