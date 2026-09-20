// ==========================================================
// 🤖 مشتری‌یار | Website Chat API
// مسیر: api/website-chat.js
// مدل: Google Gemini (with multi-model fallback)
// ==========================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 📋 لیست مدل‌ها به ترتیب اولویت — اگه یکی شلوغ بود، بعدی امتحان می‌شه
const GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
];

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

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
  // 🌐 هدرهای CORS
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

    // 📦 بدنه درخواست مشترک برای همه مدل‌ها
    const requestBody = {
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
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };

    // 🔁 تلاش با مدل‌های مختلف به ترتیب
    let data = null;
    let response = null;
    let usedModel = null;
    let lastError = null;

    for (const model of GEMINI_MODELS) {
      try {
        const url = `${GEMINI_BASE_URL}/${model}:generateContent`;
        console.log(`🔄 Trying model: ${model}`);

        const r = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify(requestBody),
        });

        const d = await r.json();

        // ✅ موفق بود
        if (r.ok && d?.candidates?.[0]?.content?.parts) {
          response = r;
          data = d;
          usedModel = model;
          console.log(`✅ Success with model: ${model}`);
          break;
        }

        // 🔄 خطای 503 یا 429 → برو مدل بعدی
        if (r.status === 503 || r.status === 429) {
          console.warn(`⏭️ Model ${model} unavailable (${r.status}), trying next...`);
          lastError = d?.error?.message || `Status ${r.status}`;
          continue;
        }

        // ❌ خطای دیگه (مثل 404 یا 400) → همون رو ثبت کن، برو بعدی
        console.warn(`⚠️ Model ${model} error (${r.status}):`, d?.error?.message);
        lastError = d?.error?.message || `Status ${r.status}`;
        continue;
      } catch (err) {
        console.warn(`❌ Model ${model} exception:`, err.message);
        lastError = err.message;
        continue;
      }
    }

    // 🚫 هیچ مدلی جواب نداد
    if (!data || !response) {
      return res.status(200).json({
        ok: false,
        reply:
          "⚠️ سرویس هوش مصنوعی الان شلوغه. لطفاً چند لحظه دیگه دوباره تلاش کنید. 🙏",
        error: lastError || "All models failed",
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
      model: usedModel,
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
