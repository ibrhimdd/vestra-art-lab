import { useEffect, useRef, useState } from 'react'
import { Activity, ImagePlus, LoaderCircle, ScanSearch, UploadCloud, BrainCircuit } from 'lucide-react'

const MAX_SIZE = 12 * 1024 * 1024
export default function DesignAnalyzerSection({ user, onNotice }) {
  const [preview, setPreview] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [field, setField] = useState('غير محدد')
  const [brief, setBrief] = useState('')
  const [aiReview, setAiReview] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const analyze = file => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('اختر صورة تصميم بصيغة مدعومة.'); return }
    if (file.size > MAX_SIZE) { setError('حجم الصورة يجب ألا يتجاوز 12 ميجابايت.'); return }
    const url = URL.createObjectURL(file)
    setPreview(url); setAnalysis(null); setAiReview(''); setError(''); setBusy(true)
    const image = new Image()
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, 240 / Math.max(image.naturalWidth, image.naturalHeight))
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('Canvas unavailable')
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
        let r=0,g=0,b=0,luma=0,count=0,min=255,max=0
        const buckets = new Map()
        for(let i=0;i<data.length;i+=16){
          const rr=data[i],gg=data[i+1],bb=data[i+2]
          r+=rr;g+=gg;b+=bb
          const y=.2126*rr+.7152*gg+.0722*bb
          luma+=y;min=Math.min(min,y);max=Math.max(max,y);count++
          const key=[Math.round(rr/32)*32,Math.round(gg/32)*32,Math.round(bb/32)*32].map(v=>Math.min(255,v))
          const k=key.join(',')
          buckets.set(k,(buckets.get(k)||0)+1)
        }
        const avg=[Math.round(r/count),Math.round(g/count),Math.round(b/count)]
        const colors=[...buckets.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k])=>'#'+k.split(',').map(v=>Number(v).toString(16).padStart(2,'0')).join('').toUpperCase())
        const brightness=Math.round(luma/count)
        const range=Math.round(max-min)
        const ratio=(image.naturalWidth/image.naturalHeight).toFixed(2)
        const notes=[]
        notes.push(brightness<90?'الصورة داكنة نسبياً؛ راجع وضوح التفاصيل في المناطق الظليلة.':brightness>190?'الصورة شديدة الإضاءة؛ انتبه لاحتمال فقدان بعض التفاصيل.':'مستوى الإضاءة العام متوسط ومناسب لمراجعة التفاصيل.')
        notes.push(range<70?'التباين اللوني منخفض؛ جرّب إضافة عنصر أكثر بروزاً.':range>170?'التباين مرتفع؛ راجع توازن العناصر حتى لا تتنافس بصرياً.':'هناك تباين ملحوظ يساعد على فصل العناصر.')
        notes.push(image.naturalWidth>=image.naturalHeight?'التكوين أفقي أو مربع؛ راجع توزيع الوزن البصري بين الجانبين.':'التكوين رأسي؛ راجع نقطة التركيز ومسار العين من أعلى لأسفل.')
        setAnalysis({width:image.naturalWidth,height:image.naturalHeight,ratio,brightness,contrast:range,colors,notes,average:'rgb('+avg.join(', ')+')'})
        onNotice?.('اكتمل الفحص البصري الأولي للصورة.')
      } catch(e){ setError('تعذر تحليل الصورة على هذا المتصفح.') }
      finally { setBusy(false) }
    }
    image.onerror=()=>{setError('تعذر فتح الصورة.');setBusy(false)}
    image.src=url
  }

  const requestReview = async () => {
    if (!analysis || !user?.getIdToken) {
      setError('سجّل الدخول وأنشئ فحصاً للصورة أولاً.')
      return
    }
    setAiBusy(true); setError(''); setAiReview('')
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/creative-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mode: 'critique', field, brief,
          metrics: {
            dimensions: `${analysis.width}×${analysis.height}`,
            ratio: analysis.ratio,
            brightness: analysis.brightness,
            contrast: analysis.contrast,
            colors: analysis.colors,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'تعذر إنشاء المراجعة.')
      setAiReview(data.text)
      onNotice?.('اكتملت المراجعة الإرشادية بالذكاء الاصطناعي.')
    } catch (err) {
      setError(err.message || 'تعذر الاتصال بالمساعد الذكي.')
    } finally { setAiBusy(false) }
  }

  return <section className="section-block analyzer-section">
    <div className="section-heading"><div><div className="section-kicker">OBSERVE · MEASURE · REFINE</div><h2>محلل التصميم</h2><p>ارفع صورة عملك للحصول على قراءة أولية للألوان والإضاءة والتباين ونسبة الأبعاد، ثم اطلب مراجعة إرشادية ذكية.</p></div></div>
    <div className="analyzer-layout">
      <div className="analyzer-upload">
        <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" onChange={e=>analyze(e.target.files?.[0])}/>
        {preview?<img src={preview} alt="التصميم المراد تحليله"/>:<div className="analyzer-drop"><ImagePlus size={30}/><strong>أضف صورة التصميم</strong><span>PNG · JPG · WEBP / حتى 12MB</span></div>}
        <button onClick={()=>inputRef.current?.click()} disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>:<UploadCloud size={16}/>} {busy?'جارٍ الفحص...':'اختيار صورة'}</button>
        {error&&<p className="materials-error" role="alert">{error}</p>}
      </div>
      <div className="analyzer-report">
        {analysis?<>
          <div className="analyzer-report-head"><ScanSearch size={18}/><strong>نتيجة الفحص البصري</strong><span>LOCAL ANALYSIS</span></div>
          <div className="analyzer-metrics"><div><strong>{analysis.width}×{analysis.height}</strong><span>أبعاد الصورة</span></div><div><strong>{analysis.ratio}</strong><span>نسبة العرض للارتفاع</span></div><div><strong>{analysis.brightness}/255</strong><span>متوسط الإضاءة</span></div><div><strong>{analysis.contrast}/255</strong><span>مدى التباين</span></div></div>
          <div className="analyzer-colors"><strong>الألوان الأكثر ظهوراً</strong><div>{analysis.colors.map(color=><span key={color} title={color} style={{background:color}}/>)}</div></div>
          <div className="analyzer-notes"><strong>ملاحظات قابلة للتجربة</strong>{analysis.notes.map(note=><p key={note}><Activity size={14}/>{note}</p>)}</div>
          <div className="analyzer-ai-panel">
            <div className="analyzer-ai-heading"><BrainCircuit size={18}/><strong>مراجعة إبداعية ذكية</strong><span>AI REVIEW</span></div>
            <label>المجال الفني<select value={field} onChange={e=>setField(e.target.value)}><option>غير محدد</option><option>الملابس والنسيج</option><option>التربية الفنية</option><option>التصميم الرقمي</option><option>الفنون الزخرفية</option></select></label>
            <label>اشرح فكرتك أو هدف التصميم<textarea rows="3" value={brief} onChange={e=>setBrief(e.target.value)} placeholder="ما الفكرة التي تريد إيصالها؟ وما الجمهور أو الاستخدام المستهدف؟"/></label>
            <button onClick={requestReview} disabled={aiBusy}><BrainCircuit size={16}/>{aiBusy?'جارٍ إعداد المراجعة...':'اطلب مراجعة الذكاء الاصطناعي'}</button>
            {aiReview && <div className="analyzer-ai-output" dir="auto">{aiReview}</div>}
            <small>المراجعة تستخدم القياسات والوصف النصي فقط؛ لا نرسل صورة التصميم إلى مزود AI.</small>
          </div>
          <small>الفحص التقني يقيس خصائص الصورة، ولا يمثل وحده حكماً فنياً على جودة العمل.</small>
        </>:<div className="analyzer-empty"><ScanSearch size={28}/><strong>تقرير التصميم سيظهر هنا</strong><span>التحليل يتم داخل متصفحك ولا يتم رفع الصورة إلى خادم.</span></div>}
      </div>
    </div>
  </section>
}
