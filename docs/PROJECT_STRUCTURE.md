# PROJECT STRUCTURE — VESTRA ART LAB

> يوضح الملف الهيكل الفعلي الحالي والهيكل المستهدف. لا تنقل عنصراً إلى "موجود" إلا بعد إضافته للمستودع.

## 1. الملفات الموجودة حالياً
    vestra-art-lab/
    ├── .github/
    │   └── workflows/
    │       └── build.yml              # GitHub Actions: npm install + build
    ├── docs/
    │   ├── PROJECT_OVERVIEW.md        # فكرة المشروع ونطاقه
    │   ├── PROJECT_STRUCTURE.md       # هذه الخريطة
    │   ├── PROJECT_STATUS.md          # سجل التقدم والتسليم
    │   └── ROADMAP.md                 # المراحل والأدوات والمميزات
    ├── src/
    │   ├── App.jsx                    # لوحة المختبر وتفاعلات العرض
    │   ├── main.jsx                   # React entry point
    │   └── styles.css                 # نظام التصميم والأنماط المتجاوبة
    ├── .env.example                   # أسماء إعدادات Firebase فقط
    ├── .gitignore                     # ملفات محلية ومستبعدات البناء
    ├── index.html                     # صفحة HTML عربية RTL
    ├── package.json                   # الاعتماديات وأوامر التشغيل
    ├── vite.config.js                 # إعداد Vite وReact
    └── README.md

## 2. الهيكل المستهدف عند اكتمال المنصة
    src/
    ├── app/                            # التوجيه وتجميع التطبيق
    ├── components/
    │   ├── ui/                         # مكونات عامة
    │   └── layout/                     # Header, Sidebar, Shell
    ├── pages/                          # صفحات التطبيق
    ├── features/
    │   ├── authentication/
    │   ├── student-workspace/
    │   ├── projects/
    │   ├── design-lab/
    │   ├── materials-library/
    │   ├── ai-assistant/
    │   ├── virtual-try-on/
    │   └── analytics/
    ├── services/
    │   ├── firebase/
    │   └── ai/
    ├── hooks/
    ├── contexts/
    ├── styles/
    ├── utils/
    └── types/

    server/
    ├── ai/                             # طلبات AI الخادمية الآمنة
    └── api/                            # واجهات خادمية عند الحاجة

    docs/
    ├── PROJECT_OVERVIEW.md
    ├── PROJECT_STRUCTURE.md
    ├── PROJECT_STATUS.md
    ├── ROADMAP.md
    └── decisions/

## 3. مسؤوليات الملفات الحالية
- **src/main.jsx:** تحميل React وApp والأنماط.
- **src/App.jsx:** واجهة لوحة المختبر الحالية وتفاعلات العرض الأولية.
- **src/styles.css:** ألوان وخطوط وتخطيط RTL واستجابة الشاشات.
- **index.html:** اللغة والاتجاه والعنوان والخطوط.
- **package.json:** scripts واعتماديات React وVite وLucide.
- **vite.config.js:** تفعيل Vite وReact.
- **.env.example:** أسماء متغيرات Firebase المتوقعة دون قيم سرية.
- **.github/workflows/build.yml:** فحص تثبيت الاعتماديات وبناء الإنتاج.

## 4. قواعد المعمارية
1. منطق Firebase يوضع في services/firebase لا داخل مكونات العرض.
2. مكونات React لا تستدعي مزود AI محدداً مباشرة.
3. مفاتيح المزود السرية تبقى في الخادم ولا توضع في VITE_.
4. كل مجال وظيفي ينظم داخل features مستقلة.
5. المكونات المشتركة توضع في components/ui وcomponents/layout.
6. فصل العرض عن الوصول للبيانات والتحقق.
7. اختبار المصادقة والصلاحيات ورفع الملفات.
8. لا تنشئ ملفات فارغة لمجرد ملء الهيكل.
9. تحديث هذا الملف عند إضافة أو نقل ملفات.
10. الحفاظ على العربية وRTL وإمكانية الاستخدام على الهاتف.

## 5. الملفات المنفذة حالياً\n| المسار | المسؤولية |\n|---|---|\n| `src/lib/firebase.js` | تهيئة Firebase App وAuth وFirestore من متغيرات البيئة |\n| `src/lib/AuthContext.jsx` | إدارة جلسة المستخدم والتسجيل والدخول والخروج والاستعادة |\n| `src/components/AuthScreen.jsx` | واجهة تسجيل الدخول وإنشاء الحساب واستعادة كلمة المرور |\n| `firestore.rules` | قواعد أولية لحماية ملفات المستخدمين والمشروعات |\n\n## 6. نموذج بيانات مبدئي
    users/{uid}
      profile fields
      createdAt
      updatedAt

    users/{uid}/projects/{projectId}
      title
      description
      discipline
      status
      createdAt
      updatedAt

    users/{uid}/projects/{projectId}/assets/{assetId}
      storagePath
      type
      metadata
      createdAt

هذا نموذج مبدئي للمراجعة قبل اعتماده في Firestore.

## 6. المسارات المقترحة
| المسار | الغرض |
|---|---|
| / | لوحة المختبر أو الصفحة التعريفية |
| /login | تسجيل الدخول |
| /register | إنشاء حساب |
| /workspace | مساحة الطالب |
| /projects | قائمة المشروعات |
| /projects/:projectId | تفاصيل مشروع |
| /design-lab | معمل التصميم |
| /ai-lab | مساعد الذكاء الاصطناعي |
| /virtual-try-on | تجربة الملابس |
| /analytics | التقييم والتقارير |

المسارات المقترحة ليست منفذة حتى يتم إنشاؤها وربطها واختبارها.
