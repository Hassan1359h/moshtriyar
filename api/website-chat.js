import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function origin(url) {
  try {
    return new URL(String(url || "").trim()).origin.toLowerCase();
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }

  try {
    const { userId, site, message } = req.body || {};

    if (!userId || !message) {
      return res.status(400).json({
        error: "userId و message الزامی هستند"
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY تنظیم نشده است"
      });
    }

    /* بررسی اتصال سایت */

    const { data: connections, error: connectionError } =
      await supabase
        .from("wordpress_connections")
        .select("site_url,expires_at")
        .eq("user_id", String(userId))
        .order("created_at", { ascending: false })
        .limit(20);

    if (connectionError) {
      console.error(connectionError);

      return res.status(500).json({
        error: "خطا در بررسی اتصال سایت"
      });
    }

    const requestedSite = origin(site);

    const connected = (connections || []).some(item => {
      const allowedSite = origin(item.site_url);

      const expired =
        item.expires_at &&
        new Date(item.expires_at).getTime() <= Date.now();

      return (
        allowedSite &&
        allowedSite === requestedSite &&
        !expired
      );
    });

    if (!connected) {
      return res.status(403).json({
        error: "این سایت متصل نیست"
      });
    }

    /* دریافت محصولات */

    const { data: products, error: productsError } =
      await supabase
        .from("products")
        .select("name,price,description")
        .eq("user_id", String(userId))
        .limit(100);

    if (productsError) {
      console.error(productsError);

      return res.status(500).json({
        error: "خطا در دریافت محصولات"
      });
    }

    const productText = (products || [])
      .map((p, i) => {
        return `${i + 1}. ${p.name || "بدون نام"} | قیمت: ${
          p.price
            ? Number(p.price).toLocaleString("fa-IR") + " تومان"
            : "نامشخص"
        } | ${p.description || ""}`;
      })
      .join("\n");

    /* ارسال به Gemini */

    const prompt = `
تو دستیار هوشمند یک فروشگاه اینترنتی هستی.

فقط بر اساس اطلاعات محصولات پاسخ بده.
اطلاعاتی که در فهرست نیست را حدس نزن.
اگر محصول موردنظر وجود ندارد، صادقانه بگو اطلاعات آن را ندارم.
پاسخ فارسی، کوتاه و دوستانه باشد.

محصولات:
${productText || "هیچ محصولی ثبت نشده است."}

سؤال مشتری:
${String(message).trim()}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 500
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini:", data);

      return res.status(502).json({
        error:
          data?.error?.message ||
          "خطا در ارتباط با Gemini"
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map(p => p.text || "")
        .join("")
        .trim();

    if (!reply) {
      console.error("Empty Gemini response:", data);

      return res.status(502).json({
        error: "Gemini پاسخ خالی ارسال کرد"
      });
    }

    return res.status(200).json({
      reply
    });

  } catch (error) {
    console.error("Website chat:", error);

    return res.status(500).json({
      error: error.message || "خطای داخلی سرور"
    });
  }
}
