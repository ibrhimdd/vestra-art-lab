import { useEffect, useRef, useState } from 'react'
import { collection, getDocs, query, where, updateDoc, doc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { CloudUpload, FileImage, Film, FolderOpen, LoaderCircle, Trash2 } from 'lucide-react'

const CLOUD_NAME = 'fww3cli3'
const UPLOAD_PRESET = 'vestra_student_uploads'
const MAX_FILE_SIZE = 50 * 1024 * 1024

export default function ProjectsSection({ onNotice }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const fileInputs = useRef({})

  const loadProjects = async () => {
    if (!user || !db) return
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

  const uploadFiles = async (project, files) => {
    const selected = Array.from(files || [])
    if (!selected.length) return
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
    if (!window.confirm('هل تريد إزالة الملف من قائمة المشروع؟ لن يُحذف الملف الأصلي من Cloudinary.')) return
    try {
      const remaining = (project.assets || []).filter(item => item.assetId !== asset.assetId)
      await updateDoc(doc(db, 'projects', project.id), { assets: remaining, updatedAt: serverTimestamp() })
      await loadProjects()
      onNotice?.('تمت إزالة مرجع الملف من المشروع.')
    } catch (err) {
      setError('تعذر تحديث بيانات المشروع.')
    }
  }

  return (
    <section className="section-block projects-workspace" id="projects">
      <div className="section-heading">
        <div><div className="section-kicker">YOUR IDEAS, YOUR SPACE</div><h2>مشروعاتي وملفاتي</h2><p>ارفع صورك وفيديوهاتك واحفظ روابطها داخل كل مشروع.</p></div>
        <span className="roadmap-count">{projects.length} مشروع</span>
      </div>
      {error && <div className="projects-error" role="alert">{error}</div>}
      {loading ? <div className="projects-empty"><LoaderCircle className="spin" size={20} /> جارٍ تحميل المشروعات...</div> :
        projects.length === 0 ? <div className="projects-empty"><FolderOpen size={27} /><strong>لسه مفيش مشروعات</strong><span>أنشئ مشروعك الأول من زر «ابدأ مشروعاً جديداً» أعلى الصفحة.</span></div> :
        <div className="projects-grid">{projects.map(project => {
          const assets = project.assets || []
          return <article className="project-card" key={project.id}>
            <div className="project-card-head"><div className="project-card-icon"><FolderOpen size={19} /></div><div><h3>{project.name}</h3><span>{project.discipline || 'مشروع عام'} • {assets.length} ملف</span></div></div>
            <input ref={node => { fileInputs.current[project.id] = node }} type="file" accept="image/*,video/*" multiple hidden onChange={event => uploadFiles(project, event.target.files)} />
            <button className="project-upload-btn" disabled={busy === project.id} onClick={() => fileInputs.current[project.id]?.click()}>
              {busy === project.id ? <LoaderCircle className="spin" size={17} /> : <CloudUpload size={17} />}
              {busy === project.id ? 'جارٍ الرفع...' : 'رفع صور أو فيديوهات'}
            </button>
            {assets.length > 0 && <div className="project-assets">{assets.map(asset => <div className="project-asset" key={asset.assetId}>
              <a href={asset.url} target="_blank" rel="noreferrer" className="project-asset-preview">
                {asset.resourceType === 'video' ? <><Film size={23} /><small>فيديو</small></> : <img src={asset.url} alt={asset.originalName} loading="lazy" />}
              </a>
              <div className="project-asset-info"><span>{asset.originalName}</span><small>{asset.format?.toUpperCase()} • {Math.max(1, Math.round(asset.bytes / 1024))} KB</small></div>
              <button className="project-asset-remove" title="إزالة من المشروع" onClick={() => removeAssetRecord(project, asset)}><Trash2 size={15} /></button>
            </div>)}</div>}
          </article>
        })}</div>}
      <p className="projects-note"><FileImage size={14} /> الملفات محفوظة على Cloudinary، وبياناتها وروابطها محفوظة في Firestore.</p>
    </section>
  )
}
