import { useEffect, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { db, auth } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { GraduationCap, Save, UserRound, LoaderCircle, Sparkles } from 'lucide-react'

const specialties = [
  { value: 'fashion', label: 'الملابس والنسيج' },
  { value: 'art', label: 'التربية الفنية' },
  { value: 'digital', label: 'التصميم الرقمي' },
  { value: 'decor', label: 'الفنون الزخرفية' },
  { value: 'general', label: 'متعلم متعدد المجالات' },
]

export default function ProfileSection({ onNotice }) {
  const { user } = useAuth()
  const [name, setName] = useState(user?.displayName || '')
  const [specialty, setSpecialty] = useState('general')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadProfile = async () => {
      if (!user || !db) {
        setLoading(false)
        return
      }
      try {
        const snapshot = await getDoc(doc(db, 'users', user.uid))
        if (!active) return
        if (snapshot.exists()) {
          const data = snapshot.data()
          setName(data.displayName || user.displayName || '')
          setSpecialty(data.specialty || 'general')
          setBio(data.bio || '')
        }
      } catch (err) {
        console.error('Profile load failed:', err)
        if (active) setError('تعذر تحميل بيانات الملف الشخصي.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadProfile()
    return () => { active = false }
  }, [user?.uid])

  const saveProfile = async (event) => {
    event.preventDefault()
    if (!user || !db || !name.trim()) return
    setSaving(true)
    setError('')
    try {
      await updateProfile(auth.currentUser, { displayName: name.trim() })
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: name.trim(),
        email: user.email || '',
        specialty,
        bio: bio.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true })
      onNotice?.('تم تحديث ملفك الشخصي بنجاح.')
    } catch (err) {
      console.error('Profile save failed:', err)
      setError('تعذر حفظ التعديلات. تحقق من اتصال Firestore وقواعد الأمان.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="section-block profile-workspace" id="profile">
      <div className="section-heading">
        <div><div className="section-kicker">YOUR CREATIVE IDENTITY</div><h2>ملفي الشخصي</h2><p>عرّفنا باهتماماتك الفنية حتى تكون مساحتك أقرب لطموحك.</p></div>
        <span className="roadmap-count">حساب الطالب</span>
      </div>
      {error && <div className="projects-error" role="alert">{error}</div>}
      {loading ? <div className="projects-empty"><LoaderCircle className="spin" size={20} /> جارٍ تحميل الملف الشخصي...</div> :
        <form className="profile-card" onSubmit={saveProfile}>
          <div className="profile-card-intro">
            <div className="profile-large-avatar"><UserRound size={27} /></div>
            <div><strong>{name || 'مساحتك الإبداعية'}</strong><span>{user?.email}</span></div>
            <div className="profile-spark"><Sparkles size={18} /></div>
          </div>
          <div className="profile-fields">
            <label>الاسم المعروض<input value={name} onChange={event => setName(event.target.value)} required maxLength={70} placeholder="اكتب اسمك" /></label>
            <label>مجالك الفني<select value={specialty} onChange={event => setSpecialty(event.target.value)}>{specialties.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="profile-bio-field">نبذة عنك<textarea value={bio} onChange={event => setBio(event.target.value)} maxLength={300} rows={3} placeholder="اكتب نبذة قصيرة عن اهتماماتك وأهدافك الإبداعية..." /></label>
          </div>
          <div className="profile-card-footer"><span><GraduationCap size={15} /> بياناتك محفوظة في مساحتك الخاصة.</span><button className="primary-btn" type="submit" disabled={saving || !name.trim()}>{saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</button></div>
        </form>}
    </section>
  )
}
