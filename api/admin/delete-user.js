const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

async function request(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      ...options.headers
    }
  });
}

async function getUserFromToken(token) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) return null;
  return response.json();
}

async function updateAuthUser(userId, banDuration) {
  const response = await request(
    `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ban_duration: banDuration })
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function updateProfile(userId, data) {
  const response = await request(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(data)
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = await response.json();

  if (!rows.length) {
    throw new Error("پروفایل کاربر پیدا نشد.");
  }
}

async function countRecords(table, userId) {
  const response = await request(
    `${SUPABASE_URL}/rest/v1/${table}?select=id&user_id=eq.${userId}`,
    {
      headers: {
        Prefer: "count=exact",
        Range: "0-0"
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `بررسی جدول ${table} ناموفق بود: ${await response.text()}`
    );
  }

  const contentRange = response.headers.get("content-range") || "";
  const total = contentRange.split("/").pop();

  if (!total || total === "*") {
    throw new Error(`تعداد اطلاعات جدول ${table} مشخص نشد.`);
  }

  return Number(total);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      error: "تنظیمات Supabase ناقص است."
    });
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const admin = await getUserFromToken(token);
    const adminEmail = String(admin?.email || "").toLowerCase();

    const isAdmin =
      admin?.app_metadata?.role === "admin" ||
      ADMIN_EMAILS.includes(adminEmail);

    if (!admin || !isAdmin) {
      return res.status(403).json({ error: "Admin only" });
    }

    const { userId, action } = req.body || {};

    if (
      !userId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    ) {
      return res.status(400).json({ error: "شناسه کاربر نامعتبر است." });
    }

    if (!["block", "unblock", "archive", "delete"].includes(action)) {
      return res.status(400).json({ error: "عملیات نامعتبر است." });
    }

    if (userId === admin.id) {
      return res.status(403).json({
        error: "امکان تغییر یا حذف حساب مدیر خودتان وجود ندارد."
      });
    }

    const targetResponse = await request(
      `${SUPABASE_URL}/auth/v1/admin/users/${userId}`
    );

    if (!targetResponse.ok) {
      return res.status(404).json({ error: "کاربر پیدا نشد." });
    }

    const target = await targetResponse.json();

    if (
      target.app_metadata?.role === "admin" ||
      ADMIN_EMAILS.includes(String(target.email || "").toLowerCase())
    ) {
      return res.status(403).json({
        error: "حساب مدیر کل قابل تغییر یا حذف نیست."
      });
    }

    if (action === "block") {
      await updateAuthUser(userId, "876000h");

      await updateProfile(userId, {
        is_blocked: true,
        blocked_at: new Date().toISOString()
      });

      return res.status(200).json({ ok: true, action });
    }

    if (action === "unblock") {
      await updateAuthUser(userId, "none");

      await updateProfile(userId, {
        is_blocked: false,
        blocked_at: null
      });

      return res.status(200).json({ ok: true, action });
    }

    if (action === "archive") {
      await updateAuthUser(userId, "876000h");

      await updateProfile(userId, {
        is_blocked: true,
        blocked_at: new Date().toISOString(),
        is_deleted: true,
        deleted_at: new Date().toISOString()
      });

      return res.status(200).json({ ok: true, action });
    }

    if (action === "delete") {
      const tables = [
        "payments",
        "websites",
        "wordpress_connections",
        "customers"
      ];

      const dependencies = {};

      for (const table of tables) {
        dependencies[table] = await countRecords(table, userId);
      }

      const hasData = Object.values(dependencies).some(count => count > 0);

      if (hasData) {
        return res.status(409).json({
          error: "این حساب دارای اطلاعات وابسته است و حذف دائمی مجاز نیست.",
          dependencies
        });
      }

      const deleteResponse = await request(
        `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
        { method: "DELETE" }
      );

      if (!deleteResponse.ok) {
        throw new Error(await deleteResponse.text());
      }

      return res.status(200).json({
        ok: true,
        action: "delete",
        message: "حساب کاربر حذف شد."
      });
    }

  } catch (error) {
    return res.status(500).json({
      error: error.message || "خطای سرور"
    });
  }
}
