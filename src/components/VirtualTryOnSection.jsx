import { useEffect, useRef, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Camera, Check, ImagePlus, LoaderCircle, Play, Save, Shirt, Sparkles, Square } from 'lucide-react'

const looks = [
  { id: 'linen', name: 'إطلالة الكتان', type: 'طبيعي · صيفي', color: '#c6b89b', accent: '#65765b', prompt: 'Substitute the current outfit with a relaxed natural linen summer outfit in warm beige tones.' },
  { id: 'urban', name: 'إطلالة حضرية', type: 'معاصر · يومي', color: '#414c5c', accent: '#d2a47f', prompt: 'Substitute the current outfit with a modern charcoal streetwear look with clean minimal lines.' },
  { id: 'classic', name: 'إطلالة كلاسيكية', type: 'رسمي · هادئ', color: '#273b35', accent: '#c5b38d', prompt: 'Substitute the current outfit with a tailored deep green classic outfit with a refined fit.' },
  { id: 'creative', name: 'إطلالة فنية', type: 'جريء · تجريبي', color: '#a35e50', accent: '#e0c77e', prompt: 'Substitute the current outfit with an artistic statement look in terracotta and muted gold.' },
]

const MAX_GARMENT_SIZE = 10 * 1024 * 1024

export default function VirtualTryOnSection({ user, onNotice }) {
  const [garment, setGarment] = useState(null)
  const [garmentPreview, setGarmentPreview] = useState('')
  const [look, setLook] = useState(looks[0])
  const [prompt, setPrompt] = useState(looks[0].prompt)
  const [history, setHistory] = useState([])
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const garmentInput = useRef(null)
  const localVideo = useRef(null)
  const outputVideo = useRef(null)
  const streamRef = useRef(null)
  const clientRef = useRef(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!user?.uid || !db) return
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (alive) setHistory(snap.exists() ? (snap.data().tryOnSessions || []) : [])
      } catch (e) { console.error('Try-on history load failed:', e) }
    }
    load()
    return () => { alive = false }
  }, [user?.uid])

  useEffect(() => () => {
    if (garmentPreview.startsWith('blob:')) URL.revokeObjectURL(garmentPreview)
  }, [garmentPreview])

  const stopSession = () => {
    try { clientRef.current?.disconnect?.() } catch (e) { console.warn('Decart disconnect:', e) }
    clientRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (localVideo.current) localVideo.current.srcObject = null
    if (outputVideo.current) outputVideo.current.srcObject = null
    setStatus('idle')
  }

  useEffect(() => () => {
    try { clientRef.current?.disconnect?.() } catch {}
    streamRef.current?.getTracks().forEach(track => track.stop())
  }, [])

  const chooseGarment = event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('اختر صورة للقطعة بصيغة مدعومة.'); return }
    if (file.size > MAX_GARMENT_SIZE) { setError('حجم صورة القطعة يجب ألا يتجاوز 10 ميجابايت.'); return }
    setGarment(file)
    setGarmentPreview(URL.createObjectURL(file))
    setError('')
  }

  const startSession = async () => {
    if (!user?.uid || !garment || !consent) return
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('الكاميرا تحتاج إلى اتصال آمن HTTPS ومتصفح يدعم الوصول للكاميرا.')
      return
    }
    setError('')
    setStatus('camera')
    try {
      const { createDecartClient, models } = await import('@decartai/sdk')
      const model = models.realtime('lucy-vton-latest')
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', frameRate: model.fps, width: model.width, height: model.height },
      })
      streamRef.current = cameraStream
      if (localVideo.current) {
        localVideo.current.srcObject = cameraStream
        await localVideo.current.play().catch(() => {})
      }

      const client = createDecartClient({
        apiKeyProvider: async () => {
          const idToken = await user.getIdToken()
          const response = await fetch('/api/realtime-token', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
          })
          const payload = await response.json().catch(() => ({}))
          if (!response.ok || !payload.apiKey) throw new Error(payload.error || 'تعذر تأمين جلسة التجربة الافتراضية.')
          return payload.apiKey
        },
      })

      setStatus('connecting')
      const realtimeClient = await client.realtime.connect(cameraStream, {
        model,
        onRemoteStream: async remoteStream => {
          if (outputVideo.current) {
            outputVideo.current.srcObject = remoteStream
            await outputVideo.current.play().catch(() => {})
          }
        },
        onCapacityWait: ({ retryAfterMs }) => setStatus(`waiting:${Math.ceil(retryAfterMs / 1000)}`),
      })
      clientRef.current = realtimeClient
      setStatus('applying')
      await realtimeClient.setImage(garment, { prompt: prompt.trim() || look.prompt, enhance: true })
      setStatus('active')
      onNotice?.('بدأت جلسة التجربة الافتراضية المباشرة.')
    } catch (e) {
      console.error('Virtual try-on failed:', e)
      setError(e.message || 'تعذر بدء التجربة. تحقق من إعداد Decart ورصيد الحساب.')
      stopSession()
    }
  }

  const saveSession = async () => {
    if (!user?.uid || !db || status !== 'active') return
    setSaving(true)
    try {
      const item = {
        id: `tryon-${Date.now()}`,
        garmentName: garment?.name || 'قطعة ملابس',
        lookId: look.id,
        lookName: look.name,
        prompt: prompt.trim() || look.prompt,
        createdAt: new Date().toISOString(),
        mode: 'decart-realtime',
      }
      const next = [item, ...history].slice(0, 20)
      await setDoc(doc(db, 'users', user.uid), { uid: user.uid, tryOnSessions: next, updatedAt: serverTimestamp() }, { merge: true })
      setHistory(next)
      onNotice?.('تم حفظ تفاصيل جلسة التجربة في حسابك.')
    } catch (e) {
      setError('تعذر حفظ تفاصيل الجلسة. حاول مرة أخرى.')
    } finally { setSaving(false) }
  }

  return <section className="section-block tryon-section">
    <div className="section-heading"><div><div className="section-kicker">CAMERA · RESTYLE · EXPERIENCE</div><h2>استوديو التجربة الافتراضية</h2><p>اختر صورة قطعة الملابس وشاهد تجربة تنسيقها مباشرة على بث الكاميرا.</p></div></div>
    <div className="tryon-notice"><Sparkles size={17}/><span><strong>قبل البدء:</strong> سيتم إرسال بث الكاميرا وصورة قطعة الملابس إلى Decart لمعالجتهما مباشرة. قد تستهلك الجلسة رصيداً مدفوعاً بحسب مدة الاستخدام. لا تبدأ الكاميرا إلا بعد موافقتك.</span></div>
    <div className="tryon-layout">
      <div className="tryon-photo-panel">
        <input ref={garmentInput} className="visually-hidden" type="file" accept="image/*" onChange={chooseGarment}/>
        {garmentPreview ? <img className="tryon-garment-preview" src={garmentPreview} alt="صورة قطعة الملابس"/> : <div className="tryon-photo-empty"><Shirt size={30}/><strong>أضف صورة قطعة الملابس</strong><span>يفضل صورة واضحة للقطعة وحدها وخلفية بسيطة</span></div>}
        <button className="tryon-upload" onClick={() => garmentInput.current?.click()} disabled={status !== 'idle'}><ImagePlus size={16}/> {garment ? 'تغيير قطعة الملابس' : 'اختيار صورة القطعة'}</button>
        {garment && <small>{garment.name}</small>}
      </div>
      <div className="tryon-options">
        <div className="tryon-title"><Shirt size={18}/><strong>اختر اتجاه الإطلالة</strong></div>
        <div className="tryon-looks">{looks.map(item => <button key={item.id} className={look.id === item.id ? 'selected' : ''} onClick={() => { setLook(item); setPrompt(item.prompt) }} disabled={status !== 'idle'}><span className="tryon-look-swatch" style={{ background: `linear-gradient(135deg,${item.color} 0 58%,${item.accent} 58%)` }}/><strong>{item.name}</strong><small>{item.type}</small>{look.id === item.id && <Check size={15}/>}</button>)}</div>
        <label className="tryon-prompt-label">وصف التعديل<input value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={300} disabled={status !== 'idle'} placeholder="صف اللون والخامة والقصة المطلوبة..."/></label>
        <label className="tryon-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={status !== 'idle'}/> أوافق على مشاركة بث الكاميرا وصورة القطعة مع Decart لمعالجة التجربة المباشرة، وأفهم أن الاستخدام قد يستهلك رصيداً.</label>
        {status === 'idle' ? <button className="tryon-save tryon-start" onClick={startSession} disabled={!garment || !consent}><Play size={16}/> ابدأ التجربة المباشرة</button> : <div className="tryon-session-actions"><span><LoaderCircle size={15} className={status === 'active' ? '' : 'spin'}/>{status === 'camera' ? 'في انتظار إذن الكاميرا...' : status === 'connecting' ? 'جارٍ الاتصال بمحرك التجربة...' : status === 'applying' ? 'جارٍ تطبيق قطعة الملابس...' : status === 'active' ? 'التجربة المباشرة تعمل' : status.startsWith('waiting:') ? `الخدمة مشغولة، إعادة المحاولة خلال ${status.split(':')[1]} ثانية` : 'الجلسة تعمل'}</span><button onClick={stopSession}><Square size={14}/> إيقاف التجربة</button></div>}
        {status === 'active' && <button className="tryon-history-save" onClick={saveSession} disabled={saving}><Save size={15}/>{saving ? 'جارٍ الحفظ...' : 'حفظ تفاصيل الجلسة'}</button>}
        {error && <p className="materials-error" role="alert">{error}</p>}
      </div>
    </div>
    <div className="tryon-video-grid">
      <div><strong><Camera size={15}/> الكاميرا الأصلية</strong><video ref={localVideo} autoPlay muted playsInline/></div>
      <div><strong><Sparkles size={15}/> نتيجة التجربة المباشرة</strong><video ref={outputVideo} autoPlay muted playsInline/></div>
    </div>
    <div className="tryon-history"><strong>جلساتك المحفوظة</strong>{history.length ? history.map(item => <div key={item.id}><span>{item.lookName}</span><small>{item.garmentName || item.photoName || 'جلسة تنسيق'}</small></div>) : <p>لم تحفظ جلسات بعد.</p>}</div>
  </section>
}
