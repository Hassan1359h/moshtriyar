import crypto from "crypto";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

const API = "https://moshtriyar.ir";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const origin = (value) => {
  try {
    const u = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(u.protocol) ? u.origin : null;
  } catch {
    return null;
  }
};

// =====================================================
// 🎯 ساخت کد PHP افزونه
// =====================================================
function buildPluginPHP(token) {
  return [
    "<?php",
    "/**",
    " * Plugin Name: Moshtriyar AI Agent",
    " * Description: اتصال خودکار سایت وردپرسی به دستیار مشتری‌یار",
    " * Version: 1.2.0",
    " * Author: Moshtriyar",
    " */",
    "",
    "if (!defined('ABSPATH')) exit;",
    "",
    "define('MOSHTRIYAR_TOKEN', '" + token + "');",
    "define('MOSHTRIYAR_API', '" + API + "/api/wordpress-activate');",
    "",
    "function moshtriyar_connect() {",
    "    $response = wp_remote_post(MOSHTRIYAR_API, array(",
    "        'timeout' => 30,",
    "        'headers' => array('Content-Type' => 'application/json'),",
    "        'body' => wp_json_encode(array(",
    "            'token' => MOSHTRIYAR_TOKEN,",
    "            'siteUrl' => home_url('/')",
    "        ))",
    "    ));",
    "",
    "    if (is_wp_error($response)) {",
    "        update_option('moshtiyar_status', 'error');",
    "        update_option('moshtiyar_message', $response->get_error_message());",
    "        return false;",
    "    }",
    "",
    "    $code = wp_remote_retrieve_response_code($response);",
    "    $body = json_decode(wp_remote_retrieve_body($response), true);",
    "",
    "    if ($code >= 200 && $code < 300 && !empty($body['success'])) {",
    "        update_option('moshtiyar_status', 'connected');",
    "        update_option('moshtiyar_user_id', sanitize_text_field($body['userId'] ?? ''));",
    "",
    "        if (!empty($body['apiKey'])) {",
    "            update_option('moshtiyar_api_key', sanitize_text_field($body['apiKey']));",
    "        }",
    "",
    "        update_option('moshtiyar_message', 'مشتری‌یار با موفقیت متصل شد.');",
    "        return true;",
    "    }",
    "",
    "    update_option('moshtiyar_status', 'error');",
    "    update_option('moshtiyar_message', sanitize_text_field($body['error'] ?? 'خطا در اتصال به مشتری‌یار'));",
    "    return false;",
    "}",
    "",
    "function moshtiyar_activate() {",
    "    update_option('moshtiyar_status', 'connecting');",
    "    update_option('moshtiyar_message', 'در حال اتصال به مشتری‌یار...');",
    "}",
    "register_activation_hook(__FILE__, 'moshtiyar_activate');",
    "",
    "function moshtiyar_admin_check() {",
    "    $status = get_option('moshtiyar_status', '');",
    "    if ($status !== 'connected') {",
    "        moshtriyar_connect();",
    "    }",
    "}",
    "add_action('admin_init', 'moshtiyar_admin_check');",
    "",
    "function moshtiyar_notice() {",
    "    if (!current_user_can('manage_options')) return;",
    "    $status = get_option('moshtiyar_status', '');",
    "    $message = get_option('moshtiyar_message', '');",
    "",
    "    if ($status === 'connected') {",
    "        $hasApiKey = !empty(get_option('moshtiyar_api_key', ''));",
    "        $apiKeyStatus = $hasApiKey ? '🟢 کلید API فعال' : '🟡 در انتظار کلید API';",
    "        echo '<div class=\"notice notice-success\"><p>✅ مشتری‌یار با موفقیت متصل است. ' . esc_html($apiKeyStatus) . '</p></div>';",
    "    } elseif ($status === 'connecting') {",
    "        echo '<div class=\"notice notice-warning\"><p>⏳ مشتری‌یار در حال اتصال است.</p></div>';",
    "    } elseif ($status === 'error') {",
    "        echo '<div class=\"notice notice-error\"><p>❌ مشتری‌یار: ' . esc_html($message) . '</p></div>';",
    "    }",
    "}",
    "add_action('admin_notices', 'moshtiyar_notice');"
    "",
"function moshtiyar_agent() {",
"    if (is_admin()) return;",
"    if (get_option('moshtiyar_status') !== 'connected') return;",
"    $userId = get_option('moshtiyar_user_id', '');",
"    if (!$userId) return;",
"    echo '<script src=\"" + API + "/api/website-agent.js?v=1.3.0\" data-user-id=\"' . esc_attr($userId) . '\" data-site=\"' . esc_attr(home_url('/')) . '\" data-enabled=\"true\"></script>';",
"}",
"add_action('wp_head', 'moshtiyar_agent', 100);"
  ].join("\n");
}

// =====================================================
// 🎯 ساخت ZIP و ارسال
// =====================================================
async function sendPluginZip(res, token) {
  const php = buildPluginPHP(token);
  const zip = new JSZip();
  const folder = zip.folder("moshtiyar-ai-agent");
  folder.file("moshtiyar-ai-agent.php", php);
  folder.file("readme.txt", "Moshtriyar AI Agent\n\nنسخه: 1.2.0\n");

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 }
  });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="moshtriyar-ai-agent.zip"');
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Cache-Control", "no-store");
  return res.end(buffer);
}

// =====================================================
// 🎯 اعتبارسنجی توکن (مشترک بین GET و POST)
// =====================================================
async function validateToken(token, siteUrl) {
  const requestedOrigin = origin(siteUrl);
  if (!requestedOrigin) {
    return { ok: false, code: 400, error: "Invalid site URL" };
  }

  const { data: connection, error } = await supabase
    .from("wordpress_connections")
    .select("id,user_id,site_url,expires_at,used_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error) {
    console.error(error);
    return { ok: false, code: 500, error: "Connection lookup failed" };
  }
  if (!connection) {
    return { ok: false, code: 401, error: "Invalid token" };
  }
  if (connection.used_at) {
    return { ok: false, code: 409, error: "Token already used" };
  }
  if (!connection.expires_at || new Date(connection.expires_at).getTime() <= Date.now()) {
    return { ok: false, code: 410, error: "Token expired" };
  }

  const allowedOrigin = origin(connection.site_url);
  if (!allowedOrigin || allowedOrigin.toLowerCase() !== requestedOrigin.toLowerCase()) {
    return { ok: false, code: 403, error: "Site not authorized" };
  }

  return { ok: true, connection };
}

// =====================================================
// 🎯 همگام‌سازی کالاها (برای آینده - با action=sync-products)
// =====================================================
async function handleProductSync(req, res) {
  try {
    const apiKey = String(req.body?.apiKey || "").trim();
    const siteUrl = String(req.body?.siteUrl || "").trim();
    const products = Array.isArray(req.body?.products) ? req.body.products : [];

    if (!apiKey || !siteUrl || !products.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const apiKeyHash = hashToken(apiKey);
    const { data: keyData, error } = await supabase
      .from("site_api_keys")
      .select("id, user_id, site_url, is_active")
      .eq("api_key_hash", apiKeyHash)
      .maybeSingle();

    if (error || !keyData) {
      return res.status(401).json({ error: "Invalid API key" });
    }
    if (!keyData.is_active) {
      return res.status(403).json({ error: "API key inactive" });
    }

    const configuredOrigin = origin(keyData.site_url);
    const requestedOrigin = origin(siteUrl);
    if (!configuredOrigin || configuredOrigin !== requestedOrigin) {
      return res.status(403).json({ error: "Site URL mismatch" });
    }

    await supabase
      .from("site_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyData.id);

    const rows = products.map((p) => ({
      user_id: keyData.user_id,
      site_url: configuredOrigin,
      external_id: String(p.id ?? p.external_id ?? ""),
      sku: String(p.sku || ""),
      name: String(p.name || "بدون نام"),
      sale_price: Number(p.sale_price || p.price || 0),
      stock: Number(p.stock || 0),
      image_url: String(p.image_url || ""),
      category: String(p.category || ""),
      last_synced_at: new Date().toISOString()
    })).filter((r) => r.external_id);

    if (!rows.length) {
      return res.status(400).json({ error: "No valid products" });
    }

    const { data: saved, error: upsertError } = await supabase
      .from("site_products")
      .upsert(rows, {
        onConflict: "user_id,site_url,external_id",
        ignoreDuplicates: false
      })
      .select("id");

    if (upsertError) {
      return res.status(500).json({ error: "Save failed" });
    }

    return res.status(200).json({
      success: true,
      synced: saved?.length || 0
    });

  } catch (error) {
    console.error("product-sync error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// =====================================================
// 🎯 Router اصلی
// =====================================================
export default async function handler(req, res) {
  // 🟢 GET → دانلود افزونه (برای موبایل/intent)
  if (req.method === "GET") {
    const token = String(req.query?.token || "").trim();
    const siteUrl = String(req.query?.siteUrl || "").trim();

    if (!token || !siteUrl) {
      return res.status(400).json({ error: "Token and siteUrl required" });
    }

    const check = await validateToken(token, siteUrl);
    if (!check.ok) {
      return res.status(check.code).json({ error: check.error });
    }

  
    // دانلود نباید توکن فعال‌سازی را مصرف کند.
    // توکن فقط هنگام اتصال موفق وردپرس مصرف می‌شود.
    return sendPluginZip(res, token);
    
    
  }

  // 🔵 POST → دو حالت
  if (req.method === "POST") {
    // حالت ۱: همگام‌سازی کالاها
    if (req.body?.action === "sync-products") {
      return handleProductSync(req, res);
    }

    // حالت ۲: دانلود افزونه (برای مرورگر)
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const accessToken = auth.slice(7).trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = String(req.body?.token || "").trim();
    const siteUrl = String(req.body?.siteUrl || "").trim();

    if (!token || !siteUrl) {
      return res.status(400).json({ error: "Token and siteUrl required" });
    }

    const { data: connection, error } = await supabase
      .from("wordpress_connections")
      .select("id,user_id,site_url,expires_at,used_at")
      .eq("token_hash", hashToken(token))
      .maybeSingle();

    if (error || !connection) {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (connection.user_id !== user.id) {
      return res.status(403).json({ error: "Not your connection" });
    }
    if (connection.used_at) {
      return res.status(409).json({ error: "Token already used" });
    }
    if (!connection.expires_at || new Date(connection.expires_at).getTime() <= Date.now()) {
      return res.status(410).json({ error: "Token expired" });
    }

    const allowedOrigin = origin(connection.site_url);
    const requestedOrigin = origin(siteUrl);
    if (!allowedOrigin || allowedOrigin.toLowerCase() !== requestedOrigin.toLowerCase()) {
      return res.status(403).json({ error: "Site not authorized" });
    }

    return sendPluginZip(res, token);
  }

  return res.status(405).json({ error: "Method Not Allowed" 
                                   });
    }
