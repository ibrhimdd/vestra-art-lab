# PROJECT STRUCTURE — VESTRA ART LAB

> يوضح الملف الهيكل المعروف والهيكل المستهدف. افحص شجرة المستودع قبل اعتبار القائمة جرداً كاملاً.

## 1. الملفات الأساسية المعروفة
    vestra-art-lab/
    ├── .github/workflows/build.yml
    ├── docs/
    │   ├── PROJECT_OVERVIEW.md
    │   ├── PROJECT_STRUCTURE.md
    │   ├── PROJECT_STATUS.md
    │   ├── ROADMAP.md
    │   └── AI_HANDOFF.md
    ├── src/
    │   ├── App.jsx
    │   ├── pages/ (مستهدف لفصل الشاشات إلى ملفات مستقلة تدريجياً)
    │   ├── main.jsx
    │   └── styles.css
    ├── .env.example
    ├── .gitignore
    ├── index.html
    ├── package.json
    └── vite.config.js

## 2. الهيكل المستهدف
    src/
    ├── app/
    ├── components/ui/
    ├── components/layout/
    ├── pages/
    ├── features/
    │   ├── authentication/
    │   ├── student-workspace/
    │   ├── projects/
    │   ├── media/
    │   ├── design-lab/
    │   ├── materials-library/
    │   ├── ai-assistant/
    │   ├── virtual-try-on/
    │   └── analytics/
    ├── services/
    │   ├── firebase/
    │   ├── cloudinary/
    │   └── ai/
    └── hooks/

    server/api/
      cloudinary-signature/
      media-delete/

## 3. قواعد المعمارية
1. منطق Firebase يوضع في services/firebase.
2. منطق Cloudinary يوضع في services/cloudinary.
3. Firestore يحفظ metadata والروابط فقط، ولا يحفظ بايتات الصور والفيديو.
4. لا تستخدم Firebase Storage أو PHP أو MySQL في التصميم الحالي.
5. أسرار المزودين تبقى في الخادم ولا توضع في متغيرات VITE_.
6. فصل العرض عن الوصول للبيانات والتحقق.
7. اختبار المصادقة والصلاحيات والرفع والحذف.
8. لا تنشئ ملفات فارغة لمجرد ملء الهيكل.
9. حدّث هذا الملف عند تغيير بنية الملفات.
10. حافظ على العربية وRTL والاستجابة للهاتف.

## 4. ملفات Firebase المسجلة سابقاً
- src/lib/firebase.js: تهيئة Firebase App وAuth وFirestore.
- src/lib/AuthContext.jsx: إدارة جلسة المستخدم.
- src/components/AuthScreen.jsx: واجهة الحسابات.
- firestore.rules: قواعد أولية للمستخدمين والمشروعات.
يجب التحقق من وجود هذه الملفات وحالتها الفعلية قبل تعديلها.

## 5. نموذج بيانات Firestore المقترح
    users/{uid}
      displayName
      email
      photoURL
      createdAt
      updatedAt

    projects/{projectId}
      ownerUid
      title
      description
      discipline
      status
      createdAt
      updatedAt

    projects/{projectId}/assets/{assetId}
      ownerUid
      projectId
      secureUrl
      publicId
      resourceType
      format
      bytes
      width
      height
      duration
      createdAt

هذا نموذج مقترح يحتاج مواءمة مع الكود الفعلي وقواعد Firestore الحالية قبل اعتماده.

## 6. دورة الوسائط
- الرفع: React إلى Cloudinary عبر unsigned preset مقيد للاختبار أو signed upload عبر endpoint خادمي.
- التسجيل: استجابة Cloudinary إلى مستند metadata في Firestore.
- العرض: قراءة secureUrl من Firestore وعرض الملف.
- الحذف: endpoint خادمي يتحقق من الهوية والملكية ثم يحذف publicId من Cloudinary ويحدث Firestore.
- لا تستخدم API Secret داخل المتصفح.


## 7. خريطة الصفحات والمسارات الحالية
- `/` — نظرة عامة.
- `/disciplines` — دليل المجالات الفنية، مع صفحة منفصلة لكل مجال تحت `/disciplines/:discipline`.
- `/tools` — فهرس الأدوات.
- `/tools/moodboard` — لوحة الإلهام.
- `/tools/color-studio` — استوديو الألوان.
- `/tools/idea-generator` و`/tools/design-analyzer` و`/tools/materials-library` و`/tools/virtual-try-on` — صفحات مستقلة للأدوات المخططة، تعرض حالة التطوير إلى حين تنفيذ الوظائف.
- `/projects` — المشروعات والملفات.
- `/profile` — الملف الشخصي.
- `/roadmap` — خطة التطوير.

التوجيه الحالي خفيف داخل `src/App.jsx` باستخدام History API و`popstate`؛ يجب اختبار فتح الروابط المباشرة وإعادة التحميل على Vercel. الخطة المستقبلية فصل كل صفحة إلى `src/pages/` ومكونات تخطيط مستقلة عند نمو التطبيق.
\n\n## أدوات المختبر المضافة — 2026-11-19\n- `src/components/MaterialsLibrarySection.jsx`: مكتبة خامات المستخدم ورفع صورها.\n- `src/components/IdeaGeneratorSection.jsx`: مولّد مفاهيم بقوالب محلية.\n- `src/components/DesignAnalyzerSection.jsx`: فحص بصري تقني محلي باستخدام Canvas.\n- `src/components/VirtualTryOnSection.jsx`: مساحة تجهيز جلسات تنسيق الملابس وحفظها.\n

## أدوات المختبر المضافة
- `src/components/PatternExplorerSection.jsx`: إنشاء وحدات زخرفية متكررة وتعديل الألوان والحجم والدوران، حفظ التصاميم في Firestore وتصدير SVG/PNG.
