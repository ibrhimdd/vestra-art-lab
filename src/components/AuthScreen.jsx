import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { isFirebaseConfigured } from '../lib/firebase'

export default function AuthScreen() {
  const { login, register, resetPassword } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!isFirebaseConfigured) {
      setError('إعداد Firebase غير مكتمل. أضف متغيرات VITE_FIREBASE في ملف .env.local ثم أعد تشغيل المشروع.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'register') await register({ name: name.trim(), email: email.trim(), password })
      else if (mode === 'reset') {
        await resetPassword(email.trim())
        setMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.')
      } else await login(email.trim(), password)
    } catch (err) {
      const messages = {
        'auth/email-already-in-use': 'البريد الإلكتروني مسجل بالفعل. جرّب تسجيل الدخول.',
        'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
        'auth/weak-password': 'كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.',
        'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
        'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني.',
        'auth/too-many-requests': 'محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.',
        'auth/network-request-failed': 'تعذر الاتصال بالإنترنت. تحقق من الاتصال وحاول مرة أخرى.',
      }
      setError(messages[err.code] || 'حدث خطأ أثناء تنفيذ الطلب. راجع إعدادات Firebase وحاول مرة أخرى.')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'register' ? 'أنشئ مساحتك الإبداعية' : mode === 'reset' ? 'استعادة كلمة المرور' : 'مرحباً بعودتك'
  const subtitle = mode === 'register' ? 'ابدأ رحلتك في VESTRA ART LAB.' : mode === 'reset' ? 'سنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور.' : 'سجّل الدخول لمتابعة مشروعاتك وأفكارك.'

  return (
    <main className="auth-screen" dir="rtl">
      <div className="auth-decoration"><span>V</span><i /><b>IDEAS IN MOTION</b></div>
      <section className="auth-card">
        <div className="auth-brand"><div className="brand-mark"><span>V</span><i /></div><div><strong>VESTRA</strong><small>ART LAB • CREATIVE SPACE</small></div></div>
        <div className="auth-kicker"><Sparkles size={14} /> YOUR CREATIVE SPACE</div>
        <h1>{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        {!isFirebaseConfigured && <div className="auth-warning">Firebase لم يتم ربطه بملفات المشروع بعد. أكمل إعداد متغيرات البيئة أولاً.</div>}
        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && <label>الاسم بالكامل<div className="auth-input"><UserRound size={17} /><input value={name} onChange={e => setName(e.target.value)} placeholder="اكتب اسمك" autoComplete="name" required /></div></label>}
          <label>البريد الإلكتروني<div className="auth-input"><Mail size={17} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" required /></div></label>
          {mode !== 'reset' && <label>كلمة المرور<div className="auth-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" minLength={6} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label="إظهار كلمة المرور">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          {message && <div className="auth-success" role="status">{message}</div>}
          <button className="primary-btn auth-submit" type="submit" disabled={busy}>{busy ? 'جارٍ التنفيذ...' : mode === 'register' ? 'إنشاء الحساب' : mode === 'reset' ? 'إرسال رابط الاستعادة' : 'تسجيل الدخول'} <ArrowLeft size={16} /></button>
        </form>
        <div className="auth-links">
          {mode === 'login' && <button onClick={() => { setMode('reset'); setError(''); setMessage('') }}>نسيت كلمة المرور؟</button>}
          {mode !== 'login' && <button onClick={() => { setMode('login'); setError(''); setMessage('') }}>العودة لتسجيل الدخول</button>}
          {mode !== 'reset' && <button onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); setMessage('') }}>{mode === 'register' ? 'لديك حساب؟ تسجيل الدخول' : 'مستخدم جديد؟ أنشئ حساباً'}</button>}
        </div>
        <div className="auth-foot">بيئة تعليمية وإبداعية • VESTRA ART LAB</div>
      </section>
    </main>
  )
}
