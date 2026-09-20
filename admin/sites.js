// api/admin/sites.js
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
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });

  const user = await getUserFromToken(token);
  if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return res.status(403).json({ error: "Admin only" });
  }

  try {
    const sites = await supabase(
      "/websites?select=id,name,domain,api_key,active,created_at,profiles(plan,email,full_name)&order=created_at.desc"
    );
    return res.status(200).json({ sites: sites || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
