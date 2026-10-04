// ==========================================================
// 🤖 مشتری‌یار | Website Chat API (Multi-Key + Plan Limits)
// مسیر: api/website-chat.js
// ==========================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
import { checkRateLimit, getClientIP } from "../lib/rate-limit.js";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
];

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

// 📊 محدودیت هر پلن
const PLAN_LIMITS = {
  trial: { dailyMessages: 50 },
  pro: { dailyMessages: 2000 },
  business: { dailyMessages: 20000 },
};

// ==========================================================
// 🔌 اتصال به Supabase
// ==========================================================
async function supabase(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
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
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Supabase error:", err.message);
    return null;
  }
}

// ==========================================================
// 🔑 انتخاب بهترین کلید Gemini
// ==========================================================
async function getBestGeminiKey(websiteId) {
  const today = new Date().toISOString().split("T")[0];

  // 1️⃣ کلید اختصاصی سایت
  if (websiteId) {
    const site = await supabase(
      `/websites?id=eq.${websiteId}&select=gemini_key_id,gemini_keys(id,api_key,used_today,daily_limit,last_reset,active)`
    );
    const key = site?.[0]?.gemini_keys;
    if (key && key.active) {
      if (key.last_reset !== today) {
        await supabase(`/gemini_keys?id=eq.${key.id}`, {
          method: "PATCH",
          body: JSON.stringify({ used_today: 0, last_reset: today }),
        });
        return { key: key.api_key, keyId: key.id };
      }
      if (key.used_today < key.daily_limit) {
        return { key: key.api_key, keyId: key.id };
      }
    }
  }

  // 2️⃣ بهترین کلید از استخر (اول امروز رو چک کن)
  const todayKeys = await supabase(
    `/gemini_keys?active=eq.true&used_today=lt.daily_limit&order=used_today.asc&limit=1`
  );
  if (todayKeys?.[0]) {
    // اگه last_reset قدیمیه، ریستش کن
    if (todayKeys[0].last_reset !== today) {
      await supabase(`/gemini_keys?id=eq.${todayKeys[0].id}`, {
        method: "PATCH",
        body: JSON.stringify({ used_today: 0, last_reset: today }),
      });
    }
    return { key: todayKeys[0].api_key, keyId: todayKeys[0].id };
  }

  // 3️⃣ Fallback از env
  if (GEMINI_API_KEY) return { key: GEMINI_API_KEY, keyId: null };
  return null;
}

// ==========================================================
// 📈 افزایش مصرف کلید
// ==========================================================
async function incrementKeyUsage(keyId) {
  if (!keyId) return;
  await supabase(`/rpc/increment_key_usage`, {
    method: "POST",
    body: JSON.stringify({ key_id: keyId }),
  });
}

// ==========================================================
// 📊 چک محدودیت روزانه سایت
// ==========================================================
async function checkSiteLimit(websiteId, plan) {
  if (!websiteId) return { exceeded: false };
  const today = new Date().toISOString().split("T")[0];
  const stats = await supabase(
    `/usage_stats?website_id=eq.${websiteId}&date=eq.${today}&select=message_count`
  );
  const current = stats?.[0]?.message_count || 0;
  const limit = PLAN_LIMITS[plan]?.dailyMessages || 50;
  return { exceeded: current >= limit, current, limit };
}

// ==========================================================
// ➕ افزایش شمارنده سایت
// ==========================================================
async function incrementSiteUsage(websiteId) {
  if (!websiteId) return;
  const today = new Date().toISOString().split("T")[0];
  const existing = await supabase(
    `/usage_stats?website_id=eq.${websiteId}&date=eq.${today}&select=id,message_count`
  );
  if (existing?.[0]) {
    await supabase(`/usage_stats?id=eq.${existing[0].id}`, {
      method: "PATCH",
      body: JSON.stringify({ message_count: existing[0].message_count + 1 }),
    });
  } else {
    await supabase(`/usage_stats`, {
      method: "POST",
      body: JSON.stringify({
        website_id: websiteId,
        date: today,
        message_count: 1,
      }),
    });
  }
}

// ==========================================================
// 🎭 پرامپت
// ==========================================================
function buildSystemPrompt(customerContext) {
    let base = `تو «مشتری‌یار» هستی؛ یک دستیار پشتیبانی هوشمند، مودب، صبور و حرفه‌ای فارسی‌زبان که در وب‌سایت مشغول کمک به مشتریان است.

وظایف تو:
- پاسخ دادن به سوالات مشتریان درباره محصولات، خدمات، سفارش‌ها، قیمت‌ها، ارسال و پیگیری
- راهنمایی گام‌به‌گام برای حل مشکلات کاربران
- برخورد محترمانه، گرم و صمیمی
- پاسخ‌ها را کوتاه، مفید و دقیق بده
- همیشه فارسی پاسخ بده
- از ایموجی‌های مناسب استفاده کن`;

    if (customerContext) {
        base += `

🎯 اطلاعات مشتری (شناسایی شده بر اساس شماره):
- نام: ${customerContext.name || 'نامشخص'}
- وضعیت: ${customerContext.status || 'نامشخص'}
- تعداد خرید: ${customerContext.total_purchase || 0}
- آخرین تماس: ${customerContext.last_contact_at ? new Date(customerContext.last_contact_at).toLocaleDateString('fa-IR') : 'نامشخص'}
${customerContext.notes ? `- یادداشت: ${customerContext.notes}` : ''}

🌺 رفتار تو با این مشتری (مهم!):
- با نامش سلام کن: «سلام ${customerContext.name} جان»
- بگو «خوش برگشتی» یا مشابه
- از اطلاعاتش توی جواب استفاده کن
- شخصی‌سازی کن (نه جواب عمومی)
- اگه ۳۰ روز یا بیشتر خرید نکرده: با احترام پیشنهاد تخفیف یا محصول جدید بده`;
    } else {
        base += `

📝 اگه کاربر شماره موبایلش رو داد:
- ازش تشکر کن
- بگو «شماره‌ت ثبت شد»`;
    }

    base += `

🚨 درخواست پشتیبان انسانی:
هر وقت کاربر درخواست «پشتیبان انسانی»، «اپراتور»، «تماس با پشتیبانی» یا «شکایت» داشت، پاسخ بده:

«برای ارتباط با تیم پشتیبانی، لطفاً از 📩 فرم تماس با ما در سایت استفاده کنید. همکاران ما در اسرع وقت پاسخ می‌دهند. 🌸»

⚠️ هرگز شماره، ایمیل یا آدرس از خودت نساز.`;

    return base;
}

// ==========================================================
// 🚀 Handler اصلی
// ==========================================================
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
res.setHeader("CDN-Cache-Control", "no-store");
res.setHeader("Cloudflare-CDN-Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, reply: "فقط POST." });
  }

  try {
    const { message, history, siteApiKey, userId, customerPhone } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ ok: false, reply: "پیام خالی است." });
    }

    // 🔍 شناسایی سایت
    let websiteId = null;
    let plan = "trial";

// 🎯 چک انقضا با userId (چون ویجت userId می‌فرسته)
if (userId) {
  const profile = await supabase(
    `/profiles?id=eq.${userId}&select=plan,subscription_end_date&limit=1`
  );
  
  if (profile?.[0]) {
    plan = profile[0].plan || "trial";
    
    // 🎯 ادمین همیشه دسترسی داره (بدون چک تاریخ)
    if (plan !== "admin") {
      const expiresAt = profile[0].subscription_end_date;
      
      if (expiresAt && new Date(expiresAt) < new Date()) {
        return res.status(200).json({
          ok: false,
          reply: "⏰ پلن شما به پایان رسیده. برای ادامه استفاده، لطفاً از پنل خود پلن تهیه کنید. 🌸",
          expired: true,
        });
      }
    }
  } else {
    console.warn("Profile not found for userId:", userId);
  }
}

// 🎯 همچنان siteApiKey رو چک کن (برای سایت‌هایی که کلید دارن)
if (siteApiKey) {
  const site = await supabase(
    `/websites?api_key=eq.${siteApiKey}&active=eq.true&select=id,user_id`
  );
  if (site?.[0]) {
    websiteId = site[0].id;
  }
}

    // 🎯 فاز ۱: AI مشتری‌شناس — جستجوی مشتری بر اساس شماره
let customerContext = null;
let ownerUserId = null;

// اگه siteApiKey داریم → user_id فروشگاه رو بگیر
if (siteApiKey) {
    const site = await supabase(
        `/websites?api_key=eq.${siteApiKey}&active=eq.true&select=user_id`
    );
    if (site?.[0]) ownerUserId = site[0].user_id;
}

// اگه userId فرستاده شده، اون رو priority بده
if (!ownerUserId && userId) ownerUserId = userId;

// جستجوی مشتری بر اساس شماره تلفن
if (ownerUserId && customerPhone) {
    const cleanPhone = String(customerPhone).replace(/[^0-9]/g, '');
    if (cleanPhone.length >= 10) {
        const found = await supabase(
            `/customers?user_id=eq.${ownerUserId}&phone=ilike.*${cleanPhone.slice(-10)}*&select=name,phone,status,notes,total_purchase,last_contact_at&limit=1`
        );
        if (found?.[0]) {
            customerContext = found[0];
            console.log('✅ AI: customer found:', customerContext.name);
        }
    }
}
    
    // 📊 چک محدودیت
    const limitCheck = await checkSiteLimit(websiteId, plan);
    if (limitCheck.exceeded) {
      return res.status(200).json({
        ok: false,
        reply: `⚠️ محدودیت پیام روزانه (${limitCheck.limit} پیام) پر شده. لطفاً فردا تلاش کنید.`,
      });
    }

    // 🔑 انتخاب کلید
    const keyInfo = await getBestGeminiKey(websiteId);
    if (!keyInfo) {
      return res.status(200).json({
        ok: false,
        reply: "⚠️ سرویس هوش مصنوعی در دسترس نیست.",
      });
    }

    // 🧱 ساخت محتوا
    const contents = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const turn of history.slice(-10)) {
        if (turn?.role && turn?.text) {
          contents.push({ role: turn.role, parts: [{ text: turn.text }] });
        }
      }
    }
    contents.push({ role: "user", parts: [{ text: message.trim() }] });

    const requestBody = {
      systemInstruction: { parts: [{ text: buildSystemPrompt(customerContext) }] },
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

    // 🔁 تلاش با مدل‌ها
    let data = null;
    let usedModel = null;
    let lastError = null;

    for (const model of GEMINI_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const url = `${GEMINI_BASE_URL}/${model}:generateContent`;
          const r = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": keyInfo.key,
            },
            body: JSON.stringify(requestBody),
          });
          const d = await r.json();

          if (r.ok && d?.candidates?.[0]?.content?.parts) {
            data = d;
            usedModel = model;
            break;
          }

          if ((r.status === 503 || r.status === 429) && attempt === 1) {
            await new Promise((res) => setTimeout(res, 1000));
            lastError = d?.error?.message;
            continue;
          }
          lastError = d?.error?.message;
          break;
        } catch (err) {
          lastError = err.message;
          break;
        }
      }
      if (data) break;
    }

    if (!data) {
      return res.status(200).json({
        ok: false,
        reply: "⚠️ سرویس الان شلوغه. خطا: " + (lastError || "نامشخص"),
        error: lastError,
      });
    }

    const reply = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("")
      .trim() || "";

    if (!reply) {
      return res.status(200).json({
        ok: false,
        reply: "⚠️ پاسخی دریافت نشد.",
      });
    }

    // 📊 ثبت مصرف
    Promise.all([
      incrementKeyUsage(keyInfo.keyId),
      incrementSiteUsage(websiteId),
    ]).catch(console.error);

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
      reply: "⚠️ خطای سرور.",
      error: error?.message,
    });
  }
}

