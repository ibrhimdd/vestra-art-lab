import { lazy, Suspense, useEffect, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './lib/firebase'
import { useAuth } from './lib/AuthContext'
import AuthScreen from './components/AuthScreen'
import {
  Activity, ArrowLeft, ArrowUpLeft, Bell, BookOpen, Bot, Check,
  ChevronDown, ChevronLeft, CircleHelp, CloudUpload, Compass,
  FileImage, FolderKanban, Gem, GraduationCap, Grid2X2, Grid3X3, Layers3,
  Lightbulb, Menu, Palette, Plus, Search, Settings2, Shapes,
  Sparkles, SwatchBook, WandSparkles, X, LogOut
} from 'lucide-react'

const ProjectsSection = lazy(() => import('./components/ProjectsSection'))
const MoodboardSection = lazy(() => import('./components/MoodboardSection'))
const ColorStudioSection = lazy(() => import('./components/ColorStudioSection'))
const MaterialsLibrarySection = lazy(() => import('./components/MaterialsLibrarySection'))
const IdeaGeneratorSection = lazy(() => import('./components/IdeaGeneratorSection'))
const DesignAnalyzerSection = lazy(() => import('./components/DesignAnalyzerSection'))
const VirtualTryOnSection = lazy(() => import('./components/VirtualTryOnSection'))
const PatternExplorerSection = lazy(() => import('./components/PatternExplorerSection'))
const FashionDesignStudioSection = lazy(() => import('./components/FashionDesignStudioSection'))
const ProfileSection = lazy(() => import('./components/ProfileSection'))


const disciplines = [
  { id: 'fashion', title: 'الملابس والنسيج', en: 'FASHION & TEXTILE', desc: 'ابتكر الأزياء، جرّب الألوان والنقوش، واستكشف تنسيقات جديدة.', icon: SwatchBook, tone: 'mint', count: '04 أدوات' },
  { id: 'art', title: 'التربية الفنية', en: 'FINE ARTS', desc: 'حوّل أفكارك إلى تكوينات ورسومات وتجارب بصرية.', icon: Palette, tone: 'peach', count: '06 أدوات' },
  { id: 'digital', title: 'التصميم الرقمي', en: 'DIGITAL DESIGN', desc: 'صمّم الملصقات والهويات البصرية والمحتوى الإبداعي.', icon: Layers3, tone: 'lavender', count: '05 أدوات' },
  { id: 'decor', title: 'الفنون الزخرفية', en: 'DECORATIVE ARTS', desc: 'أنشئ وحدات زخرفية وأنماطاً وتكرارات فنية.', icon: Shapes, tone: 'blue', count: '04 أدوات' },
]

const tools = [
  { id: 'idea-generator', title: 'مولّد الأفكار', desc: 'حوّل وصفك إلى اتجاهات إبداعية أولية.', icon: WandSparkles, tag: 'توليد إبداعي', status: 'متاح الآن' },
  { id: 'design-analyzer', title: 'محلل التصميم', desc: 'احصل على ملاحظات حول التكوين والألوان.', icon: Activity, tag: 'تحليل بصري', status: 'متاح الآن' },
  { id: 'moodboard', title: 'لوحة الإلهام', desc: 'اجمع المراجع والألوان والصور في مساحة واحدة.', icon: Grid2X2, tag: 'تنظيم بصري', status: 'متاح الآن' },
  { id: 'materials-library', title: 'مكتبة الخامات', desc: 'استكشف الخامات والأنسجة والنقوش.', icon: SwatchBook, tag: 'مكتبة فنية', status: 'متاح الآن' },
  { id: 'color-studio', title: 'استوديو الألوان', desc: 'استخرج الألوان من الصور وكون لوحاتك واحفظها.', icon: Palette, tag: 'تصميم', status: 'متاح الآن' },
  { id: 'pattern-explorer', title: 'مستكشف النقوش', desc: 'أنشئ وحدات زخرفية متكررة وصدّرها بصيغ SVG وPNG.', icon: Grid3X3, tag: 'زخرفة وأنماط', status: 'متاح الآن' },
  { id: 'fashion-studio', title: 'استوديو تصميم الأزياء', desc: 'صمّم القماش والنقوش ثم اختر قصة القطعة وراجع التصميم قبل التجربة الافتراضية.', icon: SwatchBook, tag: 'تصميم أزياء متكامل', status: 'متاح الآن' },
  { id: 'virtual-try-on', title: 'التجربة الافتراضية', desc: 'جرّب قطعة ملابس على بث الكاميرا مباشرة باستخدام محرك Decart.', icon: Sparkles, tag: 'تجربة بالذكاء الاصطناعي', status: 'متاح الآن' },
]

const roadmap = [
  { n: '01', title: 'تأسيس المختبر والحسابات', desc: 'الهوية والواجهة العربية والتسجيل والدخول والملف الشخصي.', state: 'مكتمل', done: true },
  { n: '02', title: 'إدارة المشروعات', desc: 'إنشاء المشروعات وتعديلها وحذفها وحفظ بياناتها في Firestore.', state: 'مكتمل', done: true },
  { n: '03', title: 'معرض الوسائط والملفات', desc: 'رفع الصور والفيديوهات ومعاينتها وتصنيفها والبحث والتنزيل.', state: 'مكتمل', done: true },
  { n: '04', title: 'معمل التصميم', desc: 'لوحة الإلهام واستوديو الألوان ومكتبة الخامات ومستكشف النقوش متاحة.', state: 'مكتمل مبدئياً', done: true },
  { n: '05', title: 'مساعد الذكاء الاصطناعي', desc: 'التوليد الحالي محلي؛ الربط بنموذج AI وتحليل نقدي فني ما زالا قيد التطوير.', state: 'جاري التنفيذ', active: true },
  { n: '06', title: 'أدوات المجالات الفنية', desc: 'أدوات متخصصة للملابس والتربية الفنية والتصميم الرقمي والزخرفة.', state: 'مخطط' },
  { n: '07', title: 'التجربة الافتراضية', desc: 'محرك Decart realtime متصل بالكاميرا؛ يلزم إعداد DECART_API_KEY واختبار جلسة فعلية.', state: 'جاهز للإعداد', active: true },
  { n: '08', title: 'التقييم والتحليلات', desc: 'التقييم الفني والاختبارات ومؤشرات الانخراط والتقارير.', state: 'مخطط' },
  { n: '09', title: 'الإدارة والإطلاق', desc: 'الصلاحيات والأمان والاختبارات وتحسين الأداء والنشر.', state: 'مخطط' },
]

const routePaths = { overview: '/', disciplines: '/disciplines', tools: '/tools',
'idea-generator': '/tools/idea-generator', 'design-analyzer': '/tools/design-analyzer',
moodboard: '/tools/moodboard', 'materials-library': '/tools/materials-library',
'color-studio': '/tools/color-studio', 'fashion-studio': '/tools/fashion-studio', 'virtual-try-on': '/tools/virtual-try-on', 'pattern-explorer': '/tools/pattern-explorer',
projects: '/projects', roadmap: '/roadmap', profile: '/profile',
'discipline-fashion': '/disciplines/fashion', 'discipline-art': '/disciplines/art',
'discipline-digital': '/disciplines/digital', 'discipline-decor': '/disciplines/decor' };
const routeTitles = { overview: 'نظرة عامة', disciplines: 'المجالات الفنية', tools: 'أدوات المختبر',
'idea-generator': 'مولّد الأفكار', 'design-analyzer': 'محلل التصميم', moodboard: 'لوحة الإلهام',
'materials-library': 'مكتبة الخامات', 'color-studio': 'استوديو الألوان', 'fashion-studio': 'استوديو تصميم الأزياء', 'virtual-try-on': 'التجربة الافتراضية', 'pattern-explorer': 'مستكشف النقوش',
projects: 'مشروعاتي وملفاتي', roadmap: 'خطة التطوير', profile: 'ملفي الشخصي',
'discipline-fashion': 'الملابس والنسيج', 'discipline-art': 'التربية الفنية', 'discipline-digital': 'التصميم الرقمي', 'discipline-decor': 'الفنون الزخرفية' };
function getRouteFromPath(path) { const normalized = path.length > 1 ? (path.endsWith('/') ? path.slice(0, -1) : path) : path; return Object.keys(routePaths).find(key => routePaths[key] === normalized) || 'overview'; }
function App() {
  const [active, setActive] = useState(() => getRouteFromPath(window.location.pathname))
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedDiscipline, setSelectedDiscipline] = useState('')
  const [projectName, setProjectName] = useState('')
  const [showProject, setShowProject] = useState(false)
  const [notice, setNotice] = useState('')
  const [tryOnDesign, setTryOnDesign] = useState(null)
  const { user, loading, logout } = useAuth()

  useEffect(() => { const sync = () => setActive(getRouteFromPath(window.location.pathname)); window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync) }, [])

  if (loading) return <div className="auth-loading">جارٍ تحميل مساحة VESTRA...</div>
  if (!user) return <AuthScreen />

  const nav = [
    { id: 'overview', label: 'نظرة عامة', icon: Compass },
    { id: 'disciplines', label: 'المجالات الفنية', icon: Shapes },
    { id: 'tools', label: 'أدوات المختبر', icon: WandSparkles },
    { id: 'moodboard', label: 'لوحة الإلهام', icon: Grid2X2 },
    { id: 'color-studio', label: 'استوديو الألوان', icon: Palette },
    { id: 'projects', label: 'مشروعاتي وملفاتي', icon: FolderKanban },
    { id: 'roadmap', label: 'خطة التطوير', icon: BookOpen },
  ]

  const goTo = (id) => { const path = routePaths[id] || '/'; if (window.location.pathname !== path) window.history.pushState({}, '', path); setActive(id); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const activeTool = tools.find(tool => tool.id === active)
  const activeDiscipline = disciplines.find(item => ('discipline-' + item.id) === active)
  const currentPageTitle = routeTitles[active] || activeTool?.title || activeDiscipline?.title || 'نظرة عامة'

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
            return <button key={item.id} className={(active === item.id || (item.id === 'tools' && activeTool && !['moodboard', 'color-studio', 'materials-library', 'idea-generator', 'design-analyzer', 'fashion-studio', 'virtual-try-on'].includes(active)) || (item.id === 'disciplines' && activeDiscipline)) ? 'nav-item active' : 'nav-item'} onClick={() => goTo(item.id)}><Icon size={18} /><span>{item.label}</span>{(active === item.id || (item.id === 'tools' && activeTool && !['moodboard', 'color-studio'].includes(active)) || (item.id === 'disciplines' && activeDiscipline)) && <i />}</button>
          })}
        </nav>
        <div className="side-divider" />
        <div className="side-label">حسابك</div>
        <button className={active === 'profile' ? 'nav-item active' : 'nav-item'} onClick={() => goTo('profile')}><GraduationCap size={18} /><span>ملفي الشخصي</span></button>
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
            <div className="breadcrumb">المختبر <ChevronLeft size={14} /> <span>{currentPageTitle}</span></div>
          </div>
          <div className="topbar-left">
            <div className="search-box"><Search size={16} /><input placeholder="ابحث في المختبر..." aria-label="ابحث في المختبر" /><kbd>⌘ K</kbd></div>
            <button className="icon-btn notification-btn" onClick={() => setNotice('لا توجد إشعارات جديدة حالياً.')} aria-label="الإشعارات"><Bell size={18} /><i /></button>
            <div className="top-avatar">{(user.displayName || user.email || 'V').slice(0, 1).toUpperCase()}</div><button className="icon-btn logout-btn" onClick={() => logout()} aria-label="تسجيل الخروج" title="تسجيل الخروج"><LogOut size={17} /></button>
          </div>
        </header>

        <div className="page-content">
          {active === 'overview' && <><section className="welcome-row" id="overview">
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

          </>}{active === 'disciplines' && <><section className="section-block" id="disciplines">
            <div className="section-heading"><div><div className="section-kicker">EXPLORE YOUR FIELD</div><h2>اختر مجال إبداعك</h2><p>كل مجال يفتح لك مجموعة مختلفة من الأدوات والتجارب.</p></div><button className="text-link" onClick={() => goTo('disciplines')}>كل المجالات <ArrowLeft size={15} /></button></div>
            <div className="discipline-grid">{disciplines.map((d, i) => { const Icon = d.icon; return <button key={d.id} className={`discipline-card ${d.tone}`} onClick={() => { setSelectedDiscipline(d.id); goTo('discipline-' + d.id) }}><div className="discipline-top"><div className="discipline-icon"><Icon size={22} /></div><span className="discipline-number">0{i + 1}</span></div><div className="discipline-en">{d.en}</div><h3>{d.title}</h3><p>{d.desc}</p><div className="discipline-foot"><span>{d.count}</span><span className="round-arrow"><ArrowUpLeft size={16} /></span></div></button> })}</div>
          </section>

          </>}{active === 'tools' && <><section className="section-block tools-section" id="tools">
            <div className="section-heading"><div><div className="section-kicker">YOUR CREATIVE TOOLKIT</div><h2>أدوات المختبر</h2><p>مجموعة أدوات هتساعدك في كل خطوة من الفكرة إلى التنفيذ.</p></div><span className="planned-label"><span /> أدوات ضمن خطة التطوير</span></div>
            <div className="tools-grid">{tools.map((tool, i) => { const Icon = tool.icon; const available = tool.status === 'متاح الآن'; return <button type="button" onClick={() => goTo(tool.id)} className={`tool-card ${available ? 'tool-card-available' : ''}`} key={tool.title}><div className="tool-icon"><Icon size={20} /></div><div className="tool-tag">{tool.tag}</div><h3>{tool.title}</h3><p>{tool.desc}</p><div className="tool-bottom"><span className={available ? 'tool-status tool-status-live' : 'tool-status'}>{tool.status}</span>{available ? <span className="tool-launch">فتح الصفحة <ArrowUpLeft size={13} /></span> : <span className="tool-number">0{i + 1}</span>}</div></button> })}</div>
          </section>

          </>}{active === 'moodboard' && <Suspense fallback={<div className="route-loading">جارٍ تحميل لوحة الإلهام...</div>}><MoodboardSection user={user} onNotice={setNotice} /></Suspense>}

          {active === 'color-studio' && <Suspense fallback={<div className="route-loading">جارٍ تحميل استوديو الألوان...</div>}><ColorStudioSection user={user} onNotice={setNotice} /></Suspense>}

          {active === 'materials-library' && <Suspense fallback={<div className="route-loading">جارٍ تحميل مكتبة الخامات...</div>}><MaterialsLibrarySection user={user} onNotice={setNotice} /></Suspense>}
          {active === 'idea-generator' && <Suspense fallback={<div className="route-loading">جارٍ تحميل مولّد الأفكار...</div>}><IdeaGeneratorSection user={user} onNotice={setNotice} /></Suspense>}
          {active === 'design-analyzer' && <Suspense fallback={<div className="route-loading">جارٍ تحميل محلل التصميم...</div>}><DesignAnalyzerSection user={user} onNotice={setNotice} /></Suspense>}
          {active === 'fashion-studio' && <Suspense fallback={<div className="route-loading">جارٍ تحميل استوديو تصميم الأزياء...</div>}><FashionDesignStudioSection user={user} onNotice={setNotice} onTryOn={design => { setTryOnDesign(design); goTo('virtual-try-on') }} /></Suspense>}
          {active === 'virtual-try-on' && <Suspense fallback={<div className="route-loading">جارٍ تحميل التجربة الافتراضية...</div>}><VirtualTryOnSection user={user} onNotice={setNotice} initialDesign={tryOnDesign} /></Suspense>}
          {active === 'pattern-explorer' && <Suspense fallback={<div className="route-loading">جارٍ تحميل مستكشف النقوش...</div>}><PatternExplorerSection user={user} onNotice={setNotice} /></Suspense>}

          {active === 'profile' && <Suspense fallback={<div className="route-loading">جارٍ تحميل الملف الشخصي...</div>}><ProfileSection onNotice={setNotice} /></Suspense>}

          {active === 'projects' && <Suspense fallback={<div className="route-loading">جارٍ تحميل المشروعات...</div>}><ProjectsSection onNotice={setNotice} /></Suspense>}

          {active === 'roadmap' && <><section className="section-block roadmap-section" id="roadmap"><div className="section-heading"><div><div className="section-kicker">FROM IDEA TO REALITY</div><h2>رحلة بناء المختبر</h2><p>خطة واضحة للمراحل والوظائف التي سننفذها بالترتيب.</p></div><span className="roadmap-count">09 مراحل رئيسية</span></div><div className="roadmap-list">{roadmap.map((step, i) => <div className={`roadmap-item ${step.active ? 'current' : ''} ${step.done ? 'completed' : ''}`} key={step.n}><div className="roadmap-marker">{step.active || step.done ? <Check size={16} /> : step.n}</div><div className="roadmap-copy"><h3>{step.title}</h3><p>{step.desc}</p></div><span className="roadmap-state">{step.state}</span>{i !== roadmap.length - 1 && <div className="roadmap-connector" />}</div>)}</div></section>

          </>}          {activeTool && !['moodboard', 'color-studio'].includes(active) && <section className="route-placeholder section-block">
            <div className="route-placeholder-icon"><activeTool.icon size={27}/></div>
            <div className="section-kicker">{activeTool.tag.toUpperCase()} / VESTRA TOOL</div>
            <h1>{activeTool.title}</h1><p>{activeTool.desc}</p>
            <span className="route-status">{activeTool.status === 'متاح الآن' ? 'الأداة متاحة' : 'ضمن خطة التطوير'}</span>
            <div className="route-placeholder-note">هذه صفحة مستقلة للأداة. ستضاف وظائفها وتجاربها هنا دون التأثير على بقية صفحات المختبر.</div>
            <button className="primary-btn" onClick={() => goTo('tools')}><ArrowLeft size={16}/> العودة إلى أدوات المختبر</button>
          </section>}
          {activeDiscipline && <section className="route-placeholder section-block">
            <div className="route-placeholder-icon"><activeDiscipline.icon size={27}/></div>
            <div className="section-kicker">CREATIVE DISCIPLINE / VESTRA</div>
            <h1>{activeDiscipline.title}</h1><p>{activeDiscipline.desc}</p>
            <div className="route-placeholder-note">هذه مساحة مستقلة للمجال، وستُجمع فيها أدواته ومشروعاته ومراجعه المتخصصة.</div>
            <button className="primary-btn" onClick={() => goTo('tools')}><WandSparkles size={16}/> تصفح أدوات المختبر</button>
          </section>}
          <footer className="footer"><div className="footer-brand"><span>VESTRA</span> ART LAB</div><p>مساحة جامعية للإبداع والتجريب والتعلم الذكي.</p><span>BUILT FOR CREATIVITY <b>✳</b> 2026</span></footer>
        </div>
      </main>

      {notice && <div className="toast" role="status"><Sparkles size={17} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="إغلاق"><X size={16} /></button></div>}

      {showProject && <div className="modal-backdrop" onClick={() => setShowProject(false)}><form className="project-modal" onSubmit={createProject} onClick={e => e.stopPropagation()}><button type="button" className="modal-close icon-btn" onClick={() => setShowProject(false)} aria-label="إغلاق"><X size={19} /></button><div className="modal-icon"><Plus size={22} /></div><div className="section-kicker">NEW CREATIVE PROJECT</div><h2>ابدأ فكرتك الجديدة</h2><p>اكتب اسماً لمشروعك، وسيتم حفظه في مساحتك الخاصة.</p><label htmlFor="project-name">اسم المشروع</label><input id="project-name" autoFocus value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="مثلاً: مجموعة أزياء مستوحاة من الطبيعة" /><button className="primary-btn modal-submit" type="submit">إنشاء المشروع <ArrowLeft size={16} /></button></form></div>}
    </div>
  )
}

export default App
