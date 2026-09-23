const RESEND_API_KEY = process.env.RESEND_API_KEY;

const EMAIL_TEMPLATES = {

  welcome: {
    subject: "🎉 خوش آمدی به مشتری‌یار!",
    html: (data) => `
      <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;padding:30px;background:#f8fafc;max-width:600px;margin:auto;border-radius:16px;">
        <h1 style="color:#2563eb;text-align:center;">مشتری‌یار</h1>
        <h2 style="color:#1e293b;font-size:18px;">سلام ${data.name || ''} 👋</h2>
        <p style="color:#475569;line-height:1.9;font-size:14px;">
          خوشحالیم که به مشتری‌یار پیوستی! 🎉
          <br>
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
  }

};


export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // 🧪 تست از مرورگر
  if (req.method === "GET") {
    if (!RESEND_API_KEY) {
      return res.status(200).json({
        ok: false,
        message: "⚠️ RESEND_API_KEY تنظیم نشده",
      });
    }
    return res.status(200).json({
      ok: true,
      message: "API is working ✅",
      envOk: true,
      usage: "POST with { to, type, data }",
      types: ["welcome", "payment_approved", "payment_rejected", "expiry_warning"]
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  if (!RESEND_API_KEY) {
    return res.status(500).json({ ok: false, error: "RESEND_API_KEY missing" });
  }

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
