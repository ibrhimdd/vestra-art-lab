import { useEffect, useRef, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  Check, Copy, ExternalLink, ImagePlus, LoaderCircle, Palette,
  Plus, Save, StickyNote, Trash2, UploadCloud, X
} from 'lucide-react'

const CLOUD_NAME = 'fww3cli3'
const UPLOAD_PRESET = 'vestra_student_uploads'
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const starterColors = ['#D9E7C8', '#9FB89A', '#647B68', '#D7A58C', '#E8DCCB']

export default function MoodboardSection({ user, onNotice }) {
  const [items, setItems] = useState([])
  const [note, setNote] = useState('')
  const [color, setColor] = useState('#D9E7C8')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(true)
  const fileInput = useRef(null)

  useEffect(() => {
    let active = true
    const loadBoard = async () => {
      if (!user?.uid || !db) {
        setLoading(false)
        return
      }
      try {
        const snapshot = await getDoc(doc(db, 'users', user.uid))
        if (active) setItems(snapshot.exists() ? (snapshot.data().moodboardItems || []) : [])
      } catch (err) {
        console.error('Moodboard load failed:', err)
        if (active) setError('تعذر تحميل لوحة الإلهام. تحقق من اتصالك ثم أعد المحاولة.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadBoard()
    return () => { active = false }
  }, [user?.uid])

  const markChanged = next => {
    setItems(next)
    setSaved(false)
    setError('')
  }

  const addNote = event => {
    event.preventDefault()
    if (!note.trim()) return
    markChanged([...items, {
      id: `note-${Date.now()}`,
      type: 'note',
      title: 'فكرة جديدة',
      text: note.trim(),
      createdAt: new Date().toISOString(),
    }])
    setNote('')
  }

  const addColor = () => {
    if (items.some(item => item.type === 'color' && item.hex === color)) {
      onNotice?.('هذا اللون موجود بالفعل في اللوحة.')
      return
    }
    markChanged([...items, {
      id: `color-${Date.now()}`,
      type: 'color',
      hex: color.toUpperCase(),
      createdAt: new Date().toISOString(),
    }])
  }

  const uploadImage = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('اختر ملف صورة صالحاً.')
      event.target.value = ''
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('حجم الصورة يجب ألا يتجاوز 10 ميجابايت.')
      event.target.value = ''
      return
    }
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('upload_preset', UPLOAD_PRESET)
      form.append('folder', 'vestra/moodboards')
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: form,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error?.message || 'فشل رفع الصورة.')
      markChanged([...items, {
        id: result.asset_id || `image-${Date.now()}`,
        type: 'image',
        title: file.name,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format || '',
        bytes: result.bytes || file.size,
        createdAt: new Date().toISOString(),
      }])
      onNotice?.('تم رفع الصورة وإضافتها إلى لوحة الإلهام. اضغط حفظ لتثبيت اللوحة.')
    } catch (err) {
      console.error('Moodboard image upload failed:', err)
      setError(err.message || 'حدث خطأ أثناء رفع الصورة.')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const removeItem = id => markChanged(items.filter(item => item.id !== id))

  const saveBoard = async () => {
    if (!user?.uid || !db) return
    setSaving(true)
    setError('')
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        moodboardItems: items,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setSaved(true)
      onNotice?.('تم حفظ لوحة الإلهام في حسابك بنجاح.')
    } catch (err) {
      console.error('Moodboard save failed:', err)
      setError(err.code === 'permission-denied'
        ? 'قواعد Firestore لا تسمح بحفظ لوحة الإلهام في ملفك الشخصي.'
        : 'تعذر حفظ اللوحة. تحقق من الاتصال وحاول مجدداً.')
    } finally {
      setSaving(false)
    }
  }

  const copyColor = async hex => {
    try {
      await navigator.clipboard.writeText(hex)
      onNotice?.(`تم نسخ اللون ${hex}`)
    } catch {
      onNotice?.('لم نتمكن من نسخ اللون تلقائياً. يمكنك تحديد الكود ونسخه.')
    }
  }

  return (
    <section className="section-block moodboard-section" id="moodboard">
      <div className="section-heading">
        <div>
          <div className="section-kicker">COLLECT · EXPLORE · CREATE</div>
          <h2>لوحة الإلهام</h2>
          <p>اجمع الصور والأفكار والألوان التي تلهم مشروعك في مساحة بصرية واحدة.</p>
        </div>
        <button className="moodboard-save" onClick={saveBoard} disabled={saving || loading || saved}>
          {saving ? <LoaderCircle size={16} className="spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? 'جارٍ الحفظ...' : saved ? 'تم الحفظ' : 'حفظ اللوحة'}
        </button>
      </div>

      <div className="moodboard-workspace">
        <aside className="moodboard-tools">
          <div className="moodboard-tools-title"><Palette size={17} /><strong>أضف إلى لوحتك</strong></div>
          <button className="moodboard-tool-button" onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? <LoaderCircle size={17} className="spin" /> : <ImagePlus size={17} />}
            <span><strong>{uploading ? 'جارٍ رفع الصورة...' : 'إضافة صورة مرجعية'}</strong><small>JPG · PNG · WEBP / حتى 10MB</small></span>
          </button>
          <input ref={fileInput} className="visually-hidden" type="file" accept="image/*" onChange={uploadImage} />

          <form className="moodboard-note-form" onSubmit={addNote}>
            <label htmlFor="moodboard-note"><StickyNote size={15} /> ملاحظة أو فكرة</label>
            <textarea id="moodboard-note" value={note} onChange={event => setNote(event.target.value)} placeholder="اكتب وصفاً أو فكرة أو إحساساً تريد أن يظهر في التصميم..." rows={4} />
            <button type="submit" className="moodboard-add-button" disabled={!note.trim()}><Plus size={15} /> إضافة الفكرة</button>
          </form>

          <div className="moodboard-color-tool">
            <label htmlFor="moodboard-color"><Palette size={15} /> لون ملهم</label>
            <div className="moodboard-color-picker"><input id="moodboard-color" type="color" value={color} onChange={event => setColor(event.target.value)} /><span>{color.toUpperCase()}</span></div>
            <button className="moodboard-add-button" onClick={addColor} type="button"><Plus size={15} /> أضف اللون</button>
            <div className="moodboard-starter-colors">{starterColors.map(hex => <button key={hex} type="button" style={{ backgroundColor: hex }} title={hex} aria-label={`اختيار اللون ${hex}`} onClick={() => setColor(hex)} />)}</div>
          </div>
          <p className="moodboard-private-note">لوحتك مرتبطة بحسابك، والصور تحفظ على Cloudinary بينما تحفظ بيانات اللوحة في Firestore.</p>
        </aside>

        <div className="moodboard-canvas">
          <div className="moodboard-canvas-head">
            <div><span className="moodboard-live-dot" /><strong>مساحة التجميع</strong><small>{items.length} عنصر</small></div>
            <span className={saved ? 'moodboard-save-state' : 'moodboard-save-state unsaved'}>{saved ? 'كل التغييرات محفوظة' : 'تغييرات غير محفوظة'}</span>
          </div>
          {loading ? <div className="moodboard-empty"><LoaderCircle size={22} className="spin" /><span>جارٍ تحميل لوحتك...</span></div> : items.length === 0 ? (
            <div className="moodboard-empty"><div className="moodboard-empty-icon"><ImagePlus size={25} /></div><strong>ابدأ بتجميع مصادر إلهامك</strong><span>أضف صورة أو ملاحظة أو مجموعة ألوان لتكوين أول لوحة لك.</span></div>
          ) : (
            <div className="moodboard-items">
              {items.map(item => (
                <article className={`moodboard-item moodboard-item-${item.type}`} key={item.id}>
                  <button className="moodboard-remove" onClick={() => removeItem(item.id)} aria-label="إزالة العنصر"><X size={14} /></button>
                  {item.type === 'image' && <><a className="moodboard-image" href={item.url} target="_blank" rel="noreferrer"><img src={item.url} alt={item.title || 'صورة إلهام'} loading="lazy" /><span><ExternalLink size={13} /> فتح الصورة</span></a><div className="moodboard-item-caption">{item.title || 'صورة مرجعية'}</div></>}
                  {item.type === 'note' && <div className="moodboard-note-card"><StickyNote size={17} /><strong>{item.title || 'ملاحظة'}</strong><p>{item.text}</p></div>}
                  {item.type === 'color' && <div className="moodboard-color-card"><div style={{ backgroundColor: item.hex }} /><strong>{item.hex}</strong><button onClick={() => copyColor(item.hex)}><Copy size={13} /> نسخ الكود</button></div>}
                </article>
              ))}
            </div>
          )}
          {error && <div className="moodboard-error" role="alert">{error}</div>}
          <div className="moodboard-canvas-footer"><span>VESTRA / MOODBOARD</span><span>مساحة عمل إبداعية خاصة</span></div>
        </div>
      </div>
    </section>
  )
}
