import { useMemo, useState } from 'react'
import { Copy, RefreshCw, Sparkles, WandSparkles } from 'lucide-react'

const directions = {
  'الملابس والنسيج': ['مجموعة أزياء مستوحاة من العمارة الإسلامية', 'تصميم معاصر يعيد توظيف بقايا الأقمشة', 'ملابس يومية مستوحاة من حركة الأمواج'],
  'التربية الفنية': ['تكوين تعبيري عن الذاكرة باستخدام خامات متعددة', 'لوحة تجريدية تستكشف التوازن بين الحركة والسكون', 'عمل فني من وحدات هندسية متكررة'],
  'التصميم الرقمي': ['هوية بصرية لمبادرة بيئية شبابية', 'ملصق رقمي يمزج الخط العربي بالأشكال العضوية', 'حملة بصرية عن المدن المستدامة'],
  'الفنون الزخرفية': ['وحدة زخرفية مستوحاة من أوراق النباتات', 'نمط تكراري يجمع الهندسة والحركة', 'تصميم زخرفي مستلهم من المشربيات'],
}
const styles = ['حديث وبسيط', 'تراثي معاصر', 'تجريبي وجريء', 'طبيعي وعضوي', 'هندسي ومنظم']
const palettes = ['درجات ترابية مع أخضر زيتوني', 'أزرق عميق مع لمسات نحاسية', 'ألوان باستيل هادئة', 'أسود وأبيض مع لون بارز', 'ألوان مستوحاة من الطبيعة']

export default function IdeaGeneratorSection({ onNotice }) {
  const [field, setField] = useState('الملابس والنسيج')
  const [style, setStyle] = useState(styles[0])
  const [topic, setTopic] = useState('')
  const [result, setResult] = useState(null)
  const [seed, setSeed] = useState(0)
  const idea = useMemo(() => {
    if (!result) return null
    const options = directions[field] || directions['التصميم الرقمي']
    const title = options[seed % options.length]
    return { title: topic.trim() ? `${title}: ${topic.trim()}` : title, style, palette: palettes[seed % palettes.length], brief: `ابدأ بجمع 3 مراجع بصرية مرتبطة بالفكرة، ثم جرّب تكوينين مختلفين. اختر خامتين أو عنصرين بصريين، واصنع نموذجاً أولياً يوضح الفكرة قبل تطوير النسخة النهائية.`, steps: ['جمع المراجع والإلهام', 'رسم 3 اسكتشات سريعة', 'اختيار الألوان والخامات', 'تنفيذ نموذج أولي وتقييمه'] }
  }, [result, field, style, topic, seed])
  const generate = () => { setSeed(value => value + 1); setResult(true) }
  const copy = async () => { if (!idea) return; try { await navigator.clipboard.writeText([idea.title, `الأسلوب: ${idea.style}`, `الألوان: ${idea.palette}`, idea.brief, ...idea.steps].join('\n')); onNotice?.('تم نسخ الفكرة وخطة التنفيذ.') } catch { onNotice?.('تعذر النسخ التلقائي على هذا المتصفح.') } }
  return <section className="section-block idea-generator-section"><div className="section-heading"><div><div className="section-kicker">IMAGINE · EXPLORE · DEVELOP</div><h2>مولّد الأفكار الإبداعية</h2><p>كوّن نقطة بداية لمشروعك من خلال المجال والأسلوب والموضوع الذي يهمك.</p></div></div>
    <div className="idea-layout"><div className="idea-controls"><div className="idea-heading"><WandSparkles size={18}/><strong>وجّه الفكرة</strong></div><label>المجال الفني<select value={field} onChange={e => {setField(e.target.value);setResult(null)}}>{Object.keys(directions).map(v => <option key={v}>{v}</option>)}</select></label><label>الأسلوب البصري<select value={style} onChange={e => {setStyle(e.target.value);setResult(null)}}>{styles.map(v => <option key={v}>{v}</option>)}</select></label><label>موضوع أو كلمة مفتاحية<input value={topic} onChange={e => {setTopic(e.target.value);setResult(null)}} placeholder="مثلاً: الاستدامة، البحر، الهوية..."/></label><button className="idea-generate" onClick={generate}><Sparkles size={17}/> ولّد فكرة جديدة</button><small>الأداة تستخدم قوالب إبداعية محلية حالياً، ولا ترسل مدخلاتك إلى خدمة خارجية.</small></div>
      <div className="idea-result">{idea ? <><div className="idea-result-top"><span>CONCEPT / 0{seed}</span><button onClick={copy}><Copy size={15}/> نسخ</button></div><h3>{idea.title}</h3><div className="idea-chips"><span>{field}</span><span>{idea.style}</span></div><div className="idea-palette"><strong>اتجاه الألوان المقترح</strong><p>{idea.palette}</p></div><p className="idea-brief">{idea.brief}</p><strong className="idea-steps-title">خطة البداية</strong><ol>{idea.steps.map(step => <li key={step}>{step}</li>)}</ol><button className="idea-regenerate" onClick={generate}><RefreshCw size={15}/> جرّب اتجاهاً آخر</button></> : <div className="idea-empty"><div><Sparkles size={27}/></div><strong>فكرتك التالية تبدأ من هنا</strong><span>حدد المجال والأسلوب، ثم اضغط «ولّد فكرة جديدة».</span></div>}</div></div>
  </section>
}
