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

function buildPluginPHP(token) {
  const lines = [];
  lines.push("<?php");
  lines.push("/**");
  lines.push(" * Plugin Name: Moshtriyar AI Agent");
  lines.push(" * Description: اتصال خودکار سایت وردپرسی به دستیار مشتری‌یار");
  lines.push(" * Version: 1.3.0");
  lines.push(" * Author: Moshtriyar");
  lines.push(" */");
  lines.push("");
  lines.push("if (!defined('ABSPATH')) exit;");
  lines.push("");
  lines.push("define('MOSHTRIYAR_TOKEN', '" + token + "');");
  lines.push("define('MOSHTRIYAR_API', '" + API + "/api/wordpress-activate');");
  lines.push("");
  lines.push("function moshtiyar_connect() {");
  lines.push("    $response = wp_remote_post(MOSHTRIYAR_API, array(");
  lines.push("        'timeout' => 30,");
  lines.push("        'headers' => array('Content-Type' => 'application/json'),");
  lines.push("        'body' => wp_json_encode(array(");
  lines.push("            'token' => MOSHTRIYAR_TOKEN,");
  lines.push("            'siteUrl' => home_url('/')");
  lines.push("        ))");
  lines.push("    ));");
  lines.push("    if (is_wp_error($response)) {");
  lines.push("        update_option('moshtiyar_status', 'error');");
  lines.push("        update_option('moshtiyar_message', $response->get_error_message());");
  lines.push("        return false;");
  lines.push("    }");
  lines.push("    $code = wp_remote_retrieve_response_code($response);");
  lines.push("    $body = json_decode(wp_remote_retrieve_body($response), true);");
  lines.push("    if ($code >= 200 && $code < 300 && !empty($body['success'])) {");
  lines.push("        update_option('moshtiyar_status', 'connected');");
  lines.push("        update_option('moshtiyar_user_id', sanitize_text_field($body['userId'] ?? ''));");
  lines.push("        if (!empty($body['apiKey'])) {");
  lines.push("            update_option('moshtiyar_api_key', sanitize_text_field($body['apiKey']));");
  lines.push("        }");
  lines.push("        update_option('moshtiyar_message', 'مشتری‌یار با موفقیت متصل شد.');");
  lines.push("        return true;");
  lines.push("    }");
  lines.push("    update_option('moshtiyar_status', 'error');");
  lines.push("    update_option('moshtiyar_message', sanitize_text_field($body['error'] ?? 'خطا در اتصال'));");
  lines.push("    return false;");
  lines.push("}");
  lines.push("");
  lines.push("function moshtiyar_activate() {");
  lines.push("    update_option('moshtiyar_status', 'connecting');");
  lines.push("    update_option('moshtiyar_message', 'در حال اتصال به مشتری‌یار...');");
  lines.push("}");
  lines.push("register_activation_hook(__FILE__, 'moshtiyar_activate');");
  lines.push("");
  lines.push("function moshtiyar_admin_check() {");
  lines.push("    $status = get_option('moshtiyar_status', '');");
  lines.push("    if ($status !== 'connected') {");
  lines.push("        moshtiyar_connect();");
  lines.push("    }");
  lines.push("}");
  lines.push("add_action('admin_init', 'moshtiyar_admin_check');");
  lines.push("");
  lines.push("function moshtiyar_agent() {");
  lines.push("    if (is_admin()) return;");
  lines.push("    if (get_option('moshtiyar_status') !== 'connected') return;");
  lines.push("    $userId = get_option('moshtiyar_user_id', '');");
  lines.push("    if (!$userId) return;");
  lines.push("    echo '<script src=\"" + API + "/api/website-agent.js?v=1.3.0\" data-user-id=\"' . esc_attr($userId) . '\" data-site=\"' . esc_attr(home_url('/')) . '\" data-enabled=\"true\"></script>';");
  lines.push("}");
  lines.push("add_action('wp_head', 'moshtiyar_agent', 100);");
  lines.push("");
  lines.push("function moshtiyar_notice() {");
  lines.push("    if (!current_user_can('manage_options')) return;");
  lines.push("    $status = get_option('moshtiyar_status', '');");
  lines.push("    $message = get_option('moshtiyar_message', '');");
  lines.push("    if ($status === 'connected') {");
  lines.push("        $hasApiKey = !empty(get_option('moshtiyar_api_key', ''));");
  lines.push("        $apiKeyStatus = $hasApiKey ? 'کلید API فعال' : 'در انتظار کلید API';");
  lines.push("        echo '<div class=\"notice notice-success\"><p>مشتری‌یار با موفقیت متصل است. ' . esc_html($apiKeyStatus) . '</p></div>';");
  lines.push("    } elseif ($status === 'connecting') {");
  lines.push("        echo '<div class=\"notice notice-warning\"><p>مشتری‌یار در حال اتصال است.</p></div>';");
  lines.push("    } elseif ($status === 'error') {");
  lines.push("        echo '<div class=\"notice notice-error\"><p>مشتری‌یار: ' . esc_html($message) . '</p></div>';");
  lines.push("    }");
  lines.push("}");
  lines.push("add_action('admin_notices', 'moshtiyar_notice');");
  return lines.join("\n");
}

async function sendZip(res, token) {
  const php = buildPluginPHP(token);
  const zip = new JSZip();
  const folder = zip.folder("moshtiyar-ai-agent");
  folder.file("moshtiyar-ai-agent.php", php);
  folder.file("readme.txt", "Moshtriyar AI Agent\n\nVersion: 1.3.0\n");

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

async function validateConnection(token, siteUrl) {
  const requestedOrigin = origin(siteUrl);
  if (!requestedOrigin) {
    return { ok: false, code: 400, error: "Invalid site URL" };
  }

  const { data: connection, error } = await supabase
    .from("wordpress_connections")
    .select("id, user_id, site_url, expires_at, used_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error) {
    console.error("lookup:", error);
    return { ok: false, code: 500, error: "Lookup failed" };
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

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const token = String(req.query?.token || "").trim();
      const siteUrl = String(req.query?.siteUrl || "").trim();

      if (!token || !siteUrl) {
        return res.status(400).json({ error: "Token and siteUrl required" });
      }

      const check = await validateConnection(token, siteUrl);
      if (!check.ok) {
        return res.status(check.code).json({ error: check.error });
      }

      await supabase
        .from("wordpress_connections")
        .update({ used_at: new Date().toISOString() })
        .eq("id", check.connection.id);

      return sendZip(res, token);
    }

    if (req.method === "POST") {
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
        .select("id, user_id, site_url, expires_at, used_at")
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

      return sendZip(res, token);
    }

    return res.status(405).json({ error: "Method Not Allowed" });

  } catch (error) {
    console.error("wordpress-plugin error:", error?.message, error?.stack);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
