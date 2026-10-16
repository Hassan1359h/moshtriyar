import crypto from "crypto";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const API = "https://moshtriyar.ir";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const origin = (value) => {
  try {
    const u = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(u.protocol) ? u.origin : null;
  } catch { return null; }
};

function buildPluginPHP(token) {
  const L = [];
  L.push("<?php");
  L.push("/**");
  L.push(" * Plugin Name: Moshtriyar AI Agent");
  L.push(" * Description: اتصال خودکار سایت وردپرسی به دستیار مشتری‌یار");
  L.push(" * Version: 1.4.0");
  L.push(" * Author: Moshtriyar");
  L.push(" */");
  L.push("");
  L.push("if (!defined('ABSPATH')) exit;");
  L.push("");
  L.push("define('MOSHTRIYAR_TOKEN', '" + token + "');");
  L.push("define('MOSHTRIYAR_API', '" + API + "/api/wordpress-activate');");
  L.push("");
  L.push("function moshtiyar_connect() {");
  L.push("    $apiKey = get_option('moshtiyar_api_key', '');");
  L.push("    $status = get_option('moshtiyar_status', '');");
  L.push("");
  L.push("    // اگه قبلاً وصل شده و apiKey داره، دوباره تلاش نکن");
  L.push("    if ($status === 'connected' && $apiKey) {");
  L.push("        return true;");
  L.push("    }");
  L.push("");
  L.push("    // اگه apiKey داره، فقط وضعیت رو connected کن");
  L.push("    if ($apiKey) {");
  L.push("        update_option('moshtiyar_status', 'connected');");
  L.push("        update_option('moshtiyar_message', 'مشتری‌یار با موفقیت متصل است.');");
  L.push("        return true;");
  L.push("    }");
  L.push("");
  L.push("    // بار اول: از توکن استفاده کن");
  L.push("    $response = wp_remote_post(MOSHTRIYAR_API, array(");
  L.push("        'timeout' => 30,");
  L.push("        'headers' => array('Content-Type' => 'application/json'),");
  L.push("        'body' => wp_json_encode(array(");
  L.push("            'token' => MOSHTRIYAR_TOKEN,");
  L.push("            'siteUrl' => home_url('/')");
  L.push("        ))");
  L.push("    ));");
  L.push("");
  L.push("    if (is_wp_error($response)) {");
  L.push("        update_option('moshtiyar_status', 'error');");
  L.push("        update_option('moshtiyar_message', $response->get_error_message());");
  L.push("        return false;");
  L.push("    }");
  L.push("");
  L.push("    $code = wp_remote_retrieve_response_code($response);");
  L.push("    $body = json_decode(wp_remote_retrieve_body($response), true);");
  L.push("");
  L.push("    if ($code >= 200 && $code < 300 && !empty($body['success'])) {");
  L.push("        update_option('moshtiyar_status', 'connected');");
  L.push("        update_option('moshtiyar_user_id', sanitize_text_field($body['userId'] ?? ''));");
  L.push("        if (!empty($body['apiKey'])) {");
  L.push("            update_option('moshtiyar_api_key', sanitize_text_field($body['apiKey']));");
  L.push("        }");
  L.push("        update_option('moshtiyar_message', 'مشتری‌یار با موفقیت متصل شد.');");
  L.push("        return true;");
  L.push("    }");
  L.push("");
  L.push("    // اگه توکن قبلاً مصرف شده، وضعیت رو connected نگه دار اگه apiKey داریم");
  L.push("    if ($code === 409 && $apiKey) {");
  L.push("        update_option('moshtiyar_status', 'connected');");
  L.push("        return true;");
  L.push("    }");
  L.push("");
  L.push("    update_option('moshtiyar_status', 'error');");
  L.push("    update_option('moshtiyar_message', sanitize_text_field($body['error'] ?? 'خطا در اتصال'));");
  L.push("    return false;");
  L.push("}");
  L.push("");
  L.push("function moshtiyar_activate() {");
  L.push("    $status = get_option('moshtiyar_status', '');");
  L.push("    $apiKey = get_option('moshtiyar_api_key', '');");
  L.push("    if ($status === 'connected' && $apiKey) {");
  L.push("        return;");
  L.push("    }");
  L.push("    update_option('moshtiyar_status', 'connecting');");
  L.push("    update_option('moshtiyar_message', 'در حال اتصال به مشتری‌یار...');");
  L.push("}");
  L.push("register_activation_hook(__FILE__, 'moshtiyar_activate');");
  L.push("");
  L.push("function moshtiyar_admin_check() {");
  L.push("    $status = get_option('moshtiyar_status', '');");
  L.push("    if ($status !== 'connected') {");
  L.push("        moshtiyar_connect();");
  L.push("    }");
  L.push("}");
  L.push("add_action('admin_init', 'moshtiyar_admin_check');");
  L.push("");
  L.push("function moshtiyar_agent() {");
  L.push("    if (is_admin()) return;");
  L.push("    if (get_option('moshtiyar_status') !== 'connected') return;");
  L.push("    $userId = get_option('moshtiyar_user_id', '');");
  L.push("    if (!$userId) return;");
  L.push("    echo '<script src=\"" + API + "/api/website-agent.js?v=1.4.0\" data-user-id=\"' . esc_attr($userId) . '\" data-site=\"' . esc_attr(home_url('/')) . '\" data-enabled=\"true\"></script>';");
  L.push("}");
  L.push("add_action('wp_head', 'moshtiyar_agent', 100);");
  L.push("");
  L.push("function moshtiyar_notice() {");
  L.push("    if (!current_user_can('manage_options')) return;");
  L.push("    $status = get_option('moshtiyar_status', '');");
  L.push("    $message = get_option('moshtiyar_message', '');");
  L.push("    if ($status === 'connected') {");
  L.push("        $hasApiKey = !empty(get_option('moshtiyar_api_key', ''));");
  L.push("        $apiKeyStatus = $hasApiKey ? 'کلید API فعال' : 'در انتظار کلید API';");
  L.push("        echo '<div class=\"notice notice-success\"><p>مشتری‌یار با موفقیت متصل است. ' . esc_html($apiKeyStatus) . '</p></div>';");
  L.push("    } elseif ($status === 'connecting') {");
  L.push("        echo '<div class=\"notice notice-warning\"><p>مشتری‌یار در حال اتصال است.</p></div>';");
  L.push("    } elseif ($status === 'error') {");
  L.push("        echo '<div class=\"notice notice-error\"><p>مشتری‌یار: ' . esc_html($message) . '</p></div>';");
  L.push("    }");
  L.push("}");
  L.push("add_action('admin_notices', 'moshtiyar_notice');");
  return L.join("\n");
}

async function sendZip(res, token) {
  const php = buildPluginPHP(token);
  const zip = new JSZip();
  const folder = zip.folder("moshtiyar-ai-agent");
  folder.file("moshtiyar-ai-agent.php", php);
  folder.file("readme.txt", "Moshtriyar AI Agent\n\nVersion: 1.4.0\n");
  const buffer = await zip.generateAsync({
    type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 }
  });
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="moshtriyar-ai-agent.zip"');
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Cache-Control", "no-store");
  return res.end(buffer);
}

async function validateConnection(token, siteUrl) {
  const requestedOrigin = origin(siteUrl);
  if (!requestedOrigin) return { ok: false, code: 400, error: "Invalid site URL" };

  const { data: connection, error } = await supabase
    .from("wordpress_connections")
    .select("id, user_id, site_url, expires_at, used_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error) return { ok: false, code: 500, error: "Lookup failed" };
  if (!connection) return { ok: false, code: 401, error: "Invalid token" };
  if (connection.used_at) return { ok: false, code: 409, error: "Token already used" };
  if (!connection.expires_at || new Date(connection.expires_at).getTime() <= Date.now()) {
    return { ok: false, code: 410, error: "Token expired" };
  }
  const allowedOrigin = origin(connection.site_url);
  if (!allowedOrigin || allowedOrigin.toLowerCase() !== requestedOrigin.toLowerCase()) {
    return { ok: false, code: 403, error: "Site not authorized" };
  }
  return { ok: true, connection };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const token = String(req.query?.token || "").trim();
      const siteUrl = String(req.query?.siteUrl || "").trim();
      if (!token || !siteUrl) return res.status(400).json({ error: "Token and siteUrl required" });

      const check = await validateConnection(token, siteUrl);
      if (!check.ok) return res.status(check.code).json({ error: check.error });

      return sendZip(res, token);
    }

    if (req.method === "POST") {
      const auth = req.headers.authorization || "";
      if (!auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

      const accessToken = auth.slice(7).trim();
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

      const token = String(req.body?.token || "").trim();
      const siteUrl = String(req.body?.siteUrl || "").trim();
      if (!token || !siteUrl) return res.status(400).json({ error: "Token and siteUrl required" });

      const { data: connection, error } = await supabase
        .from("wordpress_connections")
        .select("id, user_id, site_url, expires_at, used_at")
        .eq("token_hash", hashToken(token))
        .maybeSingle();

      if (error || !connection) return res.status(401).json({ error: "Invalid token" });
      if (connection.user_id !== user.id) return res.status(403).json({ error: "Not your connection" });
      if (connection.used_at) return res.status(409).json({ error: "Token already used" });
      if (!connection.expires_at || new Date(connection.expires_at).getTime() <= Date.now()) {
        return res.status(410).json({ error: "Token expired" });
      }
      return sendZip(res, token);
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (error) {
    console.error("wordpress-plugin error:", error?.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
