import { useEffect, useRef, useState } from 'react'
import {
  collection, getDocs, query, where, updateDoc, deleteDoc, doc,
  arrayUnion, serverTimestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import {
  CloudUpload, FileImage, Film, FolderOpen, LoaderCircle, Trash2,
  Pencil, X, Check, ChevronDown, CalendarDays, Clock3, ExternalLink,
  Download, Search, Image as ImageIcon, PlayCircle
} from 'lucide-react'

const CLOUD_NAME = 'fww3cli3'
const UPLOAD_PRESET = 'vestra_student_uploads'
const MAX_FILE_SIZE = 50 * 1024 * 1024

const disciplines = [
  { value: 'fashion', label: 'الملابس والنسيج' },
  { value: 'art', label: 'التربية الفنية' },
  { value: 'digital', label: 'التصميم الرقمي' },
  { value: 'decor', label: 'الفنون الزخرفية' },
  { value: 'general', label: 'مشروع عام' },
]
const disciplineName = value => disciplines.find(item => item.value === value)?.label || value || 'مشروع عام'
const formatDate = value => {
  if (!value) return 'غير متاح'
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(date.getTime()) ? 'غير متاح' : new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function ProjectsSection({ onNotice }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editName, setEditName] = useState('')
  const [editDiscipline, setEditDiscipline] = useState('general')
  const [expandedId, setExpandedId] = useState('')
  const [assetFilters, setAssetFilters] = useState({})
  const [assetSearch, setAssetSearch] = useState({})
  const [previewAsset, setPreviewAsset] = useState(null)
  const fileInputs = useRef({})

  const loadProjects = async () => {
    if (!user || !db) {
      setProjects([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const snapshot = await getDocs(query(collection(db, 'projects'), where('ownerId', '==', user.uid)))
      setProjects(snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
      setError('')
    } catch (err) {
      console.error('Projects load failed:', err)
      setError('تعذر تحميل المشروعات. تحقق من اتصال Firestore وقواعده.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProjects() }, [user?.uid])

  const beginEdit = project => {
    setEditingId(project.id)
    setEditName(project.name || '')
    setEditDiscipline(project.discipline || 'general')
  }

  const saveProject = async event => {
    event.preventDefault()
    const project = projects.find(item => item.id === editingId)
    if (!project || project.ownerId !== user?.uid || !editName.trim()) return
    setBusy(project.id)
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        name: editName.trim(),
        discipline: editDiscipline,
        updatedAt: serverTimestamp(),
      })
      setEditingId('')
      await loadProjects()
      onNotice?.('تم تحديث بيانات المشروع بنجاح.')
    } catch (err) {
      console.error('Project update failed:', err)
      setError('تعذر حفظ التعديلات. تحقق من صلاحيات Firestore.')
    } finally {
      setBusy('')
    }
  }

  const removeProject = async project => {
    if (project.ownerId !== user?.uid) return
    const confirmed = window.confirm(`هل تريد حذف مشروع «${project.name}»؟ سيتم حذف سجل المشروع وروابط ملفاته فقط، ولن تُحذف الملفات الأصلية من Cloudinary.`)
    if (!confirmed) return
    setBusy(project.id)
    try {
      await deleteDoc(doc(db, 'projects', project.id))
      setProjects(current => current.filter(item => item.id !== project.id))
      if (expandedId === project.id) setExpandedId('')
      if (editingId === project.id) setEditingId('')
      onNotice?.('تم حذف المشروع من مساحة العمل.')
    } catch (err) {
      console.error('Project delete failed:', err)
      setError('تعذر حذف المشروع. تحقق من صلاحيات Firestore.')
    } finally {
      setBusy('')
    }
  }

  const uploadFiles = async (project, files) => {
    const selected = Array.from(files || [])
    if (!selected.length) return
    if (project.ownerId !== user?.uid) return
    setBusy(project.id)
    setError('')
    try {
      const uploaded = []
      for (const file of selected) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          throw new Error('يمكن رفع الصور والفيديوهات فقط.')
        }
        if (file.size > MAX_FILE_SIZE) throw new Error('الحد الأقصى لحجم الملف الواحد هو 50 ميجابايت.')
        const form = new FormData()
        form.append('file', file)
        form.append('upload_preset', UPLOAD_PRESET)
        form.append('folder', 'vestra/student-uploads')
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: 'POST', body: form })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error?.message || 'فشل رفع أحد الملفات إلى Cloudinary.')
        uploaded.push({
          assetId: result.asset_id,
          publicId: result.public_id,
          url: result.secure_url,
          resourceType: result.resource_type,
          format: result.format || '',
          bytes: result.bytes || file.size,
          originalName: file.name,
          createdAt: new Date().toISOString(),
        })
      }
      await updateDoc(doc(db, 'projects', project.id), {
        assets: arrayUnion(...uploaded),
        updatedAt: serverTimestamp(),
      })
      onNotice?.(`تم رفع ${uploaded.length} ملف وحفظ روابطه في مشروعك.`)
      await loadProjects()
    } catch (err) {
      console.error('Cloudinary upload failed:', err)
      setError(err.message || 'حدث خطأ أثناء رفع الملفات.')
    } finally {
      setBusy('')
      if (fileInputs.current[project.id]) fileInputs.current[project.id].value = ''
    }
  }

  const removeAssetRecord = async (project, asset) => {
    if (project.ownerId !== user?.uid) return
    if (!window.confirm('هل تريد إزالة الملف من قائمة المشروع؟ لن يُحذف الملف الأصلي من Cloudinary.')) return
    setBusy(project.id)
    try {
      const remaining = (project.assets || []).filter(item => item.assetId !== asset.assetId)
      await updateDoc(doc(db, 'projects', project.id), { assets: remaining, updatedAt: serverTimestamp() })
      await loadProjects()
      onNotice?.('تمت إزالة مرجع الملف من المشروع.')
    } catch (err) {
      setError('تعذر تحديث بيانات المشروع.')
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="section-block projects-workspace" id="projects">
      <div className="section-heading">
        <div><div className="section-kicker">YOUR IDEAS, YOUR SPACE</div><h2>مشروعاتي وملفاتي</h2><p>نظّم مشروعاتك، عدّل بياناتها، وتابع ملفاتك وتواريخ العمل.</p></div>
        <span className="roadmap-count">{projects.length} مشروع</span>
      </div>
      {error && <div className="projects-error" role="alert">{error}</div>}
      {loading ? <div className="projects-empty"><LoaderCircle className="spin" size={20} /> جارٍ تحميل المشروعات...</div> :
        projects.length === 0 ? <div className="projects-empty"><FolderOpen size={27} /><strong>لسه مفيش مشروعات</strong><span>أنشئ مشروعك الأول من زر «ابدأ مشروعاً جديداً» أعلى الصفحة.</span></div> :
        <div className="projects-grid">{projects.map(project => {
          const assets = project.assets || []
          const isEditing = editingId === project.id
          const isExpanded = expandedId === project.id
          const filter = assetFilters[project.id] || 'all'
          const searchTerm = (assetSearch[project.id] || '').trim().toLocaleLowerCase('ar')
          const visibleAssets = assets.filter(asset => {
            const matchesType = filter === 'all' || (filter === 'images' ? asset.resourceType === 'image' : asset.resourceType === 'video')
            const matchesName = !searchTerm || (asset.originalName || '').toLocaleLowerCase('ar').includes(searchTerm)
            return matchesType && matchesName
          })
          const imageCount = assets.filter(asset => asset.resourceType === 'image').length
          const videoCount = assets.filter(asset => asset.resourceType === 'video').length
          return <article className="project-card" key={project.id}>
            {isEditing ? (
              <form className="project-edit-form" onSubmit={saveProject}>
                <div className="project-edit-heading"><strong>تعديل بيانات المشروع</strong><button type="button" className="project-icon-action" onClick={() => setEditingId('')} aria-label="إلغاء"><X size={16} /></button></div>
                <label>اسم المشروع<input value={editName} onChange={event => setEditName(event.target.value)} maxLength={80} required /></label>
                <label>المجال الفني<select value={editDiscipline} onChange={event => setEditDiscipline(event.target.value)}>{disciplines.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <div className="project-edit-actions"><button type="button" className="project-secondary-btn" onClick={() => setEditingId('')}>إلغاء</button><button type="submit" className="project-save-btn" disabled={busy === project.id || !editName.trim()}>{busy === project.id ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} حفظ التعديلات</button></div>
              </form>
            ) : (
              <>
                <div className="project-card-head">
                  <div className="project-card-icon"><FolderOpen size={19} /></div>
                  <div className="project-title-copy"><h3>{project.name || 'مشروع بدون اسم'}</h3><span>{disciplineName(project.discipline)} • {assets.length} ملف</span></div>
                  <div className="project-card-actions">
                    <button className="project-icon-action" title="تعديل المشروع" aria-label="تعديل المشروع" onClick={() => beginEdit(project)}><Pencil size={15} /></button>
                    <button className="project-icon-action danger" title="حذف المشروع" aria-label="حذف المشروع" disabled={busy === project.id} onClick={() => removeProject(project)}><Trash2 size={15} /></button>
                  </div>
                </div>
                <input ref={node => { fileInputs.current[project.id] = node }} type="file" accept="image/*,video/*" multiple hidden onChange={event => uploadFiles(project, event.target.files)} />
                <button className="project-upload-btn" disabled={busy === project.id} onClick={() => fileInputs.current[project.id]?.click()}>
                  {busy === project.id ? <LoaderCircle className="spin" size={17} /> : <CloudUpload size={17} />}
                  {busy === project.id ? 'جارٍ تنفيذ العملية...' : 'رفع صور أو فيديوهات'}
                </button>
                <button className="project-details-toggle" onClick={() => setExpandedId(isExpanded ? '' : project.id)} aria-expanded={isExpanded}>
                  <span>{isExpanded ? 'إخفاء التفاصيل' : 'تفاصيل المشروع'}</span><ChevronDown size={15} className={isExpanded ? 'rotated' : ''} />
                </button>
                {isExpanded && <div className="project-meta-grid">
                  <div><CalendarDays size={14} /><span>تاريخ الإنشاء</span><strong>{formatDate(project.createdAt)}</strong></div>
                  <div><Clock3 size={14} /><span>آخر تحديث</span><strong>{formatDate(project.updatedAt)}</strong></div>
                  <div><FileImage size={14} /><span>عدد الملفات</span><strong>{assets.length} ملف</strong></div>
                </div>}
                <div className="project-gallery">
                  <div className="project-gallery-heading">
                    <div><strong>معرض ملفات المشروع</strong><span>{imageCount} صورة · {videoCount} فيديو</span></div>
                    <span className="gallery-total">{assets.length} ملف</span>
                  </div>
                  {assets.length > 0 ? <>
                    <div className="gallery-toolbar">
                      <div className="gallery-filters" role="group" aria-label="تصفية الملفات">
                        <button className={filter === 'all' ? 'selected' : ''} onClick={() => setAssetFilters(current => ({ ...current, [project.id]: 'all' }))}>الكل <small>{assets.length}</small></button>
                        <button className={filter === 'images' ? 'selected' : ''} onClick={() => setAssetFilters(current => ({ ...current, [project.id]: 'images' }))}>الصور <small>{imageCount}</small></button>
                        <button className={filter === 'videos' ? 'selected' : ''} onClick={() => setAssetFilters(current => ({ ...current, [project.id]: 'videos' }))}>الفيديو <small>{videoCount}</small></button>
                      </div>
                      <label className="gallery-search"><Search size={14} /><input value={assetSearch[project.id] || ''} onChange={event => setAssetSearch(current => ({ ...current, [project.id]: event.target.value }))} placeholder="ابحث باسم الملف..." /></label>
                    </div>
                    {visibleAssets.length > 0 ? <div className="project-gallery-grid">{visibleAssets.map(asset => <article className="gallery-asset-card" key={asset.assetId}>
                      <button className="gallery-preview" onClick={() => setPreviewAsset({ ...asset, projectName: project.name || 'مشروع بدون اسم' })} aria-label="معاينة الملف">
                        {asset.resourceType === 'video' ? <><div className="gallery-video-placeholder"><PlayCircle size={36} /><span>معاينة فيديو</span></div></> : <img src={asset.url} alt={asset.originalName || 'صورة المشروع'} loading="lazy" />}
                        <span className="gallery-type">{asset.resourceType === 'video' ? <Film size={12} /> : <ImageIcon size={12} />}{asset.resourceType === 'video' ? 'فيديو' : 'صورة'}</span>
                      </button>
                      <div className="gallery-asset-details">
                        <strong title={asset.originalName}>{asset.originalName || 'ملف بدون اسم'}</strong>
                        <small>{(asset.format || 'FILE').toUpperCase()} · {Math.max(1, Math.round((asset.bytes || 0) / 1024))} KB</small>
                        <div className="gallery-asset-actions">
                          <button onClick={() => setPreviewAsset({ ...asset, projectName: project.name || 'مشروع بدون اسم' })}><ExternalLink size={13} /> معاينة</button>
                          <a href={asset.url} download={asset.originalName || 'vestra-file'} target="_blank" rel="noreferrer" title="تنزيل أو فتح الملف"><Download size={13} /> تنزيل</a>
                          <button className="gallery-delete" disabled={busy === project.id} onClick={() => removeAssetRecord(project, asset)} title="إزالة الملف من المشروع"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </article>)}</div> : <div className="gallery-no-results">لا توجد ملفات تطابق البحث أو التصفية.</div>}
                  </> : <div className="gallery-empty"><FolderOpen size={22} /><strong>المعرض جاهز لاستقبال إبداعاتك</strong><span>ارفع صوراً أو فيديوهات لتظهر هنا في شكل معرض مرئي.</span></div>}
                </div>
              </>
            )}
          </article>
        })}</div>}
      <p className="projects-note"><FileImage size={14} /> الملفات محفوظة على Cloudinary، وبياناتها وروابطها محفوظة في Firestore. حذف مرجع الملف من المشروع لا يحذف الأصل من Cloudinary.</p>
      {previewAsset && <div className="asset-lightbox" role="dialog" aria-modal="true" aria-label="معاينة ملف المشروع" onClick={() => setPreviewAsset(null)}>
        <div className="asset-lightbox-panel" onClick={event => event.stopPropagation()}>
          <div className="asset-lightbox-header"><div><strong>{previewAsset.originalName || 'ملف المشروع'}</strong><span>{previewAsset.projectName}</span></div><button className="project-icon-action" onClick={() => setPreviewAsset(null)} aria-label="إغلاق المعاينة"><X size={18} /></button></div>
          <div className="asset-lightbox-stage">{previewAsset.resourceType === 'video' ? <video src={previewAsset.url} controls autoPlay playsInline /> : <img src={previewAsset.url} alt={previewAsset.originalName || 'معاينة الصورة'} />}</div>
          <div className="asset-lightbox-footer"><span>{(previewAsset.format || 'FILE').toUpperCase()} · {Math.max(1, Math.round((previewAsset.bytes || 0) / 1024))} KB</span><a href={previewAsset.url} download={previewAsset.originalName || 'vestra-file'} target="_blank" rel="noreferrer"><Download size={15} /> تنزيل أو فتح الملف</a></div>
        </div>
      </div>}
    </section>
  )
}
