import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './lib/firebase'
import { useAuth } from './lib/AuthContext'
import AuthScreen from './components/AuthScreen'
import ProjectsSection from './components/ProjectsSection'
import MoodboardSection from './components/MoodboardSection'
import ProfileSection from './components/ProfileSection'
import {
  Activity, ArrowLeft, ArrowUpLeft, Bell, BookOpen, Bot, Check,
  ChevronDown, ChevronLeft, CircleHelp, CloudUpload, Compass,
  FileImage, FolderKanban, Gem, GraduationCap, Grid2X2, Layers3,
  Lightbulb, Menu, Palette, Plus, Search, Settings2, Shapes,
  Sparkles, SwatchBook, WandSparkles, X, LogOut
} from 'lucide-react'

const disciplines = [
  { id: 'fashion', title: 'الملابس والنسيج', en: 'FASHION & TEXTILE', desc: 'ابتكر الأزياء، جرّب الألوان والنقوش، واستكشف تنسيقات جديدة.', icon: SwatchBook, tone: 'mint', count: '04 أدوات' },
  { id: 'art', title: 'التربية الفنية', en: 'FINE ARTS', desc: 'حوّل أفكارك إلى تكوينات ورسومات وتجارب بصرية.', icon: Palette, tone: 'peach', count: '06 أدوات' },
  { id: 'digital', title: 'التصميم الرقمي', en: 'DIGITAL DESIGN', desc: 'صمّم الملصقات والهويات البصرية والمحتوى الإبداعي.', icon: Layers3, tone: 'lavender', count: '05 أدوات' },
  { id: 'decor', title: 'الفنون الزخرفية', en: 'DECORATIVE ARTS', desc: 'أنشئ وحدات زخرفية وأنماطاً وتكرارات فنية.', icon: Shapes, tone: 'blue', count: '04 أدوات' },
]

const tools = [
  { title: 'مولّد الأفكار', desc: 'حوّل وصفك إلى اتجاهات إبداعية أولية.', icon: WandSparkles, tag: 'ذكاء اصطناعي', status: 'قريباً' },
  { title: 'محلل التصميم', desc: 'احصل على ملاحظات حول التكوين والألوان.', icon: Activity, tag: 'تحليل ذكي', status: 'قريباً' },
  { title: 'لوحة الإلهام', desc: 'اجمع المراجع والألوان والصور في مساحة واحدة.', icon: Grid2X2, tag: 'تنظيم بصري', status: 'متاح الآن' },
  { title: 'مكتبة الخامات', desc: 'استكشف الخامات والأنسجة والنقوش.', icon: SwatchBook, tag: 'مكتبة فنية', status: 'قيد التخطيط' },
  { title: 'استوديو الألوان', desc: 'كوّن لوحات لونية واحفظ تركيباتك.', icon: Palette, tag: 'تصميم', status: 'قيد التخطيط' },
  { title: 'التجربة الافتراضية', desc: 'جرّب تنسيقات الملابس على صورتك أو بالكاميرا.', icon: Sparkles, tag: 'تجربة تفاعلية', status: 'ضمن الخطة' },
]

const roadmap = [
  { n: '01', title: 'تأسيس المختبر والحسابات', desc: 'الهوية والواجهة العربية والتسجيل والدخول والملف الشخصي.', state: 'مكتمل', done: true },
  { n: '02', title: 'إدارة المشروعات', desc: 'إنشاء المشروعات وتعديلها وحذفها وحفظ بياناتها في Firestore.', state: 'مكتمل', done: true },
  { n: '03', title: 'معرض الوسائط والملفات', desc: 'رفع الصور والفيديوهات ومعاينتها وتصنيفها والبحث والتنزيل.', state: 'مكتمل', done: true },
  { n: '04', title: 'معمل التصميم', desc: 'بدأنا بلوحة الإلهام، تليها استوديو الألوان ومكتبة الخامات.', state: 'جاري التنفيذ', active: true },
  { n: '05', title: 'مساعد الذكاء الاصطناعي', desc: 'توليد الأفكار والتصميمات وتحليلها عبر مزود قابل للتبديل.', state: 'مخطط' },
  { n: '06', title: 'أدوات المجالات الفنية', desc: 'أدوات متخصصة للملابس والتربية الفنية والتصميم الرقمي والزخرفة.', state: 'مخطط' },
  { n: '07', title: 'التجربة الافتراضية', desc: 'دمج تجربة الملابس وتوثيق نتائجها داخل المشروع.', state: 'مخطط' },
  { n: '08', title: 'التقييم والتحليلات', desc: 'التقييم الفني والاختبارات ومؤشرات الانخراط والتقارير.', state: 'مخطط' },
  { n: '09', title: 'الإدارة والإطلاق', desc: 'الصلاحيات والأمان والاختبارات وتحسين الأداء والنشر.', state: 'مخطط' },
]

function App() {
  const [active, setActive] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedDiscipline, setSelectedDiscipline] = useState('')
  const [projectName, setProjectName] = useState('')
  const [showProject, setShowProject] = useState(false)
  const [notice, setNotice] = useState('')
  const { user, loading, logout } = useAuth()

  if (loading) return <div className="auth-loading">جارٍ تحميل مساحة VESTRA...</div>
  if (!user) return <AuthScreen />

  const nav = [
    { id: 'overview', label: 'نظرة عامة', icon: Compass },
    { id: 'disciplines', label: 'المجالات الفنية', icon: Shapes },
    { id: 'tools', label: 'أدوات المختبر', icon: WandSparkles },
    { id: 'moodboard', label: 'لوحة الإلهام', icon: Grid2X2 },
    { id: 'projects', label: 'مشروعاتي', icon: FolderKanban },
    { id: 'roadmap', label: 'خطة التطوير', icon: BookOpen },
  ]

  const goTo = (id) => {
    setActive(id)
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const createProject = async (event) => {
    event.preventDefault()
    if (!projectName.trim() || !user || !db) return
    try {
      await addDoc(collection(db, 'projects'), {
        ownerId: user.uid,
        name: projectName.trim(),
        discipline: selectedDiscipline || 'general',
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setNotice('تم حفظ مشروعك في Firestore بنجاح.')
      setProjectName('')
      setShowProject(false)
    } catch (error) {
      console.error('Project save failed:', {
        code: error?.code || 'unknown',
        message: error?.message || String(error),
        name: error?.name || 'Error',
      })
      const errorCode = error?.code || 'unknown'
      const errorMessages = {
        'permission-denied': 'قواعد Firestore رفضت إنشاء المشروع (permission-denied).',
        'unauthenticated': 'انتهت جلسة تسجيل الدخول. سجّل الدخول مرة أخرى.',
        'unavailable': 'خدمة Firestore غير متاحة حالياً. تحقق من الإنترنت وحاول مجدداً.',
        'failed-precondition': 'قاعدة Firestore تحتاج إلى إعداد أو تهيئة إضافية (failed-precondition).',
        'resource-exhausted': 'تم تجاوز حد الاستخدام المتاح في Firebase (resource-exhausted).',
      }
      setNotice(errorMessages[errorCode] || `فشل حفظ المشروع. كود الخطأ: ${errorCode}. ${error?.message || 'راجع سجل الأخطاء.'}`)
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><span>V</span><i /></div>
          <div><strong>VESTRA</strong><small>ART LAB <b>•</b> CREATIVE SPACE</small></div>
          <button className="mobile-close icon-btn" onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة"><X size={19} /></button>
        </div>
        <div className="side-label">مساحة العمل</div>
        <nav className="side-nav">
          {nav.map(item => {
            const Icon = item.icon
            return <button key={item.id} className={active === item.id ? 'nav-item active' : 'nav-item'} onClick={() => goTo(item.id)}><Icon size={18} /><span>{item.label}</span>{active === item.id && <i />}</button>
          })}
        </nav>
        <div className="side-divider" />
        <div className="side-label">حسابك</div>
        <button className="nav-item" onClick={() => goTo('profile')}><GraduationCap size={18} /><span>ملفي الشخصي</span></button>
        <button className="nav-item" onClick={() => setNotice('سيتم إعداد الإعدادات بعد ربط الخدمات.')}><Settings2 size={18} /><span>الإعدادات</span></button>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><CircleHelp size={18} /></div><strong>مساحة للإبداع بلا حدود</strong><p>ابدأ بفكرة صغيرة، وطورها خطوة بخطوة.</p><span>اكتشف المختبر <ArrowLeft size={13} /></span></div>
          <div className="profile-mini"><div className="avatar">{(user.displayName || user.email || 'ط').slice(0, 1).toUpperCase()}</div><div><strong>{user.displayName || 'مساحة الطالب'}</strong><small>{user.email}</small></div><button className="profile-logout" onClick={() => logout()} aria-label="تسجيل الخروج"><LogOut size={15} /></button></div>
        </div>
      </aside>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة" />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-right">
            <button className="icon-btn mobile-menu" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة"><Menu size={20} /></button>
            <div className="breadcrumb">المختبر <ChevronLeft size={14} /> <span>نظرة عامة</span></div>
          </div>
          <div className="topbar-left">
            <div className="search-box"><Search size={16} /><input placeholder="ابحث في المختبر..." aria-label="ابحث في المختبر" /><kbd>⌘ K</kbd></div>
            <button className="icon-btn notification-btn" onClick={() => setNotice('لا توجد إشعارات جديدة حالياً.')} aria-label="الإشعارات"><Bell size={18} /><i /></button>
            <div className="top-avatar">{(user.displayName || user.email || 'V').slice(0, 1).toUpperCase()}</div><button className="icon-btn logout-btn" onClick={() => logout()} aria-label="تسجيل الخروج" title="تسجيل الخروج"><LogOut size={17} /></button>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row" id="overview">
            <div><div className="eyebrow"><span className="live-dot" /> مساحة الإبداع الرقمي <span className="eyebrow-en">CREATIVE LAB / 001</span></div><h1>أهلاً بك في عالم <em>الإبداع.</em></h1><p>مساحتك لاكتشاف الأفكار، وتجربة التصميم، وتحويل الخيال إلى أعمال فنية.</p></div>
            <button className="primary-btn" onClick={() => setShowProject(true)}><Plus size={17} /> ابدأ مشروعاً جديداً</button>
          </section>

          <section className="hero-banner">
            <div className="hero-copy"><div className="hero-kicker"><Sparkles size={14} /> THE FUTURE IS CREATIVE</div><h2>فكرتك هي البداية.<br /><span>والإبداع هو المساحة.</span></h2><p>اكتشف أدوات فنية ذكية تساعدك على التفكير، والتجريب، وصناعة شيء يحمل بصمتك.</p><button className="hero-btn" onClick={() => goTo('disciplines')}>استكشف المجالات <ArrowUpLeft size={16} /></button></div>
            <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-disc"><div className="disc-inner"><span>V</span></div></div><div className="art-card art-card-one"><Palette size={19} /><span>COLOR / FORM</span></div><div className="art-card art-card-two"><Shapes size={19} /><span>IDEAS IN MOTION</span></div><div className="art-spark">✳</div><div className="art-caption">DESIGN YOUR<br />OWN UNIVERSE</div></div>
            <div className="hero-index">01 <span>/</span> 06</div>
          </section>

          <section className="stats-grid">
            <div className="stat-card"><div className="stat-icon mint"><GraduationCap size={19} /></div><div><strong>04</strong><span>مجالات فنية</span></div><small>تخصصات متنوعة</small></div>
            <div className="stat-card"><div className="stat-icon peach"><WandSparkles size={19} /></div><div><strong>06</strong><span>أدوات مخططة</span></div><small>تتوسع مع الوقت</small></div>
            <div className="stat-card"><div className="stat-icon lavender"><FolderKanban size={19} /></div><div><strong>∞</strong><span>أفكار ومشروعات</span></div><small>مساحة مفتوحة للإبداع</small></div>
            <div className="stat-card progress-stat"><div className="stat-icon blue"><Activity size={19} /></div><div><strong>04 <small>/ 09</small></strong><span>معمل التصميم</span></div><small className="progress-line"><i /></small></div>
          </section>

          <section className="section-block" id="disciplines">
            <div className="section-heading"><div><div className="section-kicker">EXPLORE YOUR FIELD</div><h2>اختر مجال إبداعك</h2><p>كل مجال يفتح لك مجموعة مختلفة من الأدوات والتجارب.</p></div><button className="text-link" onClick={() => setNotice('سيتم تفعيل صفحات المجالات بالتدريج.')}>كل المجالات <ArrowLeft size={15} /></button></div>
            <div className="discipline-grid">{disciplines.map((d, i) => { const Icon = d.icon; return <button key={d.id} className={`discipline-card ${d.tone} ${selectedDiscipline === d.id ? 'chosen' : ''}`} onClick={() => { setSelectedDiscipline(d.id); setNotice(`اخترت مجال ${d.title}. سيتم فتح أدواته عند تنفيذ المرحلة الخاصة به.`) }}><div className="discipline-top"><div className="discipline-icon"><Icon size={22} /></div><span className="discipline-number">0{i + 1}</span></div><div className="discipline-en">{d.en}</div><h3>{d.title}</h3><p>{d.desc}</p><div className="discipline-foot"><span>{d.count}</span><span className="round-arrow"><ArrowUpLeft size={16} /></span></div></button> })}</div>
          </section>

          <section className="section-block tools-section" id="tools">
            <div className="section-heading"><div><div className="section-kicker">YOUR CREATIVE TOOLKIT</div><h2>أدوات المختبر</h2><p>مجموعة أدوات هتساعدك في كل خطوة من الفكرة إلى التنفيذ.</p></div><span className="planned-label"><span /> أدوات ضمن خطة التطوير</span></div>
            <div className="tools-grid">{tools.map((tool, i) => { const Icon = tool.icon; const available = tool.title === 'لوحة الإلهام'; return <article className={`tool-card ${available ? 'tool-card-available' : ''}`} key={tool.title}><div className="tool-icon"><Icon size={20} /></div><div className="tool-tag">{tool.tag}</div><h3>{tool.title}</h3><p>{tool.desc}</p><div className="tool-bottom"><span className={available ? 'tool-status tool-status-live' : 'tool-status'}>{tool.status}</span>{available ? <button className="tool-launch" onClick={() => goTo('moodboard')}>فتح الأداة <ArrowUpLeft size={13} /></button> : <span className="tool-number">0{i + 1}</span>}</div></article> })}</div>
          </section>

          <MoodboardSection user={user} onNotice={setNotice} />

          <ProfileSection onNotice={setNotice} />

          <ProjectsSection onNotice={setNotice} />

          <section className="section-block roadmap-section" id="roadmap"><div className="section-heading"><div><div className="section-kicker">FROM IDEA TO REALITY</div><h2>رحلة بناء المختبر</h2><p>خطة واضحة للمراحل والوظائف التي سننفذها بالترتيب.</p></div><span className="roadmap-count">09 مراحل رئيسية</span></div><div className="roadmap-list">{roadmap.map((step, i) => <div className={`roadmap-item ${step.active ? 'current' : ''} ${step.done ? 'completed' : ''}`} key={step.n}><div className="roadmap-marker">{step.active || step.done ? <Check size={16} /> : step.n}</div><div className="roadmap-copy"><h3>{step.title}</h3><p>{step.desc}</p></div><span className="roadmap-state">{step.state}</span>{i !== roadmap.length - 1 && <div className="roadmap-connector" />}</div>)}</div></section>

          <footer className="footer"><div className="footer-brand"><span>VESTRA</span> ART LAB</div><p>مساحة جامعية للإبداع والتجريب والتعلم الذكي.</p><span>BUILT FOR CREATIVITY <b>✳</b> 2026</span></footer>
        </div>
      </main>

      {notice && <div className="toast" role="status"><Sparkles size={17} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="إغلاق"><X size={16} /></button></div>}

      {showProject && <div className="modal-backdrop" onClick={() => setShowProject(false)}><form className="project-modal" onSubmit={createProject} onClick={e => e.stopPropagation()}><button type="button" className="modal-close icon-btn" onClick={() => setShowProject(false)} aria-label="إغلاق"><X size={19} /></button><div className="modal-icon"><Plus size={22} /></div><div className="section-kicker">NEW CREATIVE PROJECT</div><h2>ابدأ فكرتك الجديدة</h2><p>اكتب اسماً لمشروعك، وسيتم حفظه في مساحتك الخاصة.</p><label htmlFor="project-name">اسم المشروع</label><input id="project-name" autoFocus value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="مثلاً: مجموعة أزياء مستوحاة من الطبيعة" /><button className="primary-btn modal-submit" type="submit">إنشاء المشروع <ArrowLeft size={16} /></button></form></div>}
    </div>
  )
}

export default App
