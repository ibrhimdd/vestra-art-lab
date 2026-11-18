# AI HANDOFF — VESTRA ART LAB

هذا الملف نقطة البداية الإلزامية لأي نموذج ذكاء اصطناعي أو مطور يواصل العمل على المستودع.

## اقرأ بالترتيب
1. README.md
2. هذا الملف docs/AI_HANDOFF.md
3. docs/PROJECT_STATUS.md
4. docs/PROJECT_OVERVIEW.md
5. docs/PROJECT_STRUCTURE.md
6. docs/ROADMAP.md

بعد القراءة، افحص الكود الفعلي والفرع وآخر commit قبل أي تعديل. التوثيق لا يغني عن فحص الملفات.

## المشروع
VESTRA ART LAB مختبر فني رقمي متعدد التخصصات لطلاب كلية التربية النوعية، بواجهة عربية RTL باستخدام React + Vite ومنشورة على Vercel.

المجالات: الملابس والنسيج، التربية الفنية، التصميم الرقمي، الفنون الزخرفية.

## المعمارية المعتمدة — لا تغيّرها دون موافقة صاحب المشروع
| الوظيفة | التقنية |
|---|---|
| Frontend | React + Vite |
| Frontend hosting | Vercel |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| Media storage | Cloudinary |
| AI | Provider Adapter قابل للتبديل |

### قواعد حاسمة
- Firestore يحفظ البيانات المنظمة وmetadata وروابط الملفات فقط.
- Cloudinary يحفظ ملفات الصور والفيديو الفعلية ويقدم روابط HTTPS.
- لا تستخدم Firebase Storage في المعمارية الحالية.
- لا تضف PHP أو MySQL؛ صاحب المشروع اختار الاستمرار مع Firestore.
- لا تخزن بايتات الصور أو الفيديو داخل مستندات Firestore.
- لا تضع Cloudinary API Secret أو Firebase Admin credentials في React أو GitHub أو متغيرات VITE_.
- unsigned upload ليس آمناً تلقائياً؛ قيّد preset بالأنواع والأحجام والمجلدات وقيّم مخاطر إساءة الاستخدام.
- الأفضل للإنتاج signed upload من خلال endpoint موثوق.
- حذف موارد Cloudinary يتطلب خادماً موثوقاً يتحقق من هوية المستخدم وملكيته؛ لا تستخدم secret من المتصفح.
- رابط Cloudinary العام ليس بديلاً عن صلاحيات Firestore. حدّد سياسة الملفات العامة والخاصة.
- احفظ metadata مثل ownerUid وprojectId وsecureUrl وpublicId وresourceType وformat وbytes وcreatedAt، وأضف الأبعاد ومدة الفيديو عند توفرها.
- نسّق حذف سجل Firestore مع حذف مورد Cloudinary لتجنب الملفات اليتيمة.

## سير عمل ميزة الوسائط
1. تأكد من تسجيل دخول المستخدم.
2. تحقق من نوع الملف وحجمه في الواجهة، وطبّق القيود على جهة الرفع أيضاً.
3. ارفع الملف إلى Cloudinary بالآلية المعتمدة.
4. استخرج secure_url وpublic_id وresource_type والبيانات الوصفية من الاستجابة.
5. احفظ metadata والرابط في Firestore مع ربط الملف بمالكه ومشروعه.
6. اقرأ المستند من Firestore واعرض الوسيط من secure_url.
7. اختبر الصورة أولاً، ثم الفيديو، ثم الحذف.
8. تعامل مع فشل Firestore بعد نجاح الرفع حتى لا تتراكم الملفات اليتيمة.

## حالة التنفيذ المعروفة بتاريخ 2026-11-18
- React + Vite والواجهة الأساسية موجودة.
- سجل المشروع يذكر إضافة Firebase SDK وAuth Context وربط إنشاء المشروعات بـ Firestore.
- نشر قواعد Firestore واختبارات Firebase الحقيقية لم يتم تأكيدهما.
- Cloudinary لم يُربط بعد؛ صاحب المشروع ينشئ حساباً وسيشارك بيانات الإعداد غير السرية.
- لا توجد ميزة رفع وسائط مكتملة حتى الآن.
- لا تدّعِ أن التسجيل أو الحفظ أو الرفع يعمل فعلياً دون اختبار.

## الخطوة التالية المتفق عليها
1. انتظر إعداد Cloudinary من صاحب المشروع، ثم افحص ملفات Firebase الحالية وFirestore rules وpackage.json.
2. حدّد signed uploads عبر Vercel Function أو خادم موثوق، أو unsigned preset مقيد للاختبار.
3. لا تطلب API Secret في المحادثة أو GitHub. إذا احتاجه endpoint خادمي، يوضع في إعدادات Environment Variables السرية لدى منصة الاستضافة.
4. نفّذ رفع صورة تجريبية واحفظ رابطها وmetadata في Firestore.
5. أعد قراءة المستند واعرض الصورة.
6. اختبر الفيديو ضمن حدود الخطة.
7. اختبر الحذف والصلاحيات.
8. شغّل npm run build والاختبارات، ثم حدّث PROJECT_STATUS.md وPROJECT_STRUCTURE.md وROADMAP.md.

## معايير التسليم
- اذكر الملفات التي تغيرت.
- اذكر ما اختُبر فعلياً ونتيجته، وما لم يُختبر.
- لا تحذف وظائف قائمة ولا تعِد كتابة أجزاء كبيرة دون ضرورة.
- لا تنشر أسراراً أو بيانات طلاب.
- حافظ على العربية وRTL والتوافق مع الهاتف.
- حدّث سجل الحالة والخطوة التالية في نهاية كل جلسة.
