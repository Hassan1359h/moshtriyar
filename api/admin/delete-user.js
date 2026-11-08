
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// تمام جدول‌ها و ستون‌هایی که ممکن است به حساب کاربر وابسته باشند
const DEPENDENCIES = [
  ["bazaar_purchases", "user_id"],
  ["business_directory", "owner_id"],
  ["business_votes", "voter_id"],
  ["calls", "user_id"],
  ["checks", "user_id"],
  ["customer_case_messages", "user_id"],
  ["customer_case_messages", "sender_auth_user_id"],
  ["customer_cases", "user_id"],
  ["customer_feedback", "user_id"],
  ["customer_followups", "user_id"],
  ["customer_portal_access", "user_id"],
  ["customer_portal_access", "auth_user_id"],
  ["customer_timeline", "user_id"],
  ["customers", "user_id"],
  ["discount_campaigns", "user_id"],
  ["discount_codes", "assigned_user_id"],
  ["discount_intents", "user_id"],
  ["discount_redemptions", "user_id"],
  ["fiscal_years", "user_id"],
  ["installment_payments", "user_id"],
  ["installments", "user_id"],
  ["invoices", "user_id"],
  ["notifications", "user_id"],
  ["payments", "user_id"],
  ["products", "user_id"],
  ["site_api_keys", "user_id"],
  ["site_daily_stats", "user_id"],
  ["site_orders", "user_id"],
  ["site_products", "user_id"],
  ["sms_logs", "user_id"],
  ["subscriptions", "user_id"],
  ["website_agent_settings", "user_id"],
  ["websites", "user_id"],
  ["wordpress_connections", "user_id"]
];

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
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`
      }
    }
  );

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

async function countRecords(table, column, userId) {
  const response = await request(
    `${SUPABASE_URL}/rest/v1/${table}?select=${column}&${column}=eq.${encodeURIComponent(userId)}`,
    {
      headers: {
        Prefer: "count=exact",
        Range: "0-0"
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `بررسی ${table}.${column} ناموفق بود: ${await response.text()}`
    );
  }

  const contentRange =
    response.headers.get("content-range") || "";

  const total = contentRange.split("/").pop();

  if (!total || total === "*") {
    throw new Error(
      `تعداد اطلاعات ${table}.${column} مشخص نشد.`
    );
  }

  return Number(total);
}

async function checkDependencies(userId) {
  const dependencies = {};

  for (const [table, column] of DEPENDENCIES) {
    const count = await countRecords(table, column, userId);

    if (count > 0) {
      const key = `${table}.${column}`;
      dependencies[key] = count;
    }
  }

  return dependencies;
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

  const token = req.headers.authorization?.replace(
    /^Bearer\s+/i,
    ""
  );

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const admin = await getUserFromToken(token);

    const adminEmail =
      String(admin?.email || "").toLowerCase();

    const isAdmin =
      admin?.app_metadata?.role === "admin" ||
      ADMIN_EMAILS.includes(adminEmail);

    if (!admin || !isAdmin) {
      return res.status(403).json({ error: "Admin only" });
    }

    const { userId, action } = req.body || {};

    if (!userId || !UUID_REGEX.test(userId)) {
      return res.status(400).json({
        error: "شناسه کاربر نامعتبر است."
      });
    }

    if (!["block", "unblock", "archive", "delete"].includes(action)) {
      return res.status(400).json({
        error: "عملیات نامعتبر است."
      });
    }

    if (userId === admin.id) {
      return res.status(403).json({
        error: "امکان تغییر یا حذف حساب مدیر فعلی وجود ندارد."
      });
    }

    const targetResponse = await request(
      `${SUPABASE_URL}/auth/v1/admin/users/${userId}`
    );

    if (!targetResponse.ok) {
      return res.status(404).json({
        error: "حساب کاربر پیدا نشد."
      });
    }

    const target = await targetResponse.json();

    const targetEmail =
      String(target.email || "").toLowerCase();

    if (
      target.app_metadata?.role === "admin" ||
      ADMIN_EMAILS.includes(targetEmail)
    ) {
      return res.status(403).json({
        error: "حذف یا مسدودسازی مدیر کل مجاز نیست."
      });
    }

    if (action === "block") {
      await updateAuthUser(userId, "876000h");

      await updateProfile(userId, {
        is_blocked: true,
        blocked_at: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: "حساب کاربر مسدود شد."
      });
    }

    if (action === "unblock") {
      await updateAuthUser(userId, "none");

      await updateProfile(userId, {
        is_blocked: false,
        blocked_at: null
      });

      return res.status(200).json({
        success: true,
        message: "مسدودیت حساب برداشته شد."
      });
    }

    if (action === "archive") {
      await updateAuthUser(userId, "876000h");

      await updateProfile(userId, {
        is_blocked: true,
        blocked_at: new Date().toISOString(),
        is_deleted: true,
        deleted_at: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: "حساب به آرشیو منتقل شد."
      });
    }

    if (action === "delete") {
      const dependencies =
        await checkDependencies(userId);

      if (Object.keys(dependencies).length > 0) {
        return res.status(409).json({
          success: false,
          error: "این حساب دارای اطلاعات وابسته است و حذف دائمی آن مجاز نیست.",
          dependencies
        });
      }

      // در این مرحله فقط حساب کاملاً بدون وابستگی حذف می‌شود.
      const deleteResponse = await request(
        `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
        { method: "DELETE" }
      );

      if (!deleteResponse.ok) {
        throw new Error(
          `حذف حساب احراز هویت ناموفق بود: ${await deleteResponse.text()}`
        );
      }

      return res.status(200).json({
        success: true,
        message: "حساب کاربر و پروفایل آن حذف شد."
      });
    }

  } catch (error) {
    console.error("Admin user action error:", error);

    return res.status(500).json({
      error: "عملیات ناموفق بود.",
      details: error.message
    });
  }
}
