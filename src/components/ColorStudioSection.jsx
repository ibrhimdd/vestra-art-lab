import { useEffect, useRef, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  Check, Copy, ImagePlus, LoaderCircle, Palette, Plus, Save, Sparkles, Trash2, Upload, X
} from 'lucide-react'

const MAX_IMAGE_SIZE = 12 * 1024 * 1024
const COLOR_COUNT = 6
const DEFAULT_PALETTE = ['#D9E7C8', '#9FB89A', '#647B68', '#D7A58C', '#E8DCCB', '#596B83']

function extractPalette(image) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('متصفحك لا يدعم تحليل الصور.')
  const scale = Math.min(1, 180 / Math.max(image.naturalWidth, image.naturalHeight))
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  const buckets = new Map()
  for (let i = 0; i < data.length; i += 16) {
    const alpha = data[i + 3]
    if (alpha < 180) continue
    const r = Math.round(data[i] / 24) * 24
    const g = Math.round(data[i + 1] / 24) * 24
    const b = Math.round(data[i + 2] / 24) * 24
    const key = [Math.min(255, r), Math.min(255, g), Math.min(255, b)]
    const id = key.join(',')
    buckets.set(id, (buckets.get(id) || 0) + 1)
  }
  const colors = [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, COLOR_COUNT)
    .map(([rgb]) => '#' + rgb.split(',').map(v => Number(v).toString(16).padStart(2, '0')).join('').toUpperCase())
  return colors.length ? colors : DEFAULT_PALETTE
}

export default function ColorStudioSection({ user, onNotice }) {
  const [palettes, setPalettes] = useState([])
  const [activeColors, setActiveColors] = useState(DEFAULT_PALETTE)
  const [imageName, setImageName] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const imageRef = useRef(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!user?.uid || !db) { setLoading(false); return }
      try {
        const snapshot = await getDoc(doc(db, 'users', user.uid))
        if (active) setPalettes(snapshot.exists() ? (snapshot.data().colorPalettes || []) : [])
      } catch (err) {
        console.error('Color palettes load failed:', err)
        if (active) setError('تعذر تحميل لوحات الألوان المحفوظة.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [user?.uid])

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const chooseImage = event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('اختر صورة بصيغة مدعومة.')
      event.target.value = ''
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('حجم الصورة يجب ألا يتجاوز 12 ميجابايت.')
      event.target.value = ''
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setImageName(file.name)
    setError('')
    setAnalyzing(true)
    const image = new Image()
    image.onload = () => {
      try {
        setActiveColors(extractPalette(image))
        setSaved(false)
        onNotice?.('تم استخراج لوحة الألوان من الصورة.')
      } catch (err) {
        setError(err.message || 'تعذر تحليل الصورة.')
      } finally {
        setAnalyzing(false)
        URL.revokeObjectURL(url)
        setPreviewUrl('')
      }
    }
    image.onerror = () => {
      setError('تعذر فتح الصورة. جرّب صورة أخرى.')
      setAnalyzing(false)
      URL.revokeObjectURL(url)
      setPreviewUrl('')
    }
    image.src = url
    event.target.value = ''
  }

  const updateColor = (index, value) => {
    setActiveColors(current => current.map((color, i) => i === index ? value.toUpperCase() : color))
    setSaved(false)
  }

  const addColor = () => {
    if (activeColors.length >= 10) return
    setActiveColors(current => [...current, '#A8B89A'])
    setSaved(false)
  }

  const removeColor = index => {
    setActiveColors(current => current.filter((_, i) => i !== index))
    setSaved(false)
  }

  const copyColor = async color => {
    try {
      await navigator.clipboard.writeText(color)
      onNotice?.(`تم نسخ ${color}`)
    } catch {
      onNotice?.('تعذر النسخ التلقائي. يمكنك تحديد كود اللون ونسخه.')
    }
  }

  const savePalette = async () => {
    if (!user?.uid || !db || !activeColors.length) return
    setSaving(true)
    setError('')
    try {
      const entry = {
        id: `palette-${Date.now()}`,
        name: imageName ? imageName.replace(/\.[^.]+$/, '') : 'لوحة ألوان جديدة',
        colors: activeColors,
        source: imageName || 'manual',
        createdAt: new Date().toISOString(),
      }
      const next = [entry, ...palettes].slice(0, 40)
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        colorPalettes: next,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setPalettes(next)
      setSaved(true)
      onNotice?.('تم حفظ لوحة الألوان في حسابك.')
    } catch (err) {
      console.error('Color palette save failed:', err)
      setError(err.code === 'permission-denied' ? 'قواعد Firestore لا تسمح بحفظ لوحة الألوان.' : 'تعذر حفظ لوحة الألوان. حاول مرة أخرى.')
    } finally {
      setSaving(false)
    }
  }

  const loadPalette = palette => {
    setActiveColors(palette.colors || [])
    setImageName(palette.name || '')
    setSaved(true)
    document.getElementById('color-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const deletePalette = async id => {
    const next = palettes.filter(item => item.id !== id)
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        colorPalettes: next,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setPalettes(next)
      onNotice?.('تم حذف لوحة الألوان.')
    } catch (err) {
      console.error('Color palette delete failed:', err)
      setError('تعذر حذف اللوحة. حاول مرة أخرى.')
    }
  }

  return (
    <section className="section-block color-studio-section" id="color-studio">
      <div className="section-heading">
        <div>
          <div className="section-kicker">PICK · EXTRACT · HARMONIZE</div>
          <h2>استوديو الألوان</h2>
          <p>استخرج الألوان من صورك، كوّن تركيباتك، واحفظ لوحاتك للرجوع إليها في أي وقت.</p>
        </div>
        <button className="color-save-button" onClick={savePalette} disabled={saving || loading || saved || !activeColors.length}>
          {saving ? <LoaderCircle size={16} className="spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? 'جارٍ الحفظ...' : saved ? 'اللوحة محفوظة' : 'حفظ اللوحة'}
        </button>
      </div>

      <div className="color-studio-layout">
        <div className="color-studio-editor">
          <div className="color-studio-editor-head"><div><Palette size={17} /><strong>محرر لوحة الألوان</strong></div><span>{activeColors.length} ألوان</span></div>
          <button className="color-upload-button" onClick={() => fileRef.current?.click()} disabled={analyzing}>
            {analyzing ? <LoaderCircle size={18} className="spin" /> : <ImagePlus size={18} />}
            <span><strong>{analyzing ? 'جارٍ تحليل الصورة...' : 'استخراج ألوان من صورة'}</strong><small>JPG · PNG · WEBP / حتى 12MB</small></span>
            <Upload size={16} />
          </button>
          <input ref={fileRef} className="visually-hidden" type="file" accept="image/*" onChange={chooseImage} />
          {previewUrl && <img className="color-source-preview" src={previewUrl} alt="الصورة المختارة للتحليل" />}
          <div className="color-palette-strip">
            {activeColors.map((hex, index) => (
              <div className="color-swatch-editor" key={index}>
                <div className="color-swatch-large" style={{ backgroundColor: hex }} />
                <input aria-label={`كود اللون ${index + 1}`} value={hex} onChange={event => updateColor(index, event.target.value)} maxLength={7} />
                <input aria-label={`تعديل اللون ${index + 1}`} type="color" value={/^#[0-9A-F]{6}$/i.test(hex) ? hex : '#A8B89A'} onChange={event => updateColor(index, event.target.value)} />
                <button onClick={() => copyColor(hex)} title="نسخ اللون" aria-label="نسخ اللون"><Copy size={13} /></button>
                <button onClick={() => removeColor(index)} title="إزالة اللون" aria-label="إزالة اللون"><X size={13} /></button>
              </div>
            ))}
          </div>
          <div className="color-editor-actions">
            <button onClick={addColor} disabled={activeColors.length >= 10}><Plus size={15} /> إضافة لون</button>
            <button onClick={() => { setActiveColors(DEFAULT_PALETTE); setImageName(''); setSaved(false) }}><Sparkles size={15} /> لوحة افتراضية</button>
          </div>
          {error && <div className="color-studio-error" role="alert">{error}</div>}
          <p className="color-studio-hint">يتم تحليل الصورة داخل متصفحك، ولا نرفع الصورة إلى أي خادم من خلال هذه الأداة.</p>
        </div>

        <div className="color-studio-preview">
          <div className="color-preview-top"><span>LIVE COLOR COMBINATION</span><span>VESTRA / COLOR LAB</span></div>
          <div className="color-preview-blocks">
            {activeColors.map((hex, index) => <div key={index} style={{ backgroundColor: hex }}><span>{hex}</span></div>)}
          </div>
          <div className="color-preview-bottom"><strong>تركيبتك اللونية</strong><span>عدّل أي لون وشاهد التكوين يتغير فوراً.</span></div>
        </div>
      </div>

      <div className="saved-palettes">
        <div className="saved-palettes-heading"><div><div className="section-kicker">YOUR COLOR LIBRARY</div><h3>لوحاتي المحفوظة</h3></div><span>{palettes.length} لوحة</span></div>
        {loading ? <div className="color-empty"><LoaderCircle size={19} className="spin" /> جارٍ تحميل اللوحات...</div> : palettes.length === 0 ? (
          <div className="color-empty"><Palette size={22} /><span>لم تحفظ لوحات بعد. أنشئ أول لوحة واحفظها هنا.</span></div>
        ) : (
          <div className="saved-palette-grid">
            {palettes.map(palette => (
              <article className="saved-palette-card" key={palette.id}>
                <div className="saved-palette-colors">{(palette.colors || []).map((hex, index) => <button key={index} style={{ backgroundColor: hex }} title={hex} onClick={() => copyColor(hex)} aria-label={`نسخ ${hex}`} />)}</div>
                <div className="saved-palette-meta"><div><strong>{palette.name || 'لوحة ألوان'}</strong><small>{(palette.colors || []).length} ألوان</small></div><button onClick={() => loadPalette(palette)}>فتح</button><button onClick={() => deletePalette(palette.id)} aria-label="حذف اللوحة"><Trash2 size={14} /></button></div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
