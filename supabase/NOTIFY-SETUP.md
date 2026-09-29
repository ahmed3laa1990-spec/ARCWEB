# تنبيه الطلبات الجديدة بالإيميل

كل طلب جديد في جدول `leads` (نموذج عرض السعر أو "اتصلوا بي") يرسل إيميلاً فورياً إلى `info@byarcsa.com`.

الأجزاء:
- `functions/notify-lead/index.ts` — دالة ترسل الإيميل عبر Resend.
- `migrations/0003_lead_notifications.sql` — مشغّل (trigger) يستدعي الدالة بعد كل طلب.

## خطوات التفعيل (مرة واحدة)

1. **Resend**: أنشئ حساباً على resend.com، أضف الدومين `byarcsa.com` وأضف سجلات DNS التي يطلبها، ثم أنشئ API Key.
2. **أسرار الدالة** (Supabase ← Edge Functions ← Secrets):
   - `RESEND_API_KEY` = مفتاح Resend
   - `WEBHOOK_SECRET` = كلمة سر طويلة عشوائية
   - اختياري: `NOTIFY_TO` (أكثر من بريد مفصولة بفاصلة)، `NOTIFY_FROM`
3. **نشر الدالة** `notify-lead` مع إيقاف "Verify JWT".
4. **تشغيل** `migrations/0003_lead_notifications.sql` في SQL Editor.
5. **ربط المشغّل بالدالة** في SQL Editor:
   ```sql
   insert into public.app_secrets (key, value) values
     ('lead_notify_url', 'https://cavojuqysdabhnidhhqa.supabase.co/functions/v1/notify-lead'),
     ('lead_notify_secret', '<نفس WEBHOOK_SECRET>')
   on conflict (key) do update set value = excluded.value;
   ```
6. أرسل طلباً تجريبياً من الموقع وتأكد من وصول الإيميل.

إذا فشل الإرسال لأي سبب يبقى الطلب محفوظاً في اللوحة، فالتنبيه لا يمكن أن يُضيّع طلباً.
