import { useEffect, useMemo, useRef, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  Download, FileImage, ImagePlus, LoaderCircle, Palette, Save,
  Shirt, SlidersHorizontal, Sparkles, Trash2, UploadCloud, X
} from 'lucide-react'

const CLOUD_NAME = 'fww3cli3'
const UPLOAD_PRESET = 'vestra_student_uploads'
const MAX_FABRIC_SIZE = 10 * 1024 * 1024

// قوالب أشكال القطع الأساسية (رسم مسطح/flat sketch). كل مسار يمثل الجزء القابل لتلوينه بالقماشة.
const GARMENTS = [
  {
    id: 'tshirt', label: 'تيشيرت / قميص بسيط', viewBox: '0 0 300 400',
    fillPaths: ['M90,22 C105,8 135,8 150,20 C165,8 195,8 210,22 L242,58 L203,92 L190,70 L190,380 L110,380 L110,70 L97,92 L58,58 Z'],
    decor: [],
  },
  {
    id: 'dress', label: 'فستان A-Line', viewBox: '0 0 300 400',
    fillPaths: ['M108,18 C122,6 178,6 192,18 L206,46 L186,58 L186,92 L236,372 L64,372 L114,92 L114,58 L94,46 Z'],
    decor: [],
  },
  {
    id: 'jacket', label: 'جاكيت مفتوح', viewBox: '0 0 300 400',
    fillPaths: [
      'M150,20 L120,8 L84,26 L46,66 L84,102 L100,82 L100,392 L200,392 L200,82 L216,102 L254,66 L216,26 L180,8 Z',
      'M150,20 L138,46 L150,70 L162,46 Z',
    ],
    decor: [
      { type: 'line', x1: 150, y1: 20, x2: 150, y2: 392 },
      { type: 'circle', cx: 150, cy: 140, r: 3 },
      { type: 'circle', cx: 150, cy: 190, r: 3 },
      { type: 'circle', cx: 150, cy: 240, r: 3 },
    ],
  },
  {
    id: 'pants', label: 'بنطلون', viewBox: '0 0 300 400',
    fillPaths: ['M60,10 L220,10 L224,50 L56,50 Z', 'M66,50 L130,50 L122,382 L80,382 Z', 'M150,50 L214,50 L200,382 L158,382 Z'],
    decor: [],
  },
]

const DEFAULTS = { baseColor: '#E8E2D5', trimColor: '#1A1A1A', trimWidth: 3, fabricScale: 60, fabricRotation: 0, fabricOpacity: 1 }

async function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export default function FashionDesignStudioSection({ user, onNotice }) {
  const [designs, setDesigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState('')

  const [garmentId, setGarmentId] = useState('tshirt')
  const [baseColor, setBaseColor] = useState(DEFAULTS.baseColor)
  const [trimColor, setTrimColor] = useState(DEFAULTS.trimColor)
  const [trimWidth, setTrimWidth] = useState(DEFAULTS.trimWidth)
  const [fabricFile, setFabricFile] = useState(null)
  const [fabricPreview, setFabricPreview] = useState('')
  const [fabricPublicId, setFabricPublicId] = useState('')
  const [fabricScale, setFabricScale] = useState(DEFAULTS.fabricScale)
  const [fabricRotation, setFabricRotation] = useState(DEFAULTS.fabricRotation)
  const [fabricOpacity, setFabricOpacity] = useState(DEFAULTS.fabricOpacity)

  const fabricInput = useRef(null)
  const svgRef = useRef(null)
  const garment = useMemo(() => GARMENTS.find(g => g.id === garmentId) || GARMENTS[0], [garmentId])

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!user?.uid || !db) { setLoading(false); return }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (alive) setDesigns(snap.exists() ? (snap.data().fashionDesigns || []) : [])
      } catch (e) {
        console.error('Fashion designs load failed:', e)
        if (alive) setError('تعذر تحميل تصميماتك المحفوظة. حاول تحديث الصفحة.')
      } finally { if (alive) setLoading(false) }
    }
    load()
    return () => { alive = false }
  }, [user?.uid])

  useEffect(() => () => { if (fabricPreview?.startsWith('blob:')) URL.revokeObjectURL(fabricPreview) }, [fabricPreview])

  const resetForm = () => {
    setEditingId('')
    setGarmentId('tshirt')
    setBaseColor(DEFAULTS.baseColor); setTrimColor(DEFAULTS.trimColor); setTrimWidth(DEFAULTS.trimWidth)
    setFabricFile(null); setFabricPreview(''); setFabricPublicId('')
    setFabricScale(DEFAULTS.fabricScale); setFabricRotation(DEFAULTS.fabricRotation); setFabricOpacity(DEFAULTS.fabricOpacity)
    if (fabricInput.current) fabricInput.current.value = ''
  }

  const chooseFabric = event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('اختر صورة قماشة بصيغة مدعومة.'); return }
    if (file.size > MAX_FABRIC_SIZE) { setError('حجم صورة القماشة يجب ألا يتجاوز 10 ميجابايت.'); return }
    setFabricFile(file)
    setFabricPreview(URL.createObjectURL(file))
    setFabricPublicId('')
    setError('')
  }

  const removeFabric = () => { setFabricFile(null); setFabricPreview(''); setFabricPublicId(''); if (fabricInput.current) fabricInput.current.value = '' }

  // يبني نسخة من الـ SVG الحالي بصورة القماشة مُضمَّنة Base64، عشان التصدير يشتغل حتى بدون اتصال وبدون مشاكل CORS عند التحويل لصورة.
  const buildExportSvg = async () => {
    const svgEl = svgRef.current
    if (!svgEl) return ''
    let fabricHref = fabricPreview
    if (fabricPreview) {
      try {
        const res = await fetch(fabricPreview)
        const blob = await res.blob()
        fabricHref = await toDataUrl(blob)
      } catch (e) { console.warn('Fabric inline failed, using remote href:', e) }
    }
    const clone = svgEl.cloneNode(true)
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const imageEl = clone.querySelector('image')
    if (imageEl && fabricHref) imageEl.setAttribute('href', fabricHref)
    return new XMLSerializer().serializeToString(clone)
  }

  const renderPng = async (scaleFactor = 3) => {
    const svgString = await buildExportSvg()
    if (!svgString) return ''
    const [, , vw, vh] = garment.viewBox.split(' ').map(Number)
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    try {
      const img = new Image()
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url })
      const canvas = document.createElement('canvas')
      canvas.width = vw * scaleFactor; canvas.height = vh * scaleFactor
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/png')
    } finally { URL.revokeObjectURL(url) }
  }

  const download = (href, filename) => { const a = document.createElement('a'); a.href = href; a.download = filename; document.body.appendChild(a); a.click(); a.remove() }

  const exportSvgFile = async () => {
    const svgString = await buildExportSvg()
    if (!svgString) return
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    download(URL.createObjectURL(blob), `vestra-${garment.id}-design.svg`)
  }

  const exportPngFile = async () => {
    const dataUrl = await renderPng(4)
    if (dataUrl) download(dataUrl, `vestra-${garment.id}-design.png`)
  }

  const uploadToCloudinary = async (fileOrBlob, folder) => {
    const body = new FormData()
    body.append('file', fileOrBlob); body.append('upload_preset', UPLOAD_PRESET); body.append('folder', folder)
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error?.message || 'فشل رفع الملف إلى Cloudinary.')
    return result
  }

  const persist = async next => {
    await setDoc(doc(db, 'users', user.uid), { uid: user.uid, fashionDesigns: next, updatedAt: serverTimestamp() }, { merge: true })
    setDesigns(next)
  }

  const saveDesign = async () => {
    if (!user?.uid || !db) return
    setSaving(true); setError('')
    try {
      let fabric = fabricPublicId ? { imageUrl: fabricPreview, publicId: fabricPublicId } : null
      if (fabricFile) {
        setUploading(true)
        const result = await uploadToCloudinary(fabricFile, 'vestra/fashion-fabrics')
        fabric = { imageUrl: result.secure_url, publicId: result.public_id }
        setFabricPreview(result.secure_url); setFabricPublicId(result.public_id); setFabricFile(null)
      }
      const pngDataUrl = await renderPng(3)
      const pngBlob = pngDataUrl ? await (await fetch(pngDataUrl)).blob() : null
      let preview = null
      if (pngBlob) {
        const result = await uploadToCloudinary(pngBlob, 'vestra/fashion-designs')
        preview = { previewUrl: result.secure_url, previewPublicId: result.public_id }
      }
      const old = designs.find(item => item.id === editingId)
      const entry = {
        id: editingId || `fashion-${Date.now()}`,
        garmentId, garmentLabel: garment.label,
        baseColor: baseColor.toUpperCase(), trimColor: trimColor.toUpperCase(), trimWidth,
        fabricUrl: fabric?.imageUrl || null, fabricPublicId: fabric?.publicId || null,
        fabricScale, fabricRotation, fabricOpacity,
        ...(preview || {}),
        createdAt: old?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const next = editingId ? designs.map(item => item.id === editingId ? entry : item) : [entry, ...designs]
      await persist(next)
      setEditingId(entry.id)
      onNotice?.(editingId ? 'تم تحديث تصميم القطعة.' : 'تم حفظ تصميم القطعة في حسابك.')
    } catch (e) {
      console.error('Fashion design save failed:', e)
      setError(e.code === 'permission-denied' ? 'قواعد Firestore لا تسمح بحفظ التصميم.' : (e.message || 'تعذر حفظ التصميم. حاول مرة أخرى.'))
    } finally { setSaving(false); setUploading(false) }
  }

  const loadDesign = item => {
    setEditingId(item.id)
    setGarmentId(item.garmentId || 'tshirt')
    setBaseColor(item.baseColor || DEFAULTS.baseColor)
    setTrimColor(item.trimColor || DEFAULTS.trimColor)
    setTrimWidth(item.trimWidth || DEFAULTS.trimWidth)
    setFabricFile(null)
    setFabricPreview(item.fabricUrl || '')
    setFabricPublicId(item.fabricPublicId || '')
    setFabricScale(item.fabricScale || DEFAULTS.fabricScale)
    setFabricRotation(item.fabricRotation || DEFAULTS.fabricRotation)
    setFabricOpacity(item.fabricOpacity ?? DEFAULTS.fabricOpacity)
    document.getElementById('fashion-studio-canvas')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const removeDesign = async id => {
    const next = designs.filter(item => item.id !== id)
    try { await persist(next); if (editingId === id) resetForm(); onNotice?.('تم حذف التصميم من حسابك. الملفات الأصلية على Cloudinary تظل محفوظة.') }
    catch (e) { setError('تعذر حذف التصميم.') }
  }

  return <section className="section-block fashion-studio-section">
    <div className="section-heading">
      <div><div className="section-kicker">DESIGN · LAYER · EXPORT</div><h2>استوديو تصميم الأزياء</h2><p>اختر شكل القطعة، ركّب عليها القماشة والألوان، وصدّر التصميم النهائي PNG أو SVG.</p></div>
      <span className="materials-count">{designs.length} تصميم محفوظ</span>
    </div>

    <div className="fashion-studio-layout">
      <div className="fashion-studio-editor">
        <div className="materials-form-title"><Shirt size={18} /><strong>{editingId ? 'تعديل التصميم' : 'تصميم جديد'}</strong></div>

        <label>شكل القطعة
          <div className="fashion-garment-grid">
            {GARMENTS.map(g => <button type="button" key={g.id} className={g.id === garmentId ? 'fashion-garment-btn active' : 'fashion-garment-btn'} onClick={() => setGarmentId(g.id)}>{g.label}</button>)}
          </div>
        </label>

        <div className="materials-fields">
          <label>اللون الأساسي<div className="materials-color"><input type="color" value={baseColor} onChange={e => setBaseColor(e.target.value)} /><code>{baseColor.toUpperCase()}</code></div></label>
          <label>لون الحواف والخياطة<div className="materials-color"><input type="color" value={trimColor} onChange={e => setTrimColor(e.target.value)} /><code>{trimColor.toUpperCase()}</code></div></label>
        </div>

        <input ref={fabricInput} type="file" accept="image/*" className="visually-hidden" onChange={chooseFabric} />
        <button type="button" className="materials-upload" onClick={() => fabricInput.current?.click()}><ImagePlus size={17} /><span>{fabricFile ? fabricFile.name : fabricPreview ? 'تغيير صورة القماشة' : 'إضافة صورة قماشة/نقشة'}</span><UploadCloud size={16} /></button>
        {fabricPreview && <div className="materials-preview"><img src={fabricPreview} alt="معاينة القماشة" /><button type="button" onClick={removeFabric} aria-label="إزالة القماشة"><X size={15} /></button></div>}

        {fabricPreview && <div className="fashion-sliders">
          <label>حجم تكرار النقشة<input type="range" min="20" max="200" value={fabricScale} onChange={e => setFabricScale(Number(e.target.value))} /></label>
          <label>دوران النقشة<input type="range" min="0" max="180" value={fabricRotation} onChange={e => setFabricRotation(Number(e.target.value))} /></label>
          <label>شفافية النقشة<input type="range" min="0.1" max="1" step="0.05" value={fabricOpacity} onChange={e => setFabricOpacity(Number(e.target.value))} /></label>
        </div>}

        <label>سُمك خط الحواف<input type="range" min="0" max="8" value={trimWidth} onChange={e => setTrimWidth(Number(e.target.value))} /></label>

        {error && <p className="materials-error" role="alert">{error}</p>}

        <div className="materials-form-actions">
          <button type="button" onClick={saveDesign} disabled={saving}>{saving ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />} {uploading ? 'جارٍ رفع الصور...' : saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'حفظ التصميم'}</button>
          {editingId && <button type="button" className="materials-cancel" onClick={resetForm}>تصميم جديد</button>}
        </div>
        <div className="materials-form-actions">
          <button type="button" className="fashion-export-btn" onClick={exportPngFile}><Download size={15} /> تصدير PNG</button>
          <button type="button" className="fashion-export-btn" onClick={exportSvgFile}><FileImage size={15} /> تصدير SVG</button>
        </div>
      </div>

      <div className="fashion-studio-preview" id="fashion-studio-canvas">
        <svg ref={svgRef} viewBox={garment.viewBox} className="fashion-canvas-svg">
          <defs>
            {fabricPreview && <pattern id="fashionFabricPattern" patternUnits="userSpaceOnUse" width={fabricScale} height={fabricScale} patternTransform={`rotate(${fabricRotation})`}>
              <image href={fabricPreview} width={fabricScale} height={fabricScale} preserveAspectRatio="xMidYMid slice" crossOrigin="anonymous" />
            </pattern>}
          </defs>
          {garment.fillPaths.map((d, i) => <path key={`base-${i}`} d={d} fill={baseColor} stroke="none" />)}
          {fabricPreview && garment.fillPaths.map((d, i) => <path key={`fab-${i}`} d={d} fill="url(#fashionFabricPattern)" opacity={fabricOpacity} stroke="none" />)}
          {trimWidth > 0 && garment.fillPaths.map((d, i) => <path key={`outline-${i}`} d={d} fill="none" stroke={trimColor} strokeWidth={trimWidth} strokeLinejoin="round" />)}
          {garment.decor.map((el, i) => el.type === 'line'
            ? <line key={`decor-${i}`} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={trimColor} strokeWidth={Math.max(1, trimWidth - 1)} />
            : <circle key={`decor-${i}`} cx={el.cx} cy={el.cy} r={el.r} fill={trimColor} />)}
        </svg>
        <p className="fashion-canvas-hint"><Sparkles size={13} /> المعاينة تحديث مباشر؛ التصدير يضمّن صورة القماشة داخل الملف نفسه.</p>
      </div>
    </div>

    <div className="fashion-studio-gallery">
      <div className="materials-form-title"><Palette size={18} /><strong>تصميماتي المحفوظة</strong></div>
      {loading ? <div className="materials-empty"><LoaderCircle className="spin" /> جارٍ تحميل تصميماتك...</div>
        : designs.length ? <div className="materials-grid">{designs.map(item => <article className="material-card" key={item.id}>
          {item.previewUrl ? <button className="material-image" onClick={() => loadDesign(item)}><img src={item.previewUrl} alt={item.garmentLabel} /></button>
            : <div className="material-image material-image-empty" style={{ background: item.baseColor || '#E8E2D5' }}><Shirt size={27} /></div>}
          <div className="material-card-body">
            <div className="material-meta"><span>{item.garmentLabel}</span><i style={{ background: item.baseColor || '#E8E2D5' }} /></div>
            <h3>{item.garmentLabel}</h3>
            <small>{item.fabricUrl ? 'قماشة مخصّصة' : 'لون سادة'}</small>
            <div className="material-actions"><button onClick={() => loadDesign(item)}><SlidersHorizontal size={14} /> فتح وتعديل</button><button onClick={() => removeDesign(item.id)}><Trash2 size={14} /> حذف</button></div>
          </div>
        </article>)}</div>
        : <div className="materials-empty"><Shirt size={27} /><strong>لا توجد تصميمات بعد</strong><span>ابدأ بتصميم أول قطعة وسيظهر هنا.</span></div>}
    </div>
  </section>
}
