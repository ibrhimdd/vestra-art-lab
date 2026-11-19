import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { ArrowLeft, ArrowRight, Check, Download, Layers3, Palette, Save, Shirt, Sparkles, WandSparkles } from 'lucide-react'

const garmentTypes = [
  { id: 'tee', label: 'تيشيرت', en: 'T-SHIRT' },
  { id: 'shirt', label: 'قميص', en: 'SHIRT' },
  { id: 'jacket', label: 'جاكيت', en: 'JACKET' },
  { id: 'dress', label: 'فستان', en: 'DRESS' },
  { id: 'trousers', label: 'بنطلون', en: 'TROUSERS' },
]
const steps = [{ id: 'fabric', label: 'القماش والنقشة' }, { id: 'garment', label: 'تفصيل القطعة' }, { id: 'review', label: 'مراجعة التصميم' }]
const fallbackPattern = { name: 'نقشة هندسية', type: 'diamonds', background: '#F1E7D5', primary: '#1E625C', secondary: '#D47E62', accent: '#E3B95B', tile: 72, rotation: 0, gap: 8 }
const defaultDesign = { name: 'تصميم جديد', garment: 'tee', fabricName: 'قماش قطني', fabricColor: '#d6f36a', fabricTexture: 'قطن ناعم', pattern: fallbackPattern, fit: 'مريح', length: 'عادي', sleeve: 'قصير', neckline: 'دائري', notes: '' }

function patternMarkup(pattern) {
  const source = pattern || fallbackPattern
  const safeHex = value => /^#[0-9a-f]{3,8}$/i.test(String(value || '')) ? value : '#777777'
  const p = { ...source, background: safeHex(source.background), primary: safeHex(source.primary), secondary: safeHex(source.secondary), accent: safeHex(source.accent) }
  const size = Math.max(24, Math.min(140, Number(p.tile) || 72))
  const type = p.type || 'diamonds'
  let motif = ''
  if (type === 'checker') motif = `<rect width="${size/2}" height="${size/2}" fill="${p.primary}"/><rect x="${size/2}" y="${size/2}" width="${size/2}" height="${size/2}" fill="${p.primary}"/><rect x="${size/2}" width="${size/2}" height="${size/2}" fill="${p.secondary}"/><rect y="${size/2}" width="${size/2}" height="${size/2}" fill="${p.secondary}"/>`
  else if (type === 'dots') motif = `<circle cx="${size/2}" cy="${size/2}" r="${size/5}" fill="${p.primary}"/><circle cx="0" cy="0" r="${size/9}" fill="${p.secondary}"/><circle cx="${size}" cy="${size}" r="${size/9}" fill="${p.secondary}"/>`
  else if (type === 'waves') motif = `<path d="M0 ${size*.3} Q${size*.25} 0 ${size/2} ${size*.3} T${size} ${size*.3} M0 ${size*.7} Q${size*.25} ${size*.4} ${size/2} ${size*.7} T${size} ${size*.7}" fill="none" stroke="${p.primary}" stroke-width="5"/>`
  else if (type === 'petals') motif = `<g fill="${p.primary}"><ellipse cx="${size/2}" cy="${size*.22}" rx="${size*.1}" ry="${size*.22}"/><ellipse cx="${size/2}" cy="${size*.78}" rx="${size*.1}" ry="${size*.22}"/><ellipse cx="${size*.22}" cy="${size/2}" rx="${size*.22}" ry="${size*.1}"/><ellipse cx="${size*.78}" cy="${size/2}" rx="${size*.22}" ry="${size*.1}"/></g><circle cx="${size/2}" cy="${size/2}" r="${size*.1}" fill="${p.accent}"/>`
  else if (type === 'grid') motif = `<path d="M0 0H${size}V${size}H0Z M0 ${size/2}H${size} M${size/2} 0V${size}" fill="none" stroke="${p.primary}" stroke-width="4"/><circle cx="${size/2}" cy="${size/2}" r="${size*.09}" fill="${p.accent}"/>`
  else motif = `<path d="M${size/2} 0L${size} ${size/2}L${size/2} ${size}L0 ${size/2}Z" fill="${p.primary}"/><path d="M${size/2} ${size*.2}L${size*.8} ${size/2}L${size/2} ${size*.8}L${size*.2} ${size/2}Z" fill="${p.secondary}"/><circle cx="${size/2}" cy="${size/2}" r="${size*.07}" fill="${p.accent}"/>`
  return `<pattern id="fabricPattern" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(${Number(p.rotation)||0})"><rect width="${size}" height="${size}" fill="${p.background || '#f1e7d5'}"/>${motif}</pattern>`
}

function garmentPath(type) {
  if (type === 'dress') return 'M145 55 L190 65 L210 115 L190 145 L220 355 Q145 385 70 355 L100 145 L80 115 L100 65 Z'
  if (type === 'jacket') return 'M110 55 L145 70 L180 55 L225 95 L205 155 L185 140 L195 350 L95 350 L105 140 L85 155 L65 95 Z'
  if (type === 'shirt') return 'M110 55 L145 70 L180 55 L225 95 L205 155 L185 140 L195 335 L95 335 L105 140 L85 155 L65 95 Z'
  if (type === 'trousers') return 'M90 55 L200 55 L190 170 L180 350 L135 350 L145 190 L130 190 L115 350 L70 350 L85 170 Z'
  return 'M110 55 L145 70 L180 55 L225 95 L205 155 L185 140 L195 335 L95 335 L105 140 L85 155 L65 95 Z'
}

function garmentSvg(design) {
  const path = garmentPath(design.garment)
  const neck = design.neckline === 'V' ? 'M125 68 L145 105 L165 68' : design.neckline === 'مربع' ? 'M125 70 V95 H165 V70' : 'M125 68 Q145 105 165 68'
  const sleeveLine = design.sleeve === 'طويل' ? '<path d="M86 104L48 225L72 238L111 145 M204 104L242 225L218 238L179 145" fill="url(#fabricPattern)" stroke="#b6c59c" stroke-width="2"/>' : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 290 410" role="img"><defs>${patternMarkup(design.pattern)}</defs><ellipse cx="145" cy="370" rx="95" ry="12" fill="#0c120e" opacity=".35"/><path d="${path}" fill="url(#fabricPattern)" stroke="#dce8c8" stroke-width="2.5" stroke-linejoin="round"/>${sleeveLine}<path d="${neck}" fill="none" stroke="#dce8c8" stroke-width="3" stroke-linecap="round"/>${design.garment === 'jacket' || design.garment === 'shirt' ? '<path d="M145 102V335" stroke="#dce8c8" stroke-width="2" stroke-dasharray="3 5"/><circle cx="139" cy="155" r="2.5" fill="#e8e9d8"/><circle cx="151" cy="195" r="2.5" fill="#e8e9d8"/>' : ''}<text x="145" y="395" text-anchor="middle" fill="#9aa88e" font-size="9" letter-spacing="2">VESTRA / DESIGN STUDY</text></svg>`
}

function getSuggestions(design) {
  const suggestions = []
  if (design.pattern?.type === 'checker' && design.garment === 'jacket') suggestions.push('النقشة المربعة قوية بصرياً؛ جرّب بطانة داخلية بلون موحّد حتى لا يصبح التصميم مزدحماً.')
  if (design.pattern?.type === 'dots') suggestions.push('يمكن تكبير المسافة بين النقاط أو تقليل حجمها للحصول على مظهر أكثر هدوءاً.')
  if (design.garment === 'dress' && design.fit === 'واسع') suggestions.push('جرّب تحديد الخصر بحزام رفيع أو قصّة إمبير لإضافة توازن إلى حجم الفستان.')
  if (design.garment === 'jacket' && design.sleeve === 'قصير') suggestions.push('يمكن مقارنة الأكمام القصيرة بأكمام طويلة لمعرفة أيهما يخدم فكرة الجاكيت أكثر.')
  if (design.pattern?.primary?.toLowerCase() === design.pattern?.background?.toLowerCase()) suggestions.push('ارفع التباين بين لون النقشة والخلفية حتى تظل التفاصيل واضحة على القماش.')
  if (!design.notes.trim()) suggestions.push('أضف وصفاً قصيراً لفكرة القطعة أو المناسبة المستهدفة لتسهيل مراجعة التصميم في المرحلة التالية.')
  if (!suggestions.length) suggestions.push('التكوين متوازن كبداية. جرّب نسخة ثانية بلون ثانوي مختلف وقارن النسختين قبل اعتماد التصميم.')
  return suggestions
}

export default function FashionDesignStudioSection({ user, onNotice, onTryOn }) {
  const [step, setStep] = useState('fabric')
  const [design, setDesign] = useState(defaultDesign)
  const [materials, setMaterials] = useState([])
  const [patterns, setPatterns] = useState([])
  const [saved, setSaved] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [idea, setIdea] = useState('')
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!user?.uid || !db) { setLoading(false); return }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (!alive) return
        const data = snap.exists() ? snap.data() : {}
        setMaterials((data.materials || []).filter(item => item.category === 'أقمشة' || item.use === 'ملابس ونسيج' || item.category === 'خامات طبيعية' || item.category === 'خامات صناعية'))
        setPatterns(data.patternDesigns || [])
        setSaved(data.fashionDesigns || [])
        const firstIdea = (data.creativeIdeas || []).find(item => item.field === 'الملابس والنسيج')
        if (firstIdea) setIdea(firstIdea.title || '')
      } catch (error) {
        console.error('Fashion studio load failed:', error)
        onNotice?.('تعذر تحميل مكتبتك الإبداعية. يمكنك متابعة التصميم بخيارات البداية.')
      } finally { if (alive) setLoading(false) }
    }
    load()
    return () => { alive = false }
  }, [user?.uid])

  const update = (key, value) => setDesign(current => ({ ...current, [key]: value }))
  const updatePattern = (key, value) => setDesign(current => ({ ...current, pattern: { ...current.pattern, [key]: value } }))
  const suggestions = useMemo(() => getSuggestions(design), [design])
  const previewSvg = useMemo(() => garmentSvg(design), [design])
  const selectedGarment = garmentTypes.find(item => item.id === design.garment) || garmentTypes[0]

  const chooseMaterial = material => setDesign(current => ({ ...current, fabricName: material.name, fabricColor: material.color || current.fabricColor, fabricTexture: material.description || material.category || 'خامة مختارة', pattern: { ...current.pattern, background: material.color || current.pattern.background } }))
  const choosePattern = pattern => setDesign(current => ({ ...current, pattern: { ...fallbackPattern, ...pattern } }))

  const saveDesign = async () => {
    if (!user?.uid || !db) { onNotice?.('سجّل الدخول لحفظ التصميم.'); return }
    setSaving(true)
    try {
      const item = { ...design, ideaBrief: idea, id: `fashion-${Date.now()}`, title: design.name.trim() || selectedGarment.label, previewSvg, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      const next = [item, ...saved.filter(entry => entry.id !== item.id)].slice(0, 30)
      await setDoc(doc(db, 'users', user.uid), { uid: user.uid, fashionDesigns: next, updatedAt: serverTimestamp() }, { merge: true })
      setSaved(next)
      onNotice?.('تم حفظ التصميم في مجموعتك بنجاح.')
    } catch (error) {
      console.error('Fashion design save failed:', error)
      onNotice?.('تعذر حفظ التصميم. حاول مرة أخرى.')
    } finally { setSaving(false) }
  }

  const downloadSvg = () => {
    const blob = new Blob([previewSvg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(design.name || 'vestra-design').replace(/[^\p{L}\p{N}-]+/gu, '-')}.svg`
    link.click()
    URL.revokeObjectURL(url)
  }

  const continueTryOn = () => {
    onTryOn?.({ ...design, title: design.name || selectedGarment.label, previewSvg })
  }

  return <section className="section-block fashion-studio">
    <div className="section-heading fashion-studio-heading"><div><div className="section-kicker">CONCEPT · TEXTILE · SILHOUETTE</div><h2>استوديو تصميم الأزياء</h2><p>حوّل فكرتك إلى خامة ونقشة وقطعة ملابس قابلة للمعاينة والتطوير.</p></div><button className="fashion-saved-toggle" onClick={() => setShowSaved(value => !value)}><Layers3 size={15}/> تصميماتي المحفوظة ({saved.length})</button></div>
    <div className="fashion-workflow"><div className="fashion-workflow-copy"><span>DESIGN WORKFLOW</span><strong>من الفكرة إلى القطعة النهائية</strong><small>{idea ? `فكرة مرتبطة: ${idea}` : 'ابدأ بتحديد خامتك ونقشتك ثم اختر شكل القطعة.'}</small></div><div className="fashion-stepper">{steps.map((item, index) => <button key={item.id} className={step === item.id ? 'active' : steps.findIndex(s => s.id === step) > index ? 'done' : ''} onClick={() => setStep(item.id)}><span>{steps.findIndex(s => s.id === item.id) < steps.findIndex(s => s.id === step) ? <Check size={13}/> : `0${index+1}`}</span>{item.label}</button>)}</div></div>

    <div className="fashion-editor-layout">
      <div className="fashion-editor-panel">
        {step === 'fabric' && <div className="fashion-panel-content">
          <div className="fashion-panel-title"><div><span>01 / FABRIC DESIGN</span><h3>ابدأ بتصميم القماش</h3><p>اختر خامة من مكتبتك أو ابدأ بخامة جديدة، ثم اضبط ألوان النقشة.</p></div><div className="fashion-panel-icon"><Layers3 size={19}/></div></div>
          {materials.length > 0 && <div className="fashion-library-strip"><strong>خاماتك المحفوظة</strong><div>{materials.slice(0,5).map(item => <button key={item.id} className={design.fabricName === item.name ? 'selected' : ''} onClick={() => chooseMaterial(item)}><i style={{background:item.color || '#8b9c76'}}/><span>{item.name}</span></button>)}</div></div>}
          <label className="fashion-field">فكرة التصميم أو وصفه<input value={idea} onChange={e => setIdea(e.target.value)} placeholder="مثلاً: مجموعة شبابية مستوحاة من البحر"/></label>
          <label className="fashion-field">اسم القماش<input value={design.fabricName} onChange={e => update('fabricName',e.target.value)} placeholder="مثلاً: كتان مطبوع"/></label>
          <div className="fashion-fields-two"><label className="fashion-field">نوع / ملمس القماش<input value={design.fabricTexture} onChange={e => update('fabricTexture',e.target.value)} placeholder="قطن، كتان، حرير..."/></label><label className="fashion-field">اللون الأساسي<input type="color" value={design.fabricColor} onChange={e => { update('fabricColor',e.target.value); updatePattern('background',e.target.value) }}/></label></div>
          <div className="fashion-subheading"><strong>النقوش المحفوظة</strong><span>{patterns.length} نقش</span></div>
          <div className="fashion-pattern-list">{(patterns.length ? patterns.slice(0,8) : [fallbackPattern]).map((item,index) => <button key={item.id || index} className={design.pattern.name === item.name && design.pattern.type === item.type ? 'selected' : ''} onClick={() => choosePattern(item)}><span className="fashion-pattern-swatch" style={{background:`repeating-linear-gradient(45deg,${item.primary || fallbackPattern.primary} 0 7px,${item.background || fallbackPattern.background} 7px 14px)`}}/><span>{item.name || 'نقش محفوظ'}</span><small>{item.type || 'نقش'}</small></button>)}</div>
          <div className="fashion-custom-pattern"><div className="fashion-subheading"><strong>تخصيص ألوان النقشة</strong><span>LIVE EDIT</span></div><div className="fashion-color-controls">{[['background','الخلفية'],['primary','الرئيسي'],['secondary','الثانوي'],['accent','التفاصيل']].map(([key,label])=><label key={key}><span>{label}</span><input type="color" value={design.pattern[key] || '#ffffff'} onChange={e => updatePattern(key,e.target.value)}/></label>)}</div></div>
        </div>}

        {step === 'garment' && <div className="fashion-panel-content">
          <div className="fashion-panel-title"><div><span>02 / GARMENT SHAPE</span><h3>اختار شكل القطعة وتفاصيلها</h3><p>التصميم هنا نموذج بصري مبدئي يساعدك على تصور القصة والنقشة.</p></div><div className="fashion-panel-icon"><Shirt size={19}/></div></div>
          <label className="fashion-field">اسم التصميم<input value={design.name} onChange={e => update('name',e.target.value)} placeholder="اسم مجموعتك أو القطعة"/></label>
          <div className="fashion-garment-choices">{garmentTypes.map(item => <button key={item.id} className={design.garment === item.id ? 'selected' : ''} onClick={() => update('garment',item.id)}><Shirt size={19}/><strong>{item.label}</strong><small>{item.en}</small></button>)}</div>
          <div className="fashion-fields-two"><label className="fashion-field">القصة / الاتساع<select value={design.fit} onChange={e => update('fit',e.target.value)}><option>مريح</option><option>محدد</option><option>واسع</option><option>مستقيم</option></select></label><label className="fashion-field">الطول<select value={design.length} onChange={e => update('length',e.target.value)}><option>قصير</option><option>عادي</option><option>طويل</option></select></label></div>
          <div className="fashion-fields-two"><label className="fashion-field">الأكمام<select value={design.sleeve} onChange={e => update('sleeve',e.target.value)}><option>قصير</option><option>طويل</option><option>بدون أكمام</option></select></label><label className="fashion-field">شكل الياقة<select value={design.neckline} onChange={e => update('neckline',e.target.value)}><option>دائري</option><option>V</option><option>مربع</option></select></label></div>
          <label className="fashion-field">فكرة القطعة / ملاحظات<input value={design.notes} onChange={e => update('notes',e.target.value)} placeholder="مثلاً: جاكيت مستوحى من الزخارف الإسلامية"/></label>
        </div>}

        {step === 'review' && <div className="fashion-panel-content">
          <div className="fashion-panel-title"><div><span>03 / DESIGN REVIEW</span><h3>مراجعة ومقترحات تطوير</h3><p>ملاحظات تصميمية أولية مبنية على اختياراتك الحالية، وليست اتصالاً بنموذج AI خارجي بعد.</p></div><div className="fashion-panel-icon"><WandSparkles size={19}/></div></div>
          <div className="fashion-review-summary"><strong>{design.name || selectedGarment.label}</strong><span>{selectedGarment.label} · {design.fabricName} · {design.fit}</span><p>{design.notes || 'لم تضف وصفاً للفكرة بعد.'}</p></div>
          <div className="fashion-suggestions">{suggestions.map((item,index)=><div key={index}><Sparkles size={16}/><p>{item}</p></div>)}</div>
          <div className="fashion-ai-note"><Sparkles size={16}/><span>هذه مراجعة إرشادية داخلية حالياً. سنربط لاحقاً نموذج ذكاء اصطناعي ليحلل التصميم بصرياً ويقترح بدائل فعلية.</span></div>
        </div>}

        <div className="fashion-panel-footer"><button className="fashion-secondary-btn" onClick={() => setStep(steps[Math.max(0,steps.findIndex(item=>item.id===step)-1)].id)} disabled={step === 'fabric'}><ArrowRight size={15}/> السابق</button><div><button className="fashion-secondary-btn" onClick={downloadSvg}><Download size={15}/> تصدير SVG</button><button className="primary-btn" onClick={() => step === 'review' ? saveDesign() : setStep(steps[Math.min(2,steps.findIndex(item=>item.id===step)+1)].id)} disabled={saving}>{saving ? 'جارٍ الحفظ...' : step === 'review' ? <><Save size={15}/> حفظ التصميم</> : <>التالي <ArrowLeft size={15}/></>}</button></div></div>
      </div>

      <aside className="fashion-preview-panel"><div className="fashion-preview-top"><div><span>LIVE PREVIEW / 001</span><strong>معاينة القطعة</strong></div><span className="fashion-live-dot">LIVE</span></div><div className="fashion-preview-stage"><div className="fashion-preview-glow"/><div className="fashion-garment-svg" dangerouslySetInnerHTML={{__html:previewSvg}}/></div><div className="fashion-preview-caption"><strong>{design.name || selectedGarment.label}</strong><span>{selectedGarment.label} · {design.fabricName}</span></div><div className="fashion-preview-meta"><div><small>نوع القماش</small><strong>{design.fabricTexture || 'غير محدد'}</strong></div><div><small>النقشة</small><strong>{design.pattern.name || 'مخصصة'}</strong></div></div><button className="fashion-tryon-btn" onClick={continueTryOn}><Sparkles size={16}/> جرّب التصميم افتراضياً <ArrowLeft size={15}/></button><small className="fashion-preview-hint">يتم تجهيز معاينة SVG للتصميم؛ التجربة الافتراضية تحتاج صورة ملابس واضحة ومناسبة لمحرك Decart.</small></aside>
    </div>

    {showSaved && <div className="fashion-saved-section"><div className="fashion-subheading"><strong>تصميماتك المحفوظة</strong><button onClick={() => setShowSaved(false)}>إغلاق</button></div>{saved.length ? <div className="fashion-saved-grid">{saved.map(item=><button key={item.id} onClick={() => {setDesign({...defaultDesign,...item});setIdea(item.ideaBrief || '');setStep('review');setShowSaved(false)}}><span>{item.title || item.name}</span><small>{item.fabricName} · {garmentTypes.find(g=>g.id===item.garment)?.label || 'قطعة'}</small></button>)}</div> : <p>لم تحفظ تصميمات بعد. أكمل تصميمك واحفظه لتجده هنا.</p>}</div>}
    {loading && <div className="fashion-loading">جارٍ تحميل خاماتك ونقوشك المحفوظة...</div>}
  </section>
}
