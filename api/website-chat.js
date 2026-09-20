// ==========================================================
// 🤖 مشتری‌یار | Website Chat API
// مسیر: api/website-chat.js
// مدل: Google Gemini 2.5 Flash
// ==========================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// 🎭 شخصیت دستیار مشتری‌یار
const SYSTEM_PROMPT = `تو «مشتری‌یار» هستی؛ یک دستیار پشتیبانی هوشمند، مودب، صبور و حرفه‌ای فارسی‌زبان که در وب‌سایت مشغول کمک به مشتریان است.

وظایف تو:
- پاسخ دادن به سوالات مشتریان درباره محصولات، خدمات، سفارش‌ها، قیمت‌ها، ارسال و پیگیری
- راهنمایی گام‌به‌گام برای حل مشکلات کاربران
- برخورد محترمانه، گرم و صمیمی با مشتریان
- اگر اطلاعات کافی نداری، صادقانه بگو و کاربر را به پشتیبانی انسانی ارجاع بده
- پاسخ‌ها را کوتاه، مفید، دقیق و قابل‌فهم بده
- از ایموجی‌های مناسب (اما نه بیش از حد) استفاده کن
- همیشه فارسی پاسخ بده مگر اینکه کاربر به زبان دیگری صحبت کند
- اگر سوال کاربر نامرتبط با پشتیبانی بود، با احترام او را به موضوع اصلی برگردان

هرگز اطلاعات نادرست یا ساختگی ارائه نده.`;

export default async function handler(req, res) {
  // 🌐 هدرهای CORS (در صورت نیاز به فراخوانی از دامنه‌های دیگر)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ فقط POST مجاز است
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      reply: "فقط درخواست‌های POST پذیرفته می‌شوند.",
    });
  }

  try {
    // 🔑 بررسی کلید API
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY تنظیم نشده است");
      return res.status(500).json({
        ok: false,
        reply:
          "⚠️ سرویس هوش مصنوعی در دسترس نیست. لطفاً بعداً تلاش کنید یا با پشتیبانی تماس بگیرید.",
      });
    }

    // 📨 دریافت پیام و تاریخچه
    const { message, history } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        ok: false,
        reply: "لطفاً پیام خود را وارد کنید. 🙏",
      });
    }

    // 🧱 ساخت محتوای گفتگو
    const contents = [];

    if (Array.isArray(history) && history.length > 0) {
      const trimmed = history.slice(-10); // فقط ۱۰ پیام آخر
      for (const turn of trimmed) {
        if (
          turn &&
          (turn.role === "user" || turn.role === "model") &&
          typeof turn.text === "string"
        ) {
          contents.push({
            role: turn.role,
            parts: [{ text: turn.text }],
          });
        }
      }
    }

    // پیام جدید کاربر
    contents.push({
      role: "user",
      parts: [{ text: message.trim() }],
    });

    // 🌐 فراخوانی Gemini API
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
          temperature: 0.8,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
  console.error("Gemini API Error:", JSON.stringify(data, null, 2));
  return res.status(200).json({
    ok: true,
    reply: `🔍 DEBUG INFO\nStatus: ${response.status}\nMessage: ${
      data?.error?.message || JSON.stringify(data)
    }`,
  });
    }

    // 🧹 استخراج پاسخ
    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("")
        .trim() || "";

    // 🔍 بررسی دلایل مسدود شدن
    const finishReason = data?.candidates?.[0]?.finishReason;
    if (!reply && finishReason === "SAFETY") {
      return res.status(200).json({
        ok: false,
        reply:
          "متأسفم، نمی‌توانم به این درخواست پاسخ دهم. لطفاً سوال خود را به شکل دیگری مطرح کنید. 🙏",
      });
    }

    if (!reply) {
      return res.status(200).json({
        ok: false,
        reply:
          "⚠️ پاسخی دریافت نشد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.",
      });
    }

    // ✅ پاسخ موفق
    return res.status(200).json({
      ok: true,
      reply,
      model: "gemini-2.5-flash",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Server Exception:", error);
    return res.status(500).json({
      ok: false,
      reply:
        "⚠️ خطای غیرمنتظره در سرور. لطفاً بعداً تلاش کنید یا با پشتیبانی انسانی تماس بگیرید.",
      error: error?.message || String(error),
    });
  }
}
