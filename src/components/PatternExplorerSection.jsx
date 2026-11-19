import { useEffect, useId, useMemo, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Download, Grid3X3, LoaderCircle, Palette, Save, Sparkles, Trash2 } from 'lucide-react'

const defaults = {
  name: 'نقش جديد',
  type: 'diamonds',
  background: '#F1E7D5',
  primary: '#1E625C',
  secondary: '#D47E62',
  accent: '#E3B95B',
  tile: 72,
  rotation: 0,
  gap: 8,
}

const patternTypes = [
  { id: 'diamonds', label: 'معينات هندسية' },
  { id: 'checker', label: 'مربعات متبادلة' },
  { id: 'dots', label: 'نقاط دائرية' },
  { id: 'waves', label: 'تموجات' },
  { id: 'petals', label: 'وحدات نباتية' },
  { id: 'grid', label: 'شبكة هندسية' },
]

function buildSvg(config) {
  const { type, background, primary, secondary, accent, tile, rotation, gap } = config
  const s = Number(tile)
  const half = s / 2
  const r = Math.max(3, (s - Number(gap)) / 5)
  let motif = `<rect width="${s}" height="${s}" fill="${background}"/>`
  if (type === 'diamonds') {
    motif += `<path d="M${half} 0 L${s} ${half} L${half} ${s} L0 ${half} Z" fill="${primary}"/><path d="M${half} ${r} L${s-r} ${half} L${half} ${s-r} L${r} ${half} Z" fill="${secondary}"/><circle cx="${half}" cy="${half}" r="${r/2}" fill="${accent}"/>`
  } else if (type === 'checker') {
    motif += `<rect width="${half}" height="${half}" fill="${primary}"/><rect x="${half}" y="${half}" width="${half}" height="${half}" fill="${primary}"/><rect x="${half}" width="${half}" height="${half}" fill="${secondary}"/><rect y="${half}" x="0" width="${half}" height="${half}" fill="${secondary}"/><circle cx="${half}" cy="${half}" r="${r/2}" fill="${accent}"/>`
  } else if (type === 'dots') {
    motif += `<circle cx="${half}" cy="${half}" r="${r}" fill="${primary}"/><circle cx="0" cy="0" r="${r/2}" fill="${secondary}"/><circle cx="${s}" cy="${s}" r="${r/2}" fill="${secondary}"/><circle cx="${half}" cy="${half}" r="${r/3}" fill="${accent}"/>`
  } else if (type === 'waves') {
    motif += `<path d="M0 ${s*.3} Q${s*.25} 0 ${half} ${s*.3} T${s} ${s*.3} M0 ${s*.7} Q${s*.25} ${s*.4} ${half} ${s*.7} T${s} ${s*.7}" fill="none" stroke="${primary}" stroke-width="${Math.max(2,s/14)}"/><path d="M0 ${s*.5} Q${s*.25} ${s*.2} ${half} ${s*.5} T${s} ${s*.5}" fill="none" stroke="${secondary}" stroke-width="${Math.max(1.5,s/22)}"/><circle cx="${half}" cy="${half}" r="${r/3}" fill="${accent}"/>`
  } else if (type === 'petals') {
    motif += `<g fill="${primary}"><ellipse cx="${half}" cy="${s*.22}" rx="${r*.65}" ry="${r*1.35}"/><ellipse cx="${half}" cy="${s*.78}" rx="${r*.65}" ry="${r*1.35}"/><ellipse cx="${s*.22}" cy="${half}" rx="${r*1.35}" ry="${r*.65}"/><ellipse cx="${s*.78}" cy="${half}" rx="${r*1.35}" ry="${r*.65}"/></g><circle cx="${half}" cy="${half}" r="${r*.7}" fill="${secondary}"/><circle cx="${half}" cy="${half}" r="${r*.28}" fill="${accent}"/>`
  } else {
    motif += `<path d="M${half} 0 V${s} M0 ${half} H${s} M0 0 L${s} ${s} M${s} 0 L0 ${s}" stroke="${primary}" stroke-width="${Math.max(1.5,s/28)}" fill="none"/><circle cx="${half}" cy="${half}" r="${r}" fill="${secondary}"/><circle cx="${half}" cy="${half}" r="${r/2}" fill="${accent}"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 400 400"><defs><pattern id="motif" width="${s}" height="${s}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rotation})">${motif}</pattern></defs><rect width="400" height="400" fill="url(#motif)"/></svg>`
}

export default function PatternExplorerSection({ user, onNotice }) {
  const [config, setConfig] = useState(defaults)
  const [saved, setSaved] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const patternId = useId().replace(/:/g, '')
  const selectedLabel = patternTypes.find(item => item.id === config.type)?.label || 'نقش هندسي'
  const svg = useMemo(() => buildSvg(config), [config])

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!user?.uid || !db) { setLoading(false); return }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (alive) setSaved(snap.exists() ? (snap.data().patternDesigns || []) : [])
      } catch (e) {
        console.error('Pattern library load failed:', e)
        if (alive) setError('تعذر تحميل النقوش المحفوظة.')
      } finally { if (alive) setLoading(false) }
    }
    load()
    return () => { alive = false }
  }, [user?.uid])

  const update = (key, value) => setConfig(current => ({ ...current, [key]: value }))

  const savePattern = async () => {
    if (!user?.uid || !db) return
    setSaving(true); setError('')
    try {
      const item = { ...config, id: `pattern-${Date.now()}`, createdAt: new Date().toISOString() }
      const next = [item, ...saved].slice(0, 30)
      await setDoc(doc(db, 'users', user.uid), { uid: user.uid, patternDesigns: next, updatedAt: serverTimestamp() }, { merge: true })
      setSaved(next)
      onNotice?.('تم حفظ النقش في مكتبتك.')
    } catch (e) {
      console.error('Pattern save failed:', e)
      setError('تعذر حفظ النقش. حاول مرة أخرى.')
    } finally { setSaving(false) }
  }

  const deletePattern = async id => {
    const next = saved.filter(item => item.id !== id)
    try {
      await setDoc(doc(db, 'users', user.uid), { uid: user.uid, patternDesigns: next, updatedAt: serverTimestamp() }, { merge: true })
      setSaved(next)
      onNotice?.('تم حذف النقش المحفوظ.')
    } catch (e) { setError('تعذر حذف النقش.') }
  }

  const download = async format => {
    try {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      if (format === 'svg') {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url; anchor.download = `${config.name || 'vestra-pattern'}.svg`; anchor.click()
        URL.revokeObjectURL(url)
        return
      }
      const url = URL.createObjectURL(blob)
      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1600
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        canvas.toBlob(file => {
          if (!file) return
          const pngUrl = URL.createObjectURL(file)
          const anchor = document.createElement('a'); anchor.href = pngUrl; anchor.download = `${config.name || 'vestra-pattern'}.png`; anchor.click()
          URL.revokeObjectURL(pngUrl)
        }, 'image/png')
      }
      image.onerror = () => { URL.revokeObjectURL(url); setError('تعذر تصدير النقش كصورة PNG.') }
      image.src = url
    } catch (e) { setError('تعذر تصدير النقش.') }
  }

  const applySaved = item => setConfig({
    name: item.name || 'نقش محفوظ', type: item.type || 'diamonds',
    background: item.background || defaults.background, primary: item.primary || defaults.primary,
    secondary: item.secondary || defaults.secondary, accent: item.accent || defaults.accent,
    tile: item.tile || defaults.tile, rotation: item.rotation || 0, gap: item.gap ?? defaults.gap,
  })

  return <section className="section-block pattern-explorer-section">
    <div className="section-heading"><div><div className="section-kicker">REPEAT · COMPOSE · EXPORT</div><h2>مستكشف النقوش والزخارف</h2><p>صمّم وحدات زخرفية متكررة، جرّب الألوان والتناظر، ثم احفظ النتيجة أو صدّرها لاستخدامها في مشروعك.</p></div></div>
    <div className="pattern-workspace">
      <div className="pattern-preview-panel">
        <div className="pattern-preview-heading"><span><Grid3X3 size={16}/> {selectedLabel}</span><small>LIVE PATTERN PREVIEW</small></div>
        <svg viewBox="0 0 400 400" role="img" aria-label={`معاينة نقش ${selectedLabel}`} className="pattern-live-preview">
          <defs><pattern id={patternId} width={config.tile} height={config.tile} patternUnits="userSpaceOnUse" patternTransform={`rotate(${config.rotation})`}>
            {config.type === 'diamonds' && <><rect width={config.tile} height={config.tile} fill={config.background}/><path d={`M${config.tile/2} 0 L${config.tile} ${config.tile/2} L${config.tile/2} ${config.tile} L0 ${config.tile/2} Z`} fill={config.primary}/><path d={`M${config.tile/2} 9 L${config.tile-9} ${config.tile/2} L${config.tile/2} ${config.tile-9} L9 ${config.tile/2} Z`} fill={config.secondary}/><circle cx={config.tile/2} cy={config.tile/2} r={config.tile/10} fill={config.accent}/></>}
            {config.type === 'checker' && <><rect width={config.tile} height={config.tile} fill={config.background}/><rect width={config.tile/2} height={config.tile/2} fill={config.primary}/><rect x={config.tile/2} y={config.tile/2} width={config.tile/2} height={config.tile/2} fill={config.primary}/><rect x={config.tile/2} width={config.tile/2} height={config.tile/2} fill={config.secondary}/><rect y={config.tile/2} width={config.tile/2} height={config.tile/2} fill={config.secondary}/></>}
            {config.type === 'dots' && <><rect width={config.tile} height={config.tile} fill={config.background}/><circle cx={config.tile/2} cy={config.tile/2} r={config.tile/5} fill={config.primary}/><circle cx="0" cy="0" r={config.tile/10} fill={config.secondary}/><circle cx={config.tile} cy={config.tile} r={config.tile/10} fill={config.secondary}/></>}
            {config.type === 'waves' && <><rect width={config.tile} height={config.tile} fill={config.background}/><path d={`M0 ${config.tile*.3} Q${config.tile*.25} 0 ${config.tile/2} ${config.tile*.3} T${config.tile} ${config.tile*.3} M0 ${config.tile*.7} Q${config.tile*.25} ${config.tile*.4} ${config.tile/2} ${config.tile*.7} T${config.tile} ${config.tile*.7}`} stroke={config.primary} strokeWidth={Math.max(2,config.tile/14)} fill="none"/><path d={`M0 ${config.tile*.5} Q${config.tile*.25} ${config.tile*.2} ${config.tile/2} ${config.tile*.5} T${config.tile} ${config.tile*.5}`} stroke={config.secondary} strokeWidth={2} fill="none"/></>}
            {config.type === 'petals' && <><rect width={config.tile} height={config.tile} fill={config.background}/><g fill={config.primary}><ellipse cx={config.tile/2} cy={config.tile*.22} rx={config.tile*.1} ry={config.tile*.2}/><ellipse cx={config.tile/2} cy={config.tile*.78} rx={config.tile*.1} ry={config.tile*.2}/><ellipse cx={config.tile*.22} cy={config.tile/2} rx={config.tile*.2} ry={config.tile*.1}/><ellipse cx={config.tile*.78} cy={config.tile/2} rx={config.tile*.2} ry={config.tile*.1}/></g><circle cx={config.tile/2} cy={config.tile/2} r={config.tile*.1} fill={config.secondary}/><circle cx={config.tile/2} cy={config.tile/2} r={config.tile*.04} fill={config.accent}/></>}
            {config.type === 'grid' && <><rect width={config.tile} height={config.tile} fill={config.background}/><path d={`M${config.tile/2} 0 V${config.tile} M0 ${config.tile/2} H${config.tile} M0 0 L${config.tile} ${config.tile} M${config.tile} 0 L0 ${config.tile}`} stroke={config.primary} strokeWidth={Math.max(1.5,config.tile/28)} fill="none"/><circle cx={config.tile/2} cy={config.tile/2} r={config.tile*.14} fill={config.secondary}/><circle cx={config.tile/2} cy={config.tile/2} r={config.tile*.06} fill={config.accent}/></>}
          </pattern></defs>
          <rect width="400" height="400" fill={`url(#${patternId})`}/>
        </svg>
        <div className="pattern-preview-footer"><span>{config.tile}px وحدة</span><span>دوران {config.rotation}°</span><span>{selectedLabel}</span></div>
        <div className="pattern-export-actions"><button onClick={() => download('svg')}><Download size={15}/> تصدير SVG</button><button onClick={() => download('png')}><Download size={15}/> تصدير PNG</button></div>
      </div>
      <div className="pattern-controls">
        <div className="pattern-controls-heading"><Palette size={17}/><strong>إعدادات النقش</strong></div>
        <label>اسم التصميم<input value={config.name} maxLength={60} onChange={e => update('name', e.target.value)} placeholder="مثلاً: زخارف مستوحاة من الطبيعة"/></label>
        <label>نوع الوحدة<select value={config.type} onChange={e => update('type', e.target.value)}>{patternTypes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <div className="pattern-color-grid">
          {[['background','لون الخلفية'],['primary','اللون الأساسي'],['secondary','اللون الثانوي'],['accent','لون التفاصيل']].map(([key,label]) => <label key={key}>{label}<span><input type="color" value={config[key]} onChange={e => update(key, e.target.value)}/><code>{config[key].toUpperCase()}</code></span></label>)}
        </div>
        <label className="pattern-range-label">حجم الوحدة <strong>{config.tile}px</strong><input type="range" min="32" max="120" step="4" value={config.tile} onChange={e => update('tile', Number(e.target.value))}/></label>
        <label className="pattern-range-label">زاوية الدوران <strong>{config.rotation}°</strong><input type="range" min="-45" max="45" step="5" value={config.rotation} onChange={e => update('rotation', Number(e.target.value))}/></label>
        <button className="pattern-save-button" onClick={savePattern} disabled={saving || !user?.uid}>{saving ? <LoaderCircle size={16} className="spin"/> : <Save size={16}/>} {saving ? 'جارٍ الحفظ...' : 'حفظ النقش في مكتبتي'}</button>
        {error && <p className="materials-error" role="alert">{error}</p>}
      </div>
    </div>
    <div className="pattern-saved-library"><div><strong>نقوشك المحفوظة</strong><span>{saved.length} تصميم</span></div>{loading ? <p><LoaderCircle size={15} className="spin"/> جارٍ تحميل مكتبتك...</p> : saved.length ? <div className="pattern-saved-grid">{saved.map(item => <article key={item.id}><button className="pattern-saved-thumb" onClick={() => applySaved(item)} style={{background: item.background || defaults.background}}><span style={{background:item.primary || defaults.primary}}/><span style={{background:item.secondary || defaults.secondary}}/></button><strong>{item.name}</strong><small>{patternTypes.find(type => type.id === item.type)?.label || 'نقش محفوظ'}</small><div><button onClick={() => applySaved(item)}>فتح</button><button onClick={() => deletePattern(item.id)} aria-label="حذف النقش"><Trash2 size={13}/></button></div></article>)}</div> : <p>لم تحفظ نقوشاً بعد. ابدأ بتصميم أول وحدة زخرفية.</p>}</div>
  </section>
}
