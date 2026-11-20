import { useMemo, useState } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const TYPE_LABELS = { video: 'فيديو', audio: 'صوت', image: 'صورة', file: 'ملف', page: 'صفحة ويب', unknown: 'محتوى' };

function formatBytes(bytes) {
  if (bytes === undefined || bytes === null || Number.isNaN(Number(bytes))) return '';
  const value = Number(bytes);
  if (value < 0) return '';
  if (value < 1024) return `${value} بايت`;
  const units = ['ك.بايت', 'م.بايت', 'ج.بايت', 'ت.بايت'];
  let amount = value / 1024;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) { amount /= 1024; index += 1; }
  return `${amount.toFixed(amount < 10 ? 1 : 0)} ${units[index]}`;
}
function getErrorMessage(payload, fallback) {
  if (typeof payload?.error === 'string') return payload.error;
  if (typeof payload?.message === 'string') return payload.message;
  return fallback;
}

export default function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState('');
  const kind = useMemo(() => {
    const raw = String(result?.kind || result?.type || 'unknown').toLowerCase();
    if (raw.includes('video')) return 'video';
    if (raw.includes('audio') || raw.includes('sound')) return 'audio';
    if (raw.includes('image') || raw.includes('photo')) return 'image';
    if (raw.includes('page') || raw.includes('html') || raw.includes('web')) return 'page';
    if (raw.includes('file') || raw.includes('document')) return 'file';
    return 'unknown';
  }, [result]);
  const title = result?.title || result?.filename || result?.name || 'تم اكتشاف محتوى من الرابط';
  const size = formatBytes(result?.size ?? result?.filesize ?? result?.contentLength);

  async function handleAnalyze(event) {
    event.preventDefault(); setError(''); setResult(null); setSelectedMode('');
    let parsed;
    try {
      parsed = new URL(url.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
    } catch { setError('أدخل رابطًا صحيحًا يبدأ بـ http:// أو https://'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: parsed.href }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getErrorMessage(payload, 'تعذّر تحليل الرابط. حاول مرة أخرى.'));
      setResult(payload);
      setSelectedMode(payload.kind === 'page' || payload.type === 'page' ? 'page' : 'direct');
    } catch (err) { setError(err.message || 'تعذّر الاتصال بالخادم. تأكد من تشغيل خدمة التحليل.'); }
    finally { setLoading(false); }
  }
  function startDownload(mode) {
    if (!result || !url.trim()) return;
    const params = new URLSearchParams({ url: url.trim(), mode });
    window.location.assign(`${API_BASE}/api/download?${params.toString()}`);
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="نزّل - الصفحة الرئيسية"><span className="brand-mark" aria-hidden="true">↓</span><span>نزّل</span></a>
        <span className="top-note"><span className="status-dot" /> تنزيل بسيط وآمن</span>
      </header>
      <section className="hero" id="home">
        <div className="eyebrow"><span className="eyebrow-icon">✦</span> ملفاتك من مكان واحد</div>
        <h1>ضع الرابط، <span>ودع الباقي علينا.</span></h1>
        <p className="subtitle">اكتشف نوع المحتوى واختر تنزيل الوسائط أو الملفات أو حفظ صفحة الويب.</p>
        <div className="download-card">
          <form className="url-form" onSubmit={handleAnalyze}>
            <label className="input-label" htmlFor="media-url">رابط الصفحة أو الملف</label>
            <div className="input-row">
              <span className="link-icon" aria-hidden="true">↗</span>
              <input id="media-url" type="url" inputMode="url" autoComplete="url" placeholder="https://example.com/media" value={url} onChange={(event) => setUrl(event.target.value)} aria-describedby="privacy-note" required />
              {url && <button className="clear-button" type="button" onClick={() => { setUrl(''); setResult(null); setError(''); }} aria-label="مسح الرابط">×</button>}
              <button className="analyze-button" type="submit" disabled={loading || !url.trim()}>{loading ? <><span className="spinner" /> جارٍ الفحص</> : <>اكتشف <span aria-hidden="true">←</span></>}</button>
            </div>
          </form>
          <div className="trust-row" id="privacy-note"><span><span className="check">✓</span> لا حاجة إلى تسجيل</span><span><span className="check">✓</span> فحص نوع المحتوى</span><span><span className="check">✓</span> روابط ويب عامة فقط</span></div>
          {error && <div className="alert error-alert" role="alert"><span>!</span>{error}</div>}
          {result && !error && (
            <section className="result-panel" aria-live="polite">
              <div className="result-heading">
                <div className={`file-icon ${kind}`} aria-hidden="true">{kind === 'video' ? '▶' : kind === 'audio' ? '♫' : kind === 'image' ? '▧' : kind === 'page' ? '⌘' : '▤'}</div>
                <div className="result-copy"><span className="result-kicker">اكتمل الفحص · {TYPE_LABELS[kind]}</span><h2>{title}</h2><div className="metadata">{result.mimeType && <span>{result.mimeType}</span>}{size && <span>{size}</span>}{result.duration && <span>{result.duration}</span>}</div></div>
              </div>
              <div className="download-options">
                <p>اختر ما تريد تنزيله</p>
                <div className="option-grid">
                  {kind === 'page' ? (
                    <button className={`option-card ${selectedMode === 'page' ? 'selected' : ''}`} onClick={() => setSelectedMode('page')} type="button"><span className="option-symbol">▧</span><span><b>حفظ الصفحة</b><small>تنزيل الصفحة كملف HTML</small></span><span className="radio-dot" /></button>
                  ) : (
                    <button className={`option-card ${selectedMode === 'direct' ? 'selected' : ''}`} onClick={() => setSelectedMode('direct')} type="button"><span className="option-symbol">⇩</span><span><b>تنزيل الملف</b><small>بصيغة المصدر المتاحة</small></span><span className="radio-dot" /></button>
                  )}
                  {(kind === 'video' || kind === 'audio' || result.supportsMediaExtraction) && <button className={`option-card ${selectedMode === 'media' ? 'selected' : ''}`} onClick={() => setSelectedMode('media')} type="button"><span className="option-symbol">♫</span><span><b>تنزيل الوسائط</b><small>أفضل صيغة متاحة للمصدر</small></span><span className="radio-dot" /></button>}
                </div>
                <button className="primary-download" type="button" disabled={!selectedMode} onClick={() => startDownload(selectedMode)}><span>↓</span> تنزيل الآن</button>
                <p className="legal-note">نزّل المحتوى الذي تملك حق الوصول إليه فقط، واحترم حقوق النشر وشروط الموقع.</p>
              </div>
            </section>
          )}
        </div>
        <div className="supported-row"><span>يدعم اكتشاف</span><i /><span>الفيديو</span><i /><span>الصوت</span><i /><span>الصور والملفات</span><i /><span>صفحات الويب</span></div>
      </section>
      <footer className="footer"><span>نزّل</span><span>استخدم الخدمة بمسؤولية واحترام حقوق أصحاب المحتوى.</span></footer>
    </main>
  );
}
