# فرن الحارة — موقع طلبات مع Cloudflare D1

واجهة React عربية RTL وخلفية Cloudflare Worker. أثناء التطوير المحلي يعمل الكود على جهازك، بينما اتصال D1 مضبوط على قاعدة Cloudflare الحقيقية `restoos-db` (`remote = true`). واجهة الإدارة على `/admin` تتيح إدارة المنيو ومتابعة الطلبات.

> التشغيل المحلي هنا يقرأ ويكتب على قاعدة D1 الأونلاين. استخدمه بحذر ولا تختبر بإضافة طلبات وهمية أو حذف بيانات حقيقية.

## أول إعداد لقاعدة D1

قاعدة D1 الحالية موصّلة بالفعل في `wrangler.toml`. طبّق migrations لإنشاء الجداول المطلوبة وترحيل بيانات المنيو القديمة إلى جداول منفصلة:

```powershell
pnpm dlx wrangler login
pnpm dlx wrangler d1 migrations apply restoos-db --remote
```

كل أكلة محفوظة كسجل مستقل في `menu_items`، والأقسام والأحجام والإضافات والعروض ومواعيد العمل والتوصيل في جداول منفصلة. بيانات JSON القديمة تُحفظ في `restaurant_data_backup` كنسخة احتياطية بعد الترحيل؛ الموقع ولوحة الإدارة يقرآن ويكتبان الجداول الجديدة.

## تشغيل الموقع محلياً على قاعدة D1 الأونلاين

من جذر الـ workspace:

```powershell
pnpm install
```

أنشئ `artifacts/mat3am-ordering/.dev.vars` (مستثنى من Git) لإعداد دخول الأدمن محلياً:

```text
ADMIN_PASSWORD=اختر-كلمة-مرور-قوية
ADMIN_SESSION_SECRET=قيمة-عشوائية-سرية-لا-تقل-عن-32-حرفا
```

من مجلد `artifacts/mat3am-ordering`:

```powershell
$env:PORT = "4173"
$env:BASE_PATH = "/"
pnpm run build
pnpm run cf:dev
```

افتح `http://127.0.0.1:8788`. استخدم `/admin` لدخول لوحة الإدارة. بيانات الدخول المكتوبة في `.dev.vars` محلية للتطوير؛ اضبط أسرار الإنتاج منفصلة عند النشر.

## النشر على Cloudflare Workers

أنشئ أولاً bucket في Cloudflare R2 باسم `restaurant-images` من لوحة Cloudflare، ثم اربطه بالـ Worker باسم binding هو `IMAGES` (الإعداد موجود في `wrangler.toml`). بعد ربط حساب Wrangler:

```powershell
$env:PORT = "4173"
$env:BASE_PATH = "/"
pnpm run build
pnpm dlx wrangler secret put ADMIN_PASSWORD
pnpm dlx wrangler secret put ADMIN_SESSION_SECRET
pnpm run cf:deploy
```

اختر كلمة مرور قوية وسر جلسة عشوائياً لا يقل عن 32 حرفاً. إعداد `remote = true` خاص باتصال التطوير المحلي؛ النشر يستخدم ربط D1 المعتاد.

عند ضبط Workers Builds لمستودع GitHub، اختر جذر المستودع `/` واضبط:

- **Build command:** `pnpm install --frozen-lockfile && PORT=4173 BASE_PATH=/ pnpm --filter @workspace/mat3am-ordering run build`
- **Deploy command:** `pnpm --dir artifacts/mat3am-ordering run cf:deploy`

اسم Worker في `wrangler.toml` هو `restaurant` ويجب أن يطابق اسم الخدمة في Cloudflare.

## لوحة الإدارة والطلبات

- صفحة الإدارة: `/admin`.
- إدارة المنيو: إضافة الأصناف وتعديلها وحذفها؛ التغييرات تُحفظ في D1.
- صور الأصناف: من نموذج الصنف اضغط «اختر صورة من الجهاز». تُرفع الصور المدعومة (JPG وPNG وWebP وAVIF، حتى 5 ميجابايت) إلى R2 وتُعرض من خلال Worker.
- متابعة الطلبات: عرض الطلبات وتحديث حالتها.
- عند تأكيد العميل الطلب، يتحقق الخادم من الأسعار ورسوم التوصيل والحد الأدنى من بيانات D1، ثم يحفظ الطلب ويفتح رسالة واتساب الجاهزة.
- إذا تعذر حفظ الطلب، تظهر رسالة خطأ ولا تُمسح السلة.
- السلة وبيانات العميل تُحفظ محلياً على جهاز العميل؛ الطلب المؤكد فقط يُحفظ مركزياً.

## التحقق والبناء

```powershell
pnpm run typecheck
$env:PORT = "4173"
$env:BASE_PATH = "/"
pnpm run build
```

صور المطعم وبيانات المثال موجودة في `src/data/restaurants/furn-elhara.ts` وتُستخدم لتهيئة الجداول المنفصلة في D1 عند أول زيارة فقط. بعد ذلك تكون بيانات D1 هي المصدر المستخدم للموقع.
