# تنبيه الطلبات الجديدة بالإيميل

كل طلب جديد في جدول `leads` (نموذج عرض السعر أو "اتصلوا بي") يرسل إيميلاً فورياً إلى `info@byarcsa.com`.

- `functions/notify-lead/index.ts` — الدالة (منشورة على المشروع arcweb، Verify JWT مُطفأ).
- `migrations/0003_lead_notifications.sql` — المشغّل وكلمة السر المشتركة (مُطبّق).

## الإعداد المتبقي
أضف في Supabase ← Edge Functions ← Secrets:
- `RESEND_API_KEY` = مفتاح Resend

اختياري: `NOTIFY_TO` (عدة عناوين مفصولة بفاصلة)، `NOTIFY_FROM` (الافتراضي `ARC Website <leads@byarcsa.com>`).

## التشخيص
ردود الدالة تُحفظ في `net._http_response`:
```sql
select id, created, status_code, left(content::text, 120) from net._http_response order by id desc limit 5;
```
- 200 `sent` = وصل الإيميل إلى Resend
- 500 `RESEND_API_KEY not set` = المفتاح غير مُضاف
- 502 `send failed` = رفض Resend (راجع Logs الدالة: الدومين غير موثّق أو المفتاح خاطئ)

إذا فشل الإرسال لأي سبب يبقى الطلب محفوظاً في اللوحة.
