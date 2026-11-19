import { useEffect, useMemo, useRef, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { BookImage, Check, ExternalLink, Filter, ImagePlus, LoaderCircle, Plus, Search, Save, SlidersHorizontal, Trash2, UploadCloud, X } from 'lucide-react'

const CLOUD_NAME = 'fww3cli3'
const UPLOAD_PRESET = 'vestra_student_uploads'
const MAX_SIZE = 10 * 1024 * 1024
const CATEGORIES = ['الكل', 'أقمشة', 'خامات طبيعية', 'خامات صناعية', 'ورق وطباعة', 'خامات تشكيل', 'أخرى']
const USES = ['ملابس ونسيج', 'تصميم رقمي', 'تربية فنية', 'ديكور وزخرفة', 'متعدد الاستخدامات']

export default function MaterialsLibrarySection({ user, onNotice }) {
  const [materials, setMaterials] = useState([])
  const [form, setForm] = useState({ name: '', category: 'أقمشة', description: '', color: '#9FB89A', use: USES[0], tags: '' })
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('الكل')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState('')
  const [preview, setPreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [removeExistingImage, setRemoveExistingImage] = useState(false)
  const fileRef = useRef(null)
  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!user?.uid || !db) { setLoading(false); return }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (alive) setMaterials(snap.exists() ? (snap.data().materials || []) : [])
      } catch (e) {
        console.error('Materials load failed:', e)
        if (alive) setError('تعذر تحميل مكتبة الخامات. حاول تحديث الصفحة.')
      } finally { if (alive) setLoading(false) }
    }
    load()
    return () => { alive = false }
  }, [user?.uid])

  const visible = useMemo(() => materials.filter(item => {
    const text = [item.name, item.category, item.description, item.use, ...(item.tags || [])].join(' ').toLowerCase()
    return (category === 'الكل' || item.category === category) && text.includes(query.trim().toLowerCase())
  }), [materials, category, query])

  const resetForm = () => {
    setForm({ name: '', category: 'أقمشة', description: '', color: '#9FB89A', use: USES[0], tags: '' })
    setImageFile(null); setEditingId(''); setPreview(null); setRemoveExistingImage(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const chooseImage = event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('اختر صورة بصيغة مدعومة.'); return }
    if (file.size > MAX_SIZE) { setError('حجم الصورة يجب ألا يتجاوز 10 ميجابايت.'); return }
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
    setError('')
  }

  const persist = async next => {
    await setDoc(doc(db, 'users', user.uid), { uid: user.uid, materials: next, updatedAt: serverTimestamp() }, { merge: true })
    setMaterials(next)
  }

  const submit = async event => {
    event.preventDefault()
    if (!user?.uid || !db || !form.name.trim()) return
    setSaving(true); setError('')
    let uploaded = null
    try {
      if (imageFile) {
        setUploading(true)
        const body = new FormData()
        body.append('file', imageFile); body.append('upload_preset', UPLOAD_PRESET); body.append('folder', 'vestra/materials')
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error?.message || 'فشل رفع صورة الخامة.')
        uploaded = { imageUrl: result.secure_url, publicId: result.public_id, format: result.format || '', bytes: result.bytes || imageFile.size }
      }
      const old = materials.find(item => item.id === editingId)
      const entry = {
        id: editingId || `material-${Date.now()}`,
        name: form.name.trim(), category: form.category, description: form.description.trim(),
        color: form.color.toUpperCase(), use: form.use,
        tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        ...(uploaded || (!removeExistingImage && old?.imageUrl ? { imageUrl: old.imageUrl, publicId: old.publicId, format: old.format, bytes: old.bytes } : {})),
        createdAt: old?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const next = editingId ? materials.map(item => item.id === editingId ? entry : item) : [entry, ...materials]
      await persist(next)
      onNotice?.(editingId ? 'تم تحديث بيانات الخامة.' : 'تمت إضافة الخامة إلى مكتبتك.')
      resetForm()
    } catch (e) {
      console.error('Material save failed:', e)
      setError(e.code === 'permission-denied' ? 'قواعد Firestore لا تسمح بحفظ بيانات المكتبة.' : (e.message || 'تعذر حفظ الخامة. حاول مرة أخرى.'))
    } finally { setSaving(false); setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const edit = item => {
    setEditingId(item.id)
    setForm({ name: item.name || '', category: item.category || 'أخرى', description: item.description || '', color: item.color || '#9FB89A', use: item.use || USES[0], tags: (item.tags || []).join(', ') })
    setPreview(item.imageUrl || null); setImageFile(null); setRemoveExistingImage(false)
    document.getElementById('materials-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const remove = async id => {
    const next = materials.filter(item => item.id !== id)
    try { await persist(next); if (editingId === id) resetForm(); onNotice?.('تم حذف الخامة من مكتبتك. ملاحظة: الملف الأصلي يظل محفوظاً على Cloudinary.') }
    catch (e) { setError('تعذر حذف الخامة من المكتبة.') }
  }

  return <section className="section-block materials-section">
    <div className="section-heading"><div><div className="section-kicker">COLLECT · CATALOG · CREATE</div><h2>مكتبة الخامات</h2><p>أنشئ أرشيفك الشخصي للأقمشة والأنسجة والخامات، واربط كل خامة باستخدامها ومراجعها.</p></div><span className="materials-count">{materials.length} خامة محفوظة</span></div>
    <div className="materials-layout">
      <form id="materials-form" className="materials-form" onSubmit={submit}>
        <div className="materials-form-title"><BookImage size={18}/><strong>{editingId ? 'تعديل بيانات الخامة' : 'إضافة خامة جديدة'}</strong></div>
        <label>اسم الخامة<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثلاً: كتان طبيعي" required maxLength={80}/></label>
        <div className="materials-fields"><label>الفئة<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATEGORIES.filter(v => v !== 'الكل').map(v => <option key={v}>{v}</option>)}</select></label><label>الاستخدام<select value={form.use} onChange={e => setForm({ ...form, use: e.target.value })}>{USES.map(v => <option key={v}>{v}</option>)}</select></label></div>
        <label>الوصف<textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="الملمس، الخصائص، طريقة الاستخدام..."/></label>
        <div className="materials-fields"><label>اللون المرجعي<div className="materials-color"><input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}/><code>{form.color.toUpperCase()}</code></div></label><label>كلمات مفتاحية<input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="ناعم، صيفي، مطفي"/></label></div>
        <input ref={fileRef} type="file" accept="image/*" className="visually-hidden" onChange={chooseImage}/>
        <button type="button" className="materials-upload" onClick={() => fileRef.current?.click()}><ImagePlus size={17}/><span>{imageFile ? imageFile.name : 'إضافة صورة للخامة'}</span><UploadCloud size={16}/></button>
        {preview && <div className="materials-preview"><img src={preview} alt="معاينة الخامة"/><button type="button" onClick={() => { setPreview(null); setImageFile(null); setRemoveExistingImage(Boolean(editingId)) }} aria-label="إزالة الصورة"><X size={15}/></button></div>}{removeExistingImage && <p className="materials-image-removed">سيتم حذف رابط الصورة من بيانات الخامة عند الحفظ. الملف الأصلي على Cloudinary لن يُحذف تلقائياً.</p>}
        {error && <p className="materials-error" role="alert">{error}</p>}
        <div className="materials-form-actions"><button type="submit" disabled={saving || !form.name.trim()}>{saving ? <LoaderCircle size={16} className="spin"/> : <Save size={16}/>} {uploading ? 'جارٍ رفع الصورة...' : saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'حفظ الخامة'}</button>{editingId && <button type="button" className="materials-cancel" onClick={resetForm}>إلغاء</button>}</div>
      </form>
      <div className="materials-library">
        <div className="materials-toolbar"><div className="materials-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالاسم أو الوصف أو الاستخدام..."/></div><div className="materials-filter"><Filter size={15}/><select value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(v => <option key={v}>{v}</option>)}</select></div></div>
        {loading ? <div className="materials-empty"><LoaderCircle className="spin"/> جارٍ تحميل مكتبتك...</div> : visible.length ? <div className="materials-grid">{visible.map(item => <article className="material-card" key={item.id}>
          {item.imageUrl ? <button className="material-image" onClick={() => window.open(item.imageUrl, '_blank', 'noopener,noreferrer')}><img src={item.imageUrl} alt={item.name}/><span><ExternalLink size={14}/></span></button> : <div className="material-image material-image-empty" style={{background: item.color || '#9FB89A'}}><BookImage size={27}/></div>}
          <div className="material-card-body"><div className="material-meta"><span>{item.category}</span><i style={{background: item.color || '#9FB89A'}}/></div><h3>{item.name}</h3><p>{item.description || 'لا يوجد وصف مضاف بعد.'}</p><small>{item.use}</small>{item.tags?.length > 0 && <div className="material-tags">{item.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}<div className="material-actions"><button onClick={() => edit(item)}><SlidersHorizontal size={14}/> تعديل</button><button onClick={() => remove(item.id)}><Trash2 size={14}/> حذف</button></div></div>
        </article>)}</div> : <div className="materials-empty"><BookImage size={27}/><strong>{materials.length ? 'لا توجد نتائج مطابقة' : 'مكتبتك لسه فاضية'}</strong><span>{materials.length ? 'جرّب تغيير كلمة البحث أو الفئة.' : 'أضف أول خامة وابدأ في بناء أرشيفك الفني.'}</span></div>}
      </div>
    </div>
  </section>
}
