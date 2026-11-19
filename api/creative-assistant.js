const MAX_TEXT = 6000

function clean(value, max = 1200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

async function verifyFirebaseToken(req) {
  const authorization = req.headers.authorization || ''
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY
  if (!idToken || !firebaseApiKey) return false

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  )
  if (!response.ok) return false
  const identity = await response.json()
  return Boolean(identity.users?.[0]?.localId)
}

function buildPrompt(payload) {
  if (payload.mode === 'idea') {
    const field = clean(payload.field, 80)
    const style = clean(payload.style, 80)
    const topic = clean(payload.topic, 300)
    return {
      system: 'أنت مساعد إبداعي أكاديمي متخصص في مجالات كلية التربية النوعية: الملابس والنسيج، التربية الفنية، التصميم الرقمي، والفنون الزخرفية. أجب بالعربية الواضحة وبشكل عملي. لا تدّعِ أنك أنشأت صورة أو ملفاً. قدّم فكرة أصلية قابلة للتنفيذ.',
      user: `أنشئ مقترح مشروع إبداعي وفق البيانات التالية:
المجال: ${field}
الأسلوب: ${style}
الموضوع أو الكلمات المفتاحية: ${topic || 'اقترح موضوعاً مناسباً'}

اكتب النتيجة بهذا الترتيب:
1) عنوان جذاب
2) الفكرة والهدف
3) مصدر الإلهام والمرجع البصري
4) لوحة ألوان مقترحة
5) خامات أو أدوات مناسبة
6) خطوات تنفيذ عملية من 5 مراحل
7) لمسة ابتكارية تميز المشروع
8) معايير بسيطة لتقييم النموذج الأولي

اجعل المقترح محدداً وغير عام، ومناسباً لمشروع طالب جامعي.`,
    }
  }

  if (payload.mode === 'critique') {
    const field = clean(payload.field, 80)
    const brief = clean(payload.brief, 1500)
    const metrics = payload.metrics && typeof payload.metrics === 'object' ? payload.metrics : {}
    const safeMetrics = {
      dimensions: clean(metrics.dimensions, 40),
      ratio: clean(metrics.ratio, 20),
      brightness: clean(metrics.brightness, 30),
      contrast: clean(metrics.contrast, 30),
      colors: Array.isArray(metrics.colors) ? metrics.colors.slice(0, 6).map(v => clean(v, 12)) : [],
    }
    return {
      system: 'أنت ناقد تصميم ومعلّم فنون داعم. قدّم ملاحظات بناءة ومتوازنة بالعربية. فرّق بوضوح بين القياسات التقنية الموضوعية والانطباعات الفنية التي تحتاج إلى رؤية العمل كاملاً. لا تختلق تفاصيل غير موجودة.',
      user: `راجع العمل التالي مراجعة إرشادية:
المجال: ${field || 'غير محدد'}
وصف صاحب العمل: ${brief || 'لم يضف وصفاً'}
القياسات التقنية المتاحة: ${JSON.stringify(safeMetrics)}

قدّم:
- نقاط قوة محتملة مدعومة بالبيانات
- 3 فرص تحسين محددة
- اقتراح تجربة أو تعديل واحد قابل للتنفيذ
- 3 أسئلة تساعد الطالب على تطوير رؤيته

نبّه إلى أن القياسات وحدها لا تكفي للحكم على جودة العمل الفني.`,
    }
  }

  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authenticated = await verifyFirebaseToken(req)
    if (!authenticated) return res.status(401).json({ error: 'سجّل الدخول أولاً لاستخدام المساعد الذكي.' })

    const payload = req.body && typeof req.body === 'object' ? req.body : {}
    const prompt = buildPrompt(payload)
    if (!prompt) return res.status(400).json({ error: 'نوع الطلب غير مدعوم.' })

    const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_API_KEY
    const model = process.env.AI_MODEL
    const baseUrl = process.env.AI_BASE_URL || (process.env.AI_GATEWAY_API_KEY
      ? 'https://ai-gateway.vercel.sh/v1'
      : '')
    if (!apiKey || !model || !baseUrl) {
      return res.status(503).json({ error: 'المساعد الذكي غير مهيأ بعد. أضف إعدادات مزود الذكاء الاصطناعي في Vercel.' })
    }

    const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
    const messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user.slice(0, MAX_TEXT) },
    ]

    // Gemini can temporarily return 503 when model capacity is busy.
    // Retry briefly, then use a lighter Gemini fallback before returning an error.
    const fallbackModel = process.env.AI_FALLBACK_MODEL
      || (baseUrl.includes('generativelanguage.googleapis.com') ? 'gemini-3.5-flash-lite' : '')
    const modelsToTry = [model, ...(fallbackModel && fallbackModel !== model ? [fallbackModel] : [])]
    let lastStatus = 502
    let lastError = 'Unknown provider error'

    for (const selectedModel of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        let response
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: selectedModel,
              messages,
              max_tokens: 1200,
            }),
          })
        } catch (error) {
          lastStatus = 502
          lastError = error?.message || 'Network request failed'
          if (attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 700))
            continue
          }
          break
        }

        const raw = await response.text()
        let result = {}
        try { result = raw ? JSON.parse(raw) : {} } catch { result = {} }

        if (response.ok) {
          const answer = result.choices?.[0]?.message?.content
          if (typeof answer === 'string' && answer.trim()) {
            return res.status(200).json({ text: answer.trim(), model: selectedModel })
          }
          lastStatus = 502
          lastError = 'Provider returned an empty response'
          break
        }

        lastStatus = response.status
        lastError = result?.error?.message
          || result?.message
          || (raw ? raw.slice(0, 500) : 'Unknown provider error')

        if ([429, 500, 502, 503, 504].includes(response.status) && attempt === 0) {
          const retryAfter = Number(response.headers.get('retry-after'))
          const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter * 1000, 2500)
            : 700
          await new Promise(resolve => setTimeout(resolve, waitMs))
          continue
        }
        break
      }
    }

    console.error('AI provider request failed after retries:', lastStatus, String(lastError).slice(0, 500))
    return res.status(502).json({
      error: lastStatus === 429 || lastStatus === 503
        ? 'مزود الذكاء الاصطناعي مشغول حالياً. حاول مرة أخرى بعد قليل.'
        : 'تعذر الحصول على رد من مزود الذكاء الاصطناعي. راجع إعدادات المزود وحاول مرة أخرى.',
    })
  } catch (error) {
    console.error('Creative assistant failed:', error?.message || error)
    return res.status(500).json({ error: 'حدث خطأ غير متوقع أثناء تشغيل المساعد الذكي.' })
  }
}
