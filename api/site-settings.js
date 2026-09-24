const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function getUserFromToken(token) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ==========================================================
  // 🔓 GET عمومی (برای ویجت): خواندن تنظیمات با userId
  // ==========================================================
  if (req.method === "GET") {
    const userId = req.query?.userId;
    if (!userId) {
      return res.status(400).json({ ok: false, error: "userId required" });
    }

    try {
      // پیدا کردن اولین سایت این کاربر
      const sites = await supabase(
        `/websites?user_id=eq.${userId}&active=eq.true&select=id&limit=1`
      );

      if (!sites || !sites[0]) {
        return res.status(200).json({
          ok: true,
          settings: null,
          message: "هیچ سایتی برای این کاربر پیدا نشد",
        });
      }

      const settings = await supabase(
        `/site_settings?website_id=eq.${sites[0].id}&select=*&limit=1`
      );

      return res.status(200).json({
        ok: true,
        settings: settings?.[0] || null,
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // ==========================================================
  // 🔐 POST: ذخیره تنظیمات (فقط کاربر لاگین‌شده)
  // ==========================================================
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ ok: false, error: "No token" });

  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ ok: false, error: "Invalid token" });

  try {
    const { websiteId, settings } = req.body || {};
    if (!websiteId || !settings) {
      return res.status(400).json({ ok: false, error: "websiteId and settings required" });
    }

    // چک کن این سایت مال کاربره
    const sites = await supabase(
      `/websites?id=eq.${websiteId}&user_id=eq.${user.id}&select=id`
    );

    if (!sites?.[0]) {
      return res.status(403).json({ ok: false, error: "Access denied" });
    }

    // Upsert
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

    // چک کن قبلاً وجود داشته
    const existing = await supabase(
      `/site_settings?website_id=eq.${websiteId}&select=id`
    );

    let result;
    if (existing?.[0]) {
      result = await supabase(`/site_settings?id=eq.${existing[0].id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    } else {
      result = await supabase(`/site_settings`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    }

    return res.status(200).json({ ok: true, settings: result?.[0] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
                                           }
