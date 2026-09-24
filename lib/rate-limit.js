const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function checkRateLimit(ip, endpoint, limit = 10, windowSeconds = 60) {
  if (!ip || ip === "unknown" || !SUPABASE_URL || !SUPABASE_KEY) {
    return { allowed: true, remaining: limit };
  }

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rate_limits?ip_address=eq.${encodeURIComponent(ip)}&endpoint=eq.${endpoint}&select=id,count,window_start`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const rows = await res.json();
    const existing = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!existing || new Date(existing.window_start) < windowStart) {
      if (existing) {
        await fetch(`${SUPABASE_URL}/rest/v1/rate_limits?id=eq.${existing.id}`, {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            count: 1,
            window_start: now.toISOString(),
          }),
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/rate_limits`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ip_address: ip,
            endpoint: endpoint,
            count: 1,
            window_start: now.toISOString(),
          }),
        });
      }
      return { allowed: true, remaining: limit - 1 };
    }

    if (existing.count >= limit) {
      const elapsed = (now.getTime() - new Date(existing.window_start).getTime()) / 1000;
      const retryAfter = Math.max(1, Math.ceil(windowSeconds - elapsed));
      return {
        allowed: false,
        retryAfter,
        remaining: 0,
      };
    }

    await fetch(`${SUPABASE_URL}/rest/v1/rate_limits?id=eq.${existing.id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ count: existing.count + 1 }),
    });

    return { allowed: true, remaining: limit - existing.count - 1 };

  } catch (err) {
    console.error("Rate limit error:", err);
    return { allowed: true };
  }
}

export function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return (
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}
