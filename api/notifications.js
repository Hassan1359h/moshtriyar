const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());

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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  // 🔐 احراز هویت
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });

  const user = await getUserFromToken(token);
  if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return res.status(403).json({ error: "Admin only" });
  }

  try {
    // 📥 GET - لیست اعلان‌ها
    if (req.method === "GET") {
      const { unread } = req.query;
      let path = "/notifications?order=created_at.desc&limit=50";
      if (unread === "true") path += "&read=eq.false";
      const data = await supabase(path);
      const unreadCount = (data || []).filter(n => !n.read).length;
      return res.status(200).json({ ok: true, notifications: data || [], unreadCount });
    }

    // ➕ POST - ساخت اعلان جدید
    if (req.method === "POST") {
      const { type, title, message, icon, link, metadata } = req.body || {};
      if (!type || !title) {
        return res.status(400).json({ error: "type and title required" });
      }
      const data = await supabase("/notifications", {
        method: "POST",
        body: JSON.stringify({
          type,
          title,
          message: message || "",
          icon: icon || "🔔",
          link: link || null,
          metadata: metadata || {},
        }),
      });
      return res.status(200).json({ ok: true, notification: data?.[0] });
    }

    // ✔️ PATCH - علامت خوانده‌شده
    if (req.method === "PATCH") {
      const { id, markAll } = req.body || {};
      if (markAll) {
        await supabase(`/notifications?read=eq.false`, {
          method: "PATCH",
          body: JSON.stringify({ read: true }),
        });
        return res.status(200).json({ ok: true });
      }
      if (!id) return res.status(400).json({ error: "id required" });
      await supabase(`/notifications?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({ read: true }),
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
        }
