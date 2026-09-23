const RESEND_API_KEY = process.env.RESEND_API_KEY;

// 📧 قالب‌های ایمیل
const EMAIL_TEMPLATES = {

  welcome: {
    subject: "🎉 خوش آمدی به مشتری‌یار!",
    html: (data) => `
      <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;padding:30px;background:#f8fafc;max-width:600px;margin:auto;border-radius:16px;">
        <div style="text-align:center;margin-bottom:25px;">
          <h1 style="color:#2563eb;font-size:24px;margin:0;">مشتری‌یار</h1>
          <p style="color:#64748b;font-size:14px;margin:8px 0 0;">دستیار هوشمند مدیریت مشتریان</p>
        </div>

        <h2 style="color:#1e293b;font-size:18px;">سلام ${data.name || ''} 👋</h2>

        <p style="color:#475569;line-height:1.9;font-size:14px;">
          خوشحالیم که به مشتری‌یار پیوستی! 🎉
          <br>
          حالا می‌تونی دستیار هوشمند رو روی سایتت فعال کنی و به مشتریانت ۲۴ ساعته پاسخ بدی.
        </p>

        <h3 style="color:#1e293b;font-size:16px;margin-top:25px;">🚀 برای شروع:</h3>
        <ol style="color:#475569;line-height:2;font-size:14px;padding-right:20px;">
          <li>وارد داشبورد شو</li>
          <li>افزونه وردپرس رو نصب کن</li>
          <li>سایتت رو وصل کن</li>
          <li>۳ روز رایگان از همه امکانات استفاده کن</li>
        </ol>

        <div style="text-align:center;margin:30px 0;">
          <a href="https://moshtriyar.ir/dashboard.html" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;">
            🎯 برو به داشبورد
          </a>
        </div>

        <div style="background:#eff6ff;padding:15px;border-radius:10px;font-size:13px;color:#1e40af;">
          💡 اگه سؤالی داری، از راهنمای ما استفاده کن:
          <a href="https://moshtriyar.ir/help.html" style="color:#2563eb;font-weight:700;">help.html</a>
        </div>

        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:25px;">
          © ۱۴۰۵ مشتری‌یار — تمام حقوق محفوظ است
        </p>
      </div>
    `
  },

  payment_approved: {
    subject: "✅ اشتراکت فعال شد!",
    html: (data) => `
      <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;padding:30px;background:#f8fafc;max-width:600px;margin:auto;border-radius:16px;">
        <div style="text-align:center;margin-bottom:25px;">
          <h1 style="color:#16a34a;font-size:24px;margin:0;">✅ فعال شد!</h1>
        </div>

        <h2 style="color:#1e293b;font-size:18px;">سلام ${data.name || ''} 🎉</h2>

        <p style="color:#475569;line-height:1.9;font-size:14px;">
          پرداختت تایید شد و اشتراکت با موفقیت فعال شد.
        </p>

        <div style="background:#dcfce7;padding:20px;border-radius:12px;margin:20px 0;">
          <p style="margin:0 0 10px;color:#065f46;font-size:14px;"><strong>💎 نوع پلن:</strong> ${data.plan || 'حرفه‌ای'}</p>
          <p style="margin:0;color:#065f46;font-size:14px;"><strong>📅 تاریخ انقضا:</strong> ${data.expiresAt || ''}</p>
        </div>

        <div style="text-align:center;margin:30px 0;">
          <a href="https://moshtriyar.ir/dashboard.html" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#059669);color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;">
            📊 مشاهده داشبورد
          </a>
        </div>

        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:25px;">
          © ۱۴۰۵ مشتری‌یار — تمام حقوق محفوظ است
        </p>
      </div>
    `
  },

  payment_rejected: {
    subject: "❌ پرداختت تایید نشد",
    html: (data) => `
      <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;padding:30px;background:#f8fafc;max-width:600px;margin:auto;border-radius:16px;">
        <h1 style="color:#dc2626;font-size:24px;text-align:center;">❌ پرداخت تایید نشد</h1>

        <h2 style="color:#1e293b;font-size:18px;">سلام ${data.name || ''}</h2>

        <p style="color:#475569;line-height:1.9;font-size:14px;">
          متأسفانه پرداخت شما تایید نشد. این می‌تونه به‌خاطر یکی از این دلایل باشه:
        </p>

        <ul style="color:#475569;line-height:2;font-size:14px;padding-right:20px;">
          <li>کد پیگیری اشتباه وارد شده</li>
          <li>مبلغ واریزی مطابقت نداره</li>
          <li>اطلاعات پرداخت ناقصه</li>
        </ul>

        <div style="background:#fef3c7;padding:15px;border-radius:10px;margin:20px 0;font-size:13px;color:#92400e;">
          ⚠️ اگه مطمئنی پرداختت درست بوده، با پشتیبانی تماس بگیر.
        </div>

        <div style="text-align:center;margin:30px 0;">
          <a href="https://moshtriyar.ir/dashboard.html" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;">
            📊 بازگشت به داشبورد
          </a>
        </div>

        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:25px;">
          © ۱۴۰۵ مشتری‌یار
        </p>
      </div>
    `
  },

  expiry_warning: {
    subject: "⏰ اشتراکت داره تموم می‌شه",
    html: (data) => `
      <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;padding:30px;background:#f8fafc;max-width:600px;margin:auto;border-radius:16px;">
        <h1 style="color:#d97706;font-size:24px;text-align:center;">⏰ ${data.daysLeft} روز مونده</h1>

        <h2 style="color:#1e293b;font-size:18px;">سلام ${data.name || ''}</h2>

        <p style="color:#475569;line-height:1.9;font-size:14px;">
          اشتراک مشتری‌یار شما <strong>${data.daysLeft} روز</strong> دیگه تموم می‌شه.
          <br>
          برای ادامه استفاده بدون وقفه، لطفاً اشتراکت رو تمدید کن.
        </p>

        <div style="text-align:center;margin:30px 0;">
          <a href="https://moshtriyar.ir/dashboard.html" style="display:inline-block;background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;">
            💳 تمدید اشتراک
          </a>
        </div>

        <p style="color:#94a3b8;font-size:12px;text-align:center;">
          © ۱۴۰۵ مشتری‌یار
        </p>
      </div>
    `
  }

};


export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  // 🧪 تست از مرورگر
if (req.method === "GET") {
  return res.status(200).json({
    ok: true,
    message: "API is working ✅",
    usage: "POST with { to, type, data }",
    availableTypes: ["welcome", "payment_approved", "payment_rejected", "expiry_warning"]
  });
}

if (req.method !== "POST") {
  return res.status(405).json({ ok: false, error: "POST only" });
}
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
