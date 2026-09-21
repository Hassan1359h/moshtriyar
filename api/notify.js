const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function createNotification({ type, title, message, icon, link, metadata }) {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) return null;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        type,
        title,
        message: message || "",
        icon: icon || "🔔",
        link: link || null,
        metadata: metadata || {},
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0] || null;
  } catch (err) {
    console.error("createNotification error:", err);
    return null;
  }
}
