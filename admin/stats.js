// api/admin/stats.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());

async function supabase(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.json();
}

async function getUserFromToken(token) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  const user = await getUserFromToken(token);
  if (!user || !user.email) {
    return res.status(401).json({ error: "Invalid token" });
  }

  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    const [sites, keys, usage] = await Promise.all([
      supabase("/websites?select=id"),
      supabase("/gemini_keys?select=id,daily_limit,used_today"),
      supabase(`/usage_stats?date=eq.${today}&select=message_count`),
    ]);

    const totalKeys = keys?.length || 0;
    const totalSites = sites?.length || 0;
    const todayMessages = (usage || []).reduce((sum, u) => sum + (u.message_count || 0), 0);
    const remainingQuota = (keys || []).reduce(
      (sum, k) => sum + Math.max(0, k.daily_limit - k.used_today),
      0
    );

    return res.status(200).json({
      totalSites,
      totalKeys,
      todayMessages,
      remainingQuota,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
