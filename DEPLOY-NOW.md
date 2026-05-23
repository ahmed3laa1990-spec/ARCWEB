# 🚀 دليل النشر الكامل — GitHub + Cloudflare Pages

> دليل خطوة بخطوة لنشر موقع `byarcsa.com` بطريقة احترافية تتيح **تعديلات سهلة** و**تراجع آمن** عن أي تغيير.
>
> **الوقت المتوقع:** 30-45 دقيقة (مرة واحدة فقط).
>
> **التكلفة:** صفر — كل شيء مجاني.

---

## 📊 ماذا ستحصلون عليه بعد النشر

- ✅ موقع سريع جداً (نشر عالمي على 300+ مدينة عبر CDN)
- ✅ SSL تلقائي ومجاني (HTTPS)
- ✅ **سجل تغييرات كامل** — يمكن التراجع لأي إصدار سابق بضغطة واحدة
- ✅ **معاينة قبل النشر** — كل تعديل يُعطى رابط معاينة قبل النشر للعام
- ✅ تعديلات سريعة عبر GitHub.com مباشرة (لا حاجة لبرامج)
- ✅ DDoS protection مدمجة من Cloudflare
- ✅ تحليلات مدمجة مجانية

---

## 📦 المرحلة 1 — إنشاء حساب GitHub (5 دقائق)

### 1.1 إنشاء الحساب

افتحوا [github.com/signup](https://github.com/signup) وأنشئوا حساباً جديداً:
- اسم المستخدم المقترح: `byarcsa` أو `arc-construction-sa`
- استخدموا الإيميل: `info@byarcsa.com`
- اختاروا الخطة المجانية (Free)

### 1.2 تفعيل المصادقة الثنائية (2FA) — مهم جداً

من إعدادات الحساب → **Settings → Password and authentication → Two-factor authentication** → فعّلوا 2FA عبر تطبيق Google Authenticator أو Authy.

> **لماذا 2FA إجباري؟** لأن GitHub يخزّن كود موقعكم. لو سُرق الحساب، سرقوا الموقع.

---

## 📁 المرحلة 2 — إنشاء Repository ورفع الملفات (10 دقائق)

### 2.1 إنشاء Repository جديد

1. اضغطوا الزر الأخضر **`+`** في الزاوية اليمنى العليا → **New repository**
2. املؤوا:
   - **Repository name:** `arc-website`
   - **Description:** `ARC Construction official website — byarcsa.com`
   - **Visibility:** ✅ **Private** (مهم — لا تجعلوه Public)
   - **Initialize:** اتركوها فارغة (بدون README, بدون .gitignore)
3. اضغطوا **Create repository**

### 2.2 رفع ملفات الموقع

في صفحة الـ repo الفارغ، اضغطوا الرابط **"uploading an existing file"** في منتصف الصفحة.

ثم **اسحبوا وأفلتوا** هذه الملفات والمجلدات من حاسوبكم:
- `index.html`
- `404.html`
- `robots.txt`
- `sitemap.xml`
- `_headers`
- `_redirects`
- `.gitignore`
- مجلد `assets/` كاملاً (بكل الصور)

> **نصيحة:** اسحبوا كل شيء دفعة واحدة، لا تحتاج لرفع كل ملف على حدة.

في أسفل الصفحة، اكتبوا في خانة Commit message:
```
Initial website upload
```

اضغطوا **Commit changes** الأخضر. سيرفع الملفات (قد يستغرق دقيقة لمجلد assets).

### 2.3 تحقق من الرفع

بعد الرفع، يجب أن تروا الهيكل التالي في الـ repo:
```
arc-website/
├── 404.html
├── _headers
├── _redirects
├── .gitignore
├── assets/
│   ├── logo.png
│   ├── hero-skyline.jpg
│   ├── partners/
│   ├── projects/
│   └── services/
├── index.html
├── robots.txt
└── sitemap.xml
```

---

## ☁️ المرحلة 3 — إنشاء حساب Cloudflare وربط الموقع (10 دقائق)

### 3.1 إنشاء حساب Cloudflare

افتحوا [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) وسجّلوا بنفس إيميل `info@byarcsa.com`.

فعّلوا 2FA من الإعدادات (نفس الخطوة في GitHub).

### 3.2 إضافة موقعكم لـ Cloudflare

1. من Dashboard اضغطوا **+ Add → Connect a domain**
2. اكتبوا: `byarcsa.com` واضغطوا **Continue**
3. اختاروا الخطة **Free** (التحديث لاحقاً إن احتجتم)
4. ستظهر شاشة DNS records — اضغطوا **Continue** (سنُحدّث DNS لاحقاً)
5. ستحصلون على **2 nameservers** مثل:
   ```
   xxx.ns.cloudflare.com
   yyy.ns.cloudflare.com
   ```
   **احفظوا هذين الاسمين** — ستحتاجونهما في الخطوة التالية.

### 3.3 تحديث Nameservers في Hostinger

1. ادخلوا [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. اختاروا `byarcsa.com`
3. اذهبوا إلى **Domain → DNS / Nameservers**
4. اضغطوا **Change Nameservers**
5. الصقوا الـ 2 nameservers من Cloudflare
6. احفظوا

> **تنبيه مهم:** هذه الخطوة قد تأخذ **2-24 ساعة** لتنتشر عالمياً. خلال هذه الفترة، قد لا يعمل الموقع. هذا طبيعي.

### 3.4 العودة لـ Cloudflare والتأكد

ارجعوا لـ Cloudflare → اضغطوا **Check nameservers**. حين تنجح، سترون **"Great news! Cloudflare is now protecting your site"**.

---

## 🌐 المرحلة 4 — ربط GitHub بـ Cloudflare Pages (10 دقائق)

### 4.1 إنشاء مشروع Pages

1. في Cloudflare Dashboard اذهبوا إلى **Workers & Pages** من القائمة اليسرى
2. اضغطوا **Create application** → تبويب **Pages** → **Connect to Git**
3. اضغطوا **Connect GitHub** → اعطوا الصلاحيات لـ Cloudflare على repo `arc-website` فقط
4. اختاروا الـ repo `arc-website` واضغطوا **Begin setup**

### 4.2 إعدادات البناء

في صفحة Setup:
- **Project name:** `arc-website` (يصبح هذا الـ URL المؤقت: `arc-website.pages.dev`)
- **Production branch:** `main`
- **Framework preset:** **None** (موقعنا HTML بسيط)
- **Build command:** اتركوها فارغة
- **Build output directory:** اتركوها فارغة أو `/`
- **Root directory:** اتركوها فارغة

اضغطوا **Save and Deploy**.

سيستغرق النشر الأول **30-60 ثانية**. حين ينتهي، ستحصلون على رابط مثل:
```
https://arc-website.pages.dev
```

افتحوه — يجب أن يعمل الموقع كاملاً!

### 4.3 ربط الدومين `byarcsa.com`

1. في صفحة المشروع، اذهبوا لتبويب **Custom domains** → اضغطوا **Set up a custom domain**
2. اكتبوا: `byarcsa.com` → **Continue** → **Activate domain**
3. كرّروا الخطوة لـ: `www.byarcsa.com`

Cloudflare سيحدّث DNS تلقائياً وينشئ SSL خلال 1-2 دقيقة.

افتحوا `byarcsa.com` — الموقع الآن مباشر! 🎉

---

## 🔒 المرحلة 5 — إعدادات أمان وأداء إضافية (5 دقائق)

### 5.1 إعدادات SSL

من Cloudflare Dashboard → **SSL/TLS → Overview** → اختاروا **Full (strict)** بدل Flexible.

### 5.2 Force HTTPS

من **SSL/TLS → Edge Certificates** → فعّلوا:
- ✅ Always Use HTTPS
- ✅ Automatic HTTPS Rewrites
- ✅ HTTP Strict Transport Security (HSTS) — اختاروا 6 شهور

### 5.3 السرعة

من **Speed → Optimization** فعّلوا:
- ✅ Auto Minify (JavaScript, CSS, HTML)
- ✅ Brotli compression
- ✅ Early Hints
- ✅ Rocket Loader (اختبروه — لو كسر شيء عطّلوه)

### 5.4 Web Analytics مجاني

من **Web Analytics** → **Add a site** → اختاروا byarcsa.com → احصلوا على تحليلات تفوق Google Analytics بدون كوكيز.

---

## ✅ قائمة التحقق النهائية

افتحوا الموقع وتأكدوا من:

- [ ] `https://byarcsa.com` يعمل (مع القفل الأخضر — SSL)
- [ ] `https://www.byarcsa.com` يعمل ويحوّل لـ byarcsa.com
- [ ] الموقع يفتح بسرعة (PageSpeed > 90)
- [ ] اختبروا على [pagespeed.web.dev](https://pagespeed.web.dev) للتأكد
- [ ] الموبايل يعرض بشكل صحيح
- [ ] تبديل اللغة يعمل
- [ ] صفحة 404 تعمل (افتحوا `byarcsa.com/random-page`)
- [ ] `byarcsa.com/robots.txt` يعمل
- [ ] `byarcsa.com/sitemap.xml` يعمل

---

## 🎯 الخطوة التالية: التعديل اليومي

افتحوا الملف [`EDITING-GUIDE.md`](./EDITING-GUIDE.md) لتعلّم كيف تعدّلون النصوص، الصور، المشاريع، وكل شيء بدون أي خبرة برمجية.

---

## 🆘 مشاكل شائعة وحلولها

### "الـ nameservers لم تنتشر بعد"
هذه أكثر مشكلة شيوعاً. الحل: **انتظروا 24 ساعة** ثم تحققوا مرة أخرى. يمكن التحقق من حالة DNS عبر [whatsmydns.net](https://www.whatsmydns.net).

### "SSL لا يعمل / Browser يقول insecure"
في أول 24 ساعة بعد ربط الدومين، قد يظهر التحذير. إن استمر بعد 24 ساعة:
- Cloudflare → SSL/TLS → تأكدوا أنه على **Full (strict)** وليس Off
- جرّبوا تبويب incognito (لتجاوز الكاش)

### "أريد العودة لـ WordPress / Hostinger"
ببساطة في Hostinger → Domain → DNS/Nameservers → ارجعوا للـ nameservers الأصلية:
```
ns1.dns-parking.com
ns2.dns-parking.com
```
(أو nameservers Hostinger الأصلية)

---

## 📞 احتجتم مساعدة؟

أنا متاح لمساعدتكم في كل خطوة من هذه الخطوات. أخبروني بأي مرحلة وصلتم وأين توقفتم.
