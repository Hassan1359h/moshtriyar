# مشتری‌یار Production v3
نسخه کارت‌به‌کارت: ثبت‌نام، ورود، پلن، ثبت پرداخت، کد پیگیری، پنل مدیر، تأیید/رد و فعال‌سازی اشتراک ۳۰ روزه.

## Supabase
فایل `sql/schema.sql` را در SQL Editor اجرا کنید. Email Auth را فعال کنید.

## Vercel Environment Variables
`SUPABASE_URL`
`SUPABASE_PUBLISHABLE_KEY` (یا `SUPABASE_ANON_KEY`)
`SUPABASE_SECRET_KEY` (یا `SUPABASE_SERVICE_ROLE_KEY`)
`ADMIN_EMAILS` = ایمیل مدیر

کلید secret/service_role فقط روی Backend باشد و داخل GitHub نرود.

## Vercel
Framework: Other
Root: ./
Build Command: خالی
Output Directory: .
Install Command: خالی
بعد از تغییر Environment Variables، Redeploy کنید.

## پرداخت
بانک سامان — حسن نادریان — 6219-8618-2849-2446
شناسه پرداخت: شماره موبایل کاربر؛ اگر حساب با ایمیل ساخته شده و شماره موبایل در Auth ثبت نشده باشد، ایمیل به‌عنوان شناسه نشان داده می‌شود.

توجه: کارت‌به‌کارت ذاتاً تأیید دستی دارد؛ سایت به‌تنهایی صحت واریز بانکی را تضمین نمی‌کند.
