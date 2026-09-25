const RESEND_API_KEY = process.env.RESEND_API_KEY;
import { checkRateLimit, getClientIP } from "../lib/rate-limit.js";

const EMAIL_TEMPLATES = {

  welcome: {
    subject: "🎉 خوش آمدی به مشتری‌یار!",
    html: (data) => `
      <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;padding:30px;background:#f8fafc;max-width:600px;margin:auto;border-radius:16px;">
        <h1 style="color:#2563eb;text-align:center;">مشتری‌یار</h1>
        <h2 style="color:#1e293b;font-size:18px;">سلام ${data.name || ''} 👋</h2>
        <p style="color:#475569;line-height:1.9;font-size:14px;">
          خوشحالیم که به مشتری‌یار پیوستی! 🎉<br>
          حالا می‌تونی دستیار هوشمند رو روی سایتت فعال کنی.
        </p>
        <div style="text-align:center;margin:30px 0;">
          <a href="https://moshtriyar.ir/dashboard.html" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:800;">
            🎯 برو به داشبورد
          </a>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;">© ۱۴۰۵ مشتری‌یار</p>
      </div>
    `
  },

  payment_approved: {
    subject: "✅ اشتراکت فعال شد!",
    html: (data) => `
      <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;padding:30px;background:#f8fafc;max-width:600px;margin:auto;border-radius:16px;">
        <h1 style="color:#16a34a;text-align:center;">✅ فعال شد!</h1>
        <h2 style="color:#1e293b;">سلام ${data.name || ''} 🎉</h2>
        <p style="color:#475569;line-height:1.9;font-size:14px;">
          پرداختت تایید شد و اشتراکت فعال شد.
        </p>
        <p style="color:#94a3b8;font-size:12px;text-align:center;">© ۱۴۰۵ مشتری‌یار</p>
      </div>
    `
  },

  payment_rejected: {
    subject: "❌ پرداختت تایید نشد",
    html: (data) => `
      <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;padding:30px;background:#f8fafc;max-width:600px;margin:auto;border-radius:16px;">
        <h1 style="color:#dc2626;text-align:center;">❌ پرداخت تایید نشد</h1>
        <p style="color:#475569;font-size:14px;">با پشتیبانی تماس بگیر.</p>
      </div>
    `
  },

  expiry_warning: {
    subject: "⏰ اشتراکت داره تموم می‌شه",
    html: (data) => `
      <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;padding:30px;background:#f8fafc;max-width:600px;margin:auto;border-radius:16px;">
        <h1 style="color:#d97706;text-align:center;">⏰ ${data.daysLeft || 3} روز مونده</h1>
        <p style="color:#475569;font-size:14px;">اشتراکت رو تمدید کن.</p>
      </div>
    `
  
  },

  admin_new_user: {
    subject: "🆕 کاربر جدید در مشتری‌یار!",
    html: (data) => `
      <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;padding:30px;background:#f8fafc;max-width:600px;margin:auto;border-radius:16px;">
        <h1 style="color:#2563eb;text-align:center;">🆕 کاربر جدید</h1>
        <h2 style="color:#1e293b;font-size:16px;">یک کاربر جدید ثبت‌نام کرد</h2>
        <div style="background:#eff6ff;padding:15px;border-radius:10px;margin:20px 0;font-size:14px;">
          <p style="margin:5px 0;"><strong>👤 نام:</strong> ${data.name || 'نامشخص'}</p>
          <p style="margin:5px 0;"><strong>📧 ایمیل:</strong> ${data.email || 'نامشخص'}</p>
          <p style="margin:5px 0;"><strong>🕐 زمان:</strong> ${data.time || ''}</p>
        </div>
        <div style="text-align:center;margin:25px 0;">
          <a href="https://moshtriyar.ir/admin.html" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 25px;border-radius:10px;text-decoration:none;font-weight:800;">
            📊 پنل ادمین
          </a>
        </div>
      </div>
    `
  },

  admin_new_payment: {
    subject: "💰 پرداخت جدید در مشتری‌یار!",
    html: (data) => `
      <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;padding:30px;background:#f8fafc;max-width:600px;margin:auto;border-radius:16px;">
        <h1 style="color:#16a34a;text-align:center;">💰 پرداخت جدید</h1>
        <h2 style="color:#1e293b;font-size:16px;">یک پرداخت جدید ثبت شد</h2>
        <div style="background:#dcfce7;padding:15px;border-radius:10px;margin:20px 0;font-size:14px;">
          <p style="margin:5px 0;"><strong>👤 کاربر:</strong> ${data.name || 'نامشخص'}</p>
          <p style="margin:5px 0;"><strong>📧 ایمیل:</strong> ${data.email || 'نامشخص'}</p>
          <p style="margin:5px 0;"><strong>💎 پلن:</strong> ${data.plan || '-'}</p>
          <p style="margin:5px 0;"><strong>💵 مبلغ:</strong> ${data.amount ? Number(data.amount).toLocaleString('fa-IR') + ' تومان' : '-'}</p>
          <p style="margin:5px 0;"><strong>🔖 کد پیگیری:</strong> ${data.tracking || '-'}</p>
        </div>
        <div style="text-align:center;margin:25px 0;">
          <a href="https://moshtriyar.ir/admin.html" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 25px;border-radius:10px;text-decoration:none;font-weight:800;">
            ✅ بررسی و تایید
          </a>
        </div>
      </div>
    `
  },

  admin_missed_call: {
    subject: "📞 تماس از دست رفته!",
    html: (data) => `
      <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;padding:30px;background:#f8fafc;max-width:600px;margin:auto;border-radius:16px;">
        <h1 style="color:#dc2626;text-align:center;">📞 تماس از دست رفته</h1>
        <h2 style="color:#1e293b;font-size:16px;">مشتری درخواست تماس کرد ولی پاسخ داده نشد</h2>
        <div style="background:#fee2e2;padding:15px;border-radius:10px;margin:20px 0;font-size:14px;">
          <p style="margin:5px 0;"><strong>🌐 سایت:</strong> ${data.site || 'نامشخص'}</p>
          <p style="margin:5px 0;"><strong>🕐 زمان:</strong> ${data.time || ''}</p>
        </div>
        <div style="text-align:center;margin:25px 0;">
          <a href="https://moshtriyar.ir/operator.html" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 25px;border-radius:10px;text-decoration:none;font-weight:800;">
            🎧 پنل اپراتور
          </a>
        </div>
      </div>
    `
  }

};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Cloudflare-CDN-Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();
    // ==========================================================
  // 🧪 GET
  // ==========================================================
  if (req.method === "GET") {
    if (!RESEND_API_KEY) {
      return res.status(200).json({ ok: false, message: "RESEND_API_KEY تنظیم نشده" });
    }

    const action = req.query?.action;

    // 🛡️ محدودیت نرخ (به‌جز reminders)
    if (action !== "reminders") {
      const clientIP = getClientIP(req);
      const rateCheck = await checkRateLimit(clientIP, "send-email-get", 10, 60);
      if (!rateCheck.allowed) {
        return res.status(429).json({
          ok: false,
          error: `محدودیت ارسال. ${rateCheck.retryAfter} ثانیه دیگر تلاش کنید.`,
          retryAfter: rateCheck.retryAfter,
        });
      }
    }

    // ==========================================================
    // 🕐 Cron: یادآوری انقضا
    // ==========================================================
    if (action === "reminders") {
      const secret = req.query?.secret;
      const expectedSecret = process.env.CRON_SECRET || "moshtriyar-cron-2026-secret";

      if (secret !== expectedSecret) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }

      try {
        const now = new Date();
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        const profilesRes = await fetch(
          `${process.env.SUPABASE_URL}/rest/v1/profiles?subscription_end_date=gte.${now.toISOString()}&subscription_end_date=lte.${threeDaysLater.toISOString()}&select=id,email,full_name,subscription_end_date,expiry_reminded_at`,
          {
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
          }
        );

        const profiles = await profilesRes.json();

        if (!Array.isArray(profiles)) {
          return res.status(500).json({
            ok: false,
            error: "Supabase response invalid",
            raw: profiles,
          });
        }

        if (profiles.length === 0) {
          return res.status(200).json({
            ok: true,
            message: "هیچ کاربری در ۳ روز آینده منقضی نمی‌شه.",
            sent: 0
          });
        }

        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const toRemind = profiles.filter(p =>
          !p.expiry_reminded_at || new Date(p.expiry_reminded_at) < oneDayAgo
        );

        const results = [];

        for (const user of toRemind) {
          try {
            const expiresAt = new Date(user.subscription_end_date);
            const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            const r = await fetch("https://api.resend.com/emails", {
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
                      اشتراک مشتری‌یار شما <strong style="color:#d97706;">${daysLeft} روز</strong> دیگه تموم می‌شه.<br>
                      برای ادامه بدون وقفه، تمدید کن.
                    </p>
                    <div style="text-align:center;margin:30px 0;">
                      <a href="https://moshtriyar.ir/billing.html" style="display:inline-block;background:#d97706;color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:800;">
                        💳 تمدید اشتراک
                      </a>
                    </div>
                    <p style="color:#94a3b8;font-size:12px;text-align:center;">© ۱۴۰۵ مشتری‌یار</p>
                  </div>
                `,
              }),
            });

            if (r.ok) {
              await fetch(
                `${process.env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
                {
                  method: "PATCH",
                  headers: {
                    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
                    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ expiry_reminded_at: now.toISOString() }),
                }
              );
              results.push({ email: user.email, ok: true, daysLeft });
            } else {
              const errData = await r.json();
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
        return res.status(500).json({ ok: false, error: err.message });
      }
    }

    // ==========================================================
    // ⚙️ خواندن تنظیمات سایت (برای ویجت)
    // ==========================================================
    if (action === "settings") {
      const userId = req.query?.userId;
      if (!userId) {
        return res.status(400).json({ ok: false, error: "userId required" });
      }

      try {
        const sitesRes = await fetch(
          `${process.env.SUPABASE_URL}/rest/v1/websites?user_id=eq.${userId}&active=eq.true&select=id&limit=1`,
          {
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
          }
        );
        const sitesData = await sitesRes.json();

        if (!sitesData?.[0]) {
          return res.status(200).json({ ok: true, settings: null, message: "no site" });
        }

        const settingsRes = await fetch(
          `${process.env.SUPABASE_URL}/rest/v1/site_settings?website_id=eq.${sitesData[0].id}&select=*&limit=1`,
          {
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
          }
        );
        const settingsData = await settingsRes.json();

        return res.status(200).json({
          ok: true,
          settings: settingsData?.[0] || null,
        });
      } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
    }

    // تست عادی
    return res.status(200).json({
      ok: true,
      message: "API is working ✅",
      envOk: true,
      usage: "POST {to,type,data} | GET ?action=reminders | GET ?action=settings&userId=...",
    });
  }

  // ==========================================================
  // 📨 POST
  // ==========================================================
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  if (!RESEND_API_KEY) {
    return res.status(500).json({ ok: false, error: "RESEND_API_KEY missing" });
  }

  // ==========================================================
  // ⚙️ POST با action=settings → ذخیره تنظیمات
  // ==========================================================
  const postAction = req.query?.action;

  if (postAction === "settings") {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ ok: false, error: "No token" });

    const userRes = await fetch(
      `${process.env.SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!userRes.ok) {
      return res.status(401).json({ ok: false, error: "Invalid token" });
    }
    const user = await userRes.json();

    try {
      const { websiteId, settings } = req.body || {};
      if (!websiteId || !settings) {
        return res.status(400).json({ ok: false, error: "websiteId and settings required" });
      }

      const sitesRes = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/websites?id=eq.${websiteId}&user_id=eq.${user.id}&select=id`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      const sites = await sitesRes.json();
      if (!sites?.[0]) {
        return res.status(403).json({ ok: false, error: "Access denied" });
      }

      const data = {
        website_id: websiteId,
        color: settings.color || "#2563eb",
        title: settings.title || "دستیار هوشمند",
        welcome_message: settings.welcome_message || "سلام 👋 چطور می‌تونم کمکتون کنم؟",
        operator_name: settings.operator_name || null,
        position: settings.position || "right",
        enabled: settings.enabled !== false,
        updated_at: new Date().toISOString(),
      };

      const existingRes = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/site_settings?website_id=eq.${websiteId}&select=id`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      const existing = await existingRes.json();

      let resultRes;
      if (existing?.[0]) {
        resultRes = await fetch(
          `${process.env.SUPABASE_URL}/rest/v1/site_settings?id=eq.${existing[0].id}`,
          {
            method: "PATCH",
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify(data),
          }
        );
      } else {
        resultRes = await fetch(
          `${process.env.SUPABASE_URL}/rest/v1/site_settings`,
          {
            method: "POST",
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify(data),
          }
        );
      }

      const result = await resultRes.json();
      return res.status(200).json({ ok: true, settings: result?.[0] });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // ==========================================================
  // 📧 محدودیت نرخ برای POST معمولی
  // ==========================================================
  const clientIP = getClientIP(req);
  const rateCheck = await checkRateLimit(clientIP, "send-email-post", 5, 60);

  if (!rateCheck.allowed) {
    return res.status(429).json({
      ok: false,
      error: `محدودیت ارسال. ${rateCheck.retryAfter} ثانیه دیگر تلاش کنید.`,
      retryAfter: rateCheck.retryAfter,
    });
  }

  // ==========================================================
  // 📨 POST: ارسال ایمیل معمولی
  // ==========================================================
  try {
    const { to, type, data } = req.body || {};

    if (!to || !type) {
      return res.status(400).json({ ok: false, error: "to and type required" });
    }

    const template = EMAIL_TEMPLATES[type];
    if (!template) {
      return res.status(400).json({ ok: false, error: "invalid email type" });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "مشتری‌یار <noreply@moshtriyar.ir>",
        to: [to],
        subject: template.subject,
        html: template.html(data || {}),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend error:", result);
      return res.status(500).json({
        ok: false,
        error: result?.message || "Email sending failed",
      });
    }

    return res.status(200).json({ ok: true, id: result.id });

  } catch (err) {
    console.error("Send email exception:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
