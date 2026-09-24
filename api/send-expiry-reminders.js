const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
  return res.json();
}

export default async function handler(req, res) {
  // 🔐 فقط با کلید امن می‌شه صدا زد
  const secret = req.headers["x-cron-secret"] || req.query.secret;
  const expectedSecret = process.env.CRON_SECRET || "moshtriyar-cron-2026";

  if (secret !== expectedSecret) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // 📊 پیدا کردن کاربرهایی که ۳ روز دیگه اشتراکشون تموم می‌شه
    const profiles = await supabase(
      `/profiles?plan_expires_at=gte.${now.toISOString()}&plan_expires_at=lte.${threeDaysLater.toISOString()}&select=id,email,full_name,plan_expires_at,expiry_reminded_at`
    );

    if (!profiles || profiles.length === 0) {
      return res.status(200).json({
        ok: true,
        message: "هیچ کاربری در ۳ روز آینده منقضی نمی‌شه.",
        sent: 0
      });
    }

    // 🎯 فیلتر: اون‌هایی که توی ۲۴ ساعت گذشته ایمیل نگرفتن
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const toRemind = profiles.filter(p => {
      if (!p.expiry_reminded_at) return true;
      return new Date(p.expiry_reminded_at) < oneDayAgo;
    });

    if (toRemind.length === 0) {
      return res.status(200).json({
        ok: true,
        message: "همه کاربران قبلاً یادآوری گرفتن.",
        sent: 0
      });
    }

    // 📧 ارسال ایمیل به هر کاربر
    const results = [];
    for (const user of toRemind) {
      try {
        const expiresAt = new Date(user.plan_expires_at);
        const daysLeft = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "مشتری‌یار <noreply@moshtriyar.ir>",
            to: [user.email],
            subject: `⏰ فقط ${daysLeft} روز از اشتراکت مونده`,
            html: `
              <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;padding:30px;background:#f8fafc;max-width:600px;margin:auto;border-radius:16px;">
                <h1 style="color:#d97706;text-align:center;font-size:24px;margin:0;">⏰ ${daysLeft} روز مونده</h1>

                <h2 style="color:#1e293b;font-size:18px;margin-top:25px;">سلام ${user.full_name || ''} 👋</h2>

                <p style="color:#475569;line-height:1.9;font-size:14px;">
                  اشتراک مشتری‌یار شما <strong style="color:#d97706;">${daysLeft} روز</strong> دیگه تموم می‌شه.
                  <br>
                  برای ادامه استفاده بدون وقفه، لطفاً اشتراکت رو تمدید کن.
                </p>

                <div style="background:#fef3c7;padding:15px;border-radius:10px;margin:20px 0;font-size:13px;color:#92400e;">
                  📅 تاریخ انقضا: <strong>${expiresAt.toLocaleDateString('fa-IR')}</strong>
                </div>

                <div style="text-align:center;margin:30px 0;">
                  <a href="https://moshtriyar.ir/billing.html" style="display:inline-block;background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;">
                    💳 تمدید اشتراک
                  </a>
                </div>

                <p style="color:#94a3b8;font-size:12px;text-align:center;">
                  © ۱۴۰۵ مشتری‌یار — تمام حقوق محفوظ است
                </p>
              </div>
            `,
          }),
        });

        if (response.ok) {
          // ✅ علامت‌گذاری که ایمیل فرستاده شد
          await supabase(`/profiles?id=eq.${user.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              expiry_reminded_at: now.toISOString()
            }),
          });

          results.push({ email: user.email, ok: true, daysLeft });
        } else {
          const errData = await response.json();
          results.push({ email: user.email, ok: false, error: errData?.message });
        }
      } catch (err) {
        results.push({ email: user.email, ok: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.ok).length;

    return res.status(200).json({
      ok: true,
      message: `${successCount} ایمیل یادآوری ارسال شد.`,
      sent: successCount,
      total: toRemind.length,
      results
    });

  } catch (err) {
    console.error("Expiry reminder error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
