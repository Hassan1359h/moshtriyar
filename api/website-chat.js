// ==========================================================
// 🤖 مشتری‌یار | Website Chat API
// مسیر: api/website-chat.js
// ==========================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.5-flash-lite",
];

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = `تو «مشتری‌یار» هستی؛ یک دستیار پشتیبانی هوشمند، مودب، صبور و حرفه‌ای فارسی‌زبان که در وب‌سایت مشغول کمک به مشتریان است.

وظایف تو:
- پاسخ دادن به سوالات مشتریان درباره محصولات، خدمات، سفارش‌ها، قیمت‌ها، ارسال و پیگیری
- راهنمایی گام‌به‌گام برای حل مشکلات کاربران
- برخورد محترمانه، گرم و صمیمی با مشتریان
- پاسخ‌ها را کوتاه، مفید، دقیق و قابل‌فهم بده
- از ایموجی‌های مناسب (اما نه بیش از حد) استفاده کن
- همیشه فارسی پاسخ بده مگر اینکه کاربر به زبان دیگری صحبت کند
- اگر سوال کاربر نامرتبط با پشتیبانی بود، با احترام او را به موضوع اصلی برگردان

🚨 مهم‌ترین قاعده — درخواست پشتیبان انسانی:
هر وقت کاربر درخواست‌هایی مثل «می‌خوام با پشتیبان انسانی صحبت کنم»، «اپراتور»، «تماس با پشتیبانی»، «شکایت»، «مشکل جدی»، «مدیر سایت»، «انسان واقعی» یا مشابه آن داشت، باید پاسخ بدی به این شکل:

«برای ارتباط مستقیم با تیم پشتیبانی، لطفاً از طریق 📩 فرم تماس با ما در سایت استفاده کنید. همکاران ما در اسرع وقت به پیام شما پاسخ می‌دهند. 🌸»

⚠️ هرگز شماره تلفن، آدرس یا ایمیل از خودت نساز.

هرگز اطلاعات نادرست یا ساختگی ارائه نده.`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      reply: "فقط درخواست‌های POST پذیرفته می‌شوند.",
    });
  }

  try {
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY تنظیم نشده است");
      return res.status(500).json({
        ok: false,
        reply: "⚠️ سرویس هوش مصنوعی در دسترس نیست.",
      });
    }

    const { message, history } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        ok: false,
        reply: "لطفاً پیام خود را وارد کنید. 🙏",
      });
    }

    const contents = [];

    if (Array.isArray(history) && history.length > 0) {
      const trimmed = history.slice(-10);
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

    contents.push({
      role: "user",
      parts: [{ text: message.trim() }],
    });

    const requestBody = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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

    // 🔁 تلاش با مدل‌های مختلف + Retry خودکار
    let data = null;
    let response = null;
    let usedModel = null;
    let lastError = null;

    for (const model of GEMINI_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const url = `${GEMINI_BASE_URL}/${model}:generateContent`;
          console.log(`🔄 [${model}] attempt ${attempt}`);

          const r = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": GEMINI_API_KEY,
            },
            body: JSON.stringify(requestBody),
          });

          const d = await r.json();

          if (r.ok && d?.candidates?.[0]?.content?.parts) {
            response = r;
            data = d;
            usedModel = model;
            console.log(`✅ Success: ${model} (attempt ${attempt})`);
            break;
          }

          if ((r.status === 503 || r.status === 429) && attempt === 1) {
            console.warn(`⏳ ${model} busy (${r.status}), retrying in 1s...`);
            await new Promise((res) => setTimeout(res, 1000));
            lastError = d?.error?.message || `Status ${r.status}`;
            continue;
          }

          console.warn(`⚠️ ${model} failed (${r.status}): ${d?.error?.message}`);
          lastError = d?.error?.message || `Status ${r.status}`;
          break;
        } catch (err) {
          console.warn(`❌ ${model} exception:`, err.message);
          lastError = err.message;
          break;
        }
      }
      if (data) break;
    }

    if (!data || !response) {
      return res.status(200).json({
        ok: false,
        reply:
          "⚠️ سرویس هوش مصنوعی الان شلوغه. لطفاً چند لحظه دیگه دوباره تلاش کنید. 🙏",
        error: lastError || "All models failed",
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("")
        .trim() || "";

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
