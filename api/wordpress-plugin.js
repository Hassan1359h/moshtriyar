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

const API = "https://moshtriyar.vercel.app";

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
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
      return res.status(400).json({ error: "Token and site URL are required" });
    }

    const requestedOrigin = origin(siteUrl);
    if (!requestedOrigin) {
      return res.status(400).json({ error: "Invalid site URL" });
    }

    const { data: connection, error } = await supabase
      .from("wordpress_connections")
      .select("id,user_id,site_url,expires_at,used_at")
      .eq("token_hash", hashToken(token))
      .maybeSingle();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Connection lookup failed" });
    }
    if (!connection) {
      return res.status(401).json({ error: "Invalid connection token" });
    }
    if (connection.user_id !== user.id) {
      return res.status(403).json({ error: "Connection does not belong to this user" });
    }
    if (connection.used_at) {
      return res.status(409).json({ error: "Connection token has already been used" });
    }
    if (!connection.expires_at || new Date(connection.expires_at).getTime() <= Date.now()) {
      return res.status(410).json({ error: "Connection token has expired" });
    }

    const allowedOrigin = origin(connection.site_url);
    if (!allowedOrigin || allowedOrigin.toLowerCase() !== requestedOrigin.toLowerCase()) {
      return res.status(403).json({ error: "Website is not authorized" });
    }

    const plugin = buildPluginPHP(token);

    const zip = new JSZip();
    const folder = zip.folder("moshtiyar-ai-agent");
    folder.file("moshtiyar-ai-agent.php", plugin);
    folder.file(
      "readme.txt",
      "Moshtriyar AI Agent\n\nنسخه: 1.2.0\n\nنصب:\n1. افزونه را نصب کنید.\n2. افزونه را فعال کنید.\n3. وارد پیشخوان وردپرس شوید.\n4. اتصال به مشتری‌یار انجام می‌شود.\n"
    );

    const buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 }
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="moshtariyar-ai-agent.zip"');
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "no-store");
    return res.end(buffer);

  } catch (error) {
    console.error("Moshtriyar plugin error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

function buildPluginPHP(token) {
  // اینجا کد PHP رو با string ساده می‌سازیم (بدون template literal با ${})
  const PHP_PARTS = [];

  PHP_PARTS.push("<?php");
  PHP_PARTS.push("/**");
  PHP_PARTS.push(" * Plugin Name: Moshtriyar AI Agent");
  PHP_PARTS.push(" * Description: اتصال خودکار سایت وردپرسی به دستیار مشتری‌یار");
  PHP_PARTS.push(" * Version: 1.2.0");
  PHP_PARTS.push(" * Author: Moshtriyar");
  PHP_PARTS.push(" */");
  PHP_PARTS.push("");
  PHP_PARTS.push("if (!defined('ABSPATH')) exit;");
  PHP_PARTS.push("");
  PHP_PARTS.push("define('MOSHTRIYAR_TOKEN', '" + token + "');");
  PHP_PARTS.push("define('MOSHTRIYAR_API', '" + API + "/api/wordpress-activate');");
  PHP_PARTS.push("define('MOSHTRIYAR_API_SYNC', '" + API + "/api/product-sync');");
  PHP_PARTS.push("");
  PHP_PARTS.push("function moshtriyar_connect() {");
  PHP_PARTS.push("    $response = wp_remote_post(MOSHTRIYAR_API, array(");
  PHP_PARTS.push("        'timeout' => 30,");
  PHP_PARTS.push("        'headers' => array('Content-Type' => 'application/json'),");
  PHP_PARTS.push("        'body' => wp_json_encode(array(");
  PHP_PARTS.push("            'token' => MOSHTRIYAR_TOKEN,");
  PHP_PARTS.push("            'siteUrl' => home_url('/')");
  PHP_PARTS.push("        ))");
  PHP_PARTS.push("    ));");
  PHP_PARTS.push("");
  PHP_PARTS.push("    if (is_wp_error($response)) {");
  PHP_PARTS.push("        update_option('moshtiyar_status', 'error');");
  PHP_PARTS.push("        update_option('moshtiyar_message', $response->get_error_message());");
  PHP_PARTS.push("        return false;");
  PHP_PARTS.push("    }");
  PHP_PARTS.push("");
  PHP_PARTS.push("    $code = wp_remote_retrieve_response_code($response);");
  PHP_PARTS.push("    $body = json_decode(wp_remote_retrieve_body($response), true);");
  PHP_PARTS.push("");
  PHP_PARTS.push("    if ($code >= 200 && $code < 300 && !empty($body['success'])) {");
  PHP_PARTS.push("        update_option('moshtiyar_status', 'connected');");
  PHP_PARTS.push("        update_option('moshtiyar_user_id', sanitize_text_field($body['userId'] ?? ''));");
  PHP_PARTS.push("        if (!empty($body['apiKey'])) {");
  PHP_PARTS.push("            update_option('moshtiyar_api_key', sanitize_text_field($body['apiKey']));");
  PHP_PARTS.push("        }");
  PHP_PARTS.push("        update_option('moshtiyar_message', 'مشتری‌یار با موفقیت متصل شد.');");
  PHP_PARTS.push("        return true;");
  PHP_PARTS.push("    }");
  PHP_PARTS.push("");
  PHP_PARTS.push("    update_option('moshtiyar_status', 'error');");
  PHP_PARTS.push("    update_option('moshtiyar_message', sanitize_text_field($body['error'] ?? 'خطا در اتصال'));");
  PHP_PARTS.push("    return false;");
  PHP_PARTS.push("}");
  PHP_PARTS.push("");
  PHP_PARTS.push("function moshtiyar_activate() {");
  PHP_PARTS.push("    update_option('moshtiyar_status', 'connecting');");
  PHP_PARTS.push("    update_option('moshtiyar_message', 'در حال اتصال به مشتری‌یار...');");
  PHP_PARTS.push("}");
  PHP_PARTS.push("register_activation_hook(__FILE__, 'moshtiyar_activate');");
  PHP_PARTS.push("");
  PHP_PARTS.push("function moshtiyar_admin_check() {");
  PHP_PARTS.push("    $status = get_option('moshtiyar_status', '');");
  PHP_PARTS.push("    if ($status !== 'connected') {");
  PHP_PARTS.push("        moshtriyar_connect();");
  PHP_PARTS.push("    }");
  PHP_PARTS.push("}");
  PHP_PARTS.push("add_action('admin_init', 'moshtiyar_admin_check');");
  PHP_PARTS.push("");
  PHP_PARTS.push("function moshtiyar_sync_products() {");
  PHP_PARTS.push("    if (!function_exists('wc_get_products')) {");
  PHP_PARTS.push("        return array('success' => false, 'message' => 'ووکامرس نصب نیست');");
  PHP_PARTS.push("    }");
  PHP_PARTS.push("    $apiKey = get_option('moshtiyar_api_key', '');");
  PHP_PARTS.push("    if (!$apiKey) {");
  PHP_PARTS.push("        return array('success' => false, 'message' => 'کلید API تنظیم نشده');");
  PHP_PARTS.push("    }");
  PHP_PARTS.push("    $products = wc_get_products(array('limit' => -1, 'status' => 'publish'));");
  PHP_PARTS.push("    $payload = array();");
  PHP_PARTS.push("    foreach ($products as $product) {");
  PHP_PARTS.push("        $image_id = $product->get_image_id();");
  PHP_PARTS.push("        $image_url = $image_id ? wp_get_attachment_image_url($image_id, 'medium') : '';");
  PHP_PARTS.push("        $categories = wp_get_post_terms($product->get_id(), 'product_cat', array('fields' => 'names'));");
  PHP_PARTS.push("        $payload[] = array(");
  PHP_PARTS.push("            'id' => (string) $product->get_id(),");
  PHP_PARTS.push("            'sku' => (string) $product->get_sku(),");
  PHP_PARTS.push("            'name' => $product->get_name(),");
  PHP_PARTS.push("            'sale_price' => (float) $product->get_price(),");
  PHP_PARTS.push("            'stock' => (int) $product->get_stock_quantity(),");
  PHP_PARTS.push("            'image_url' => $image_url ? $image_url : '',");
  PHP_PARTS.push("            'category' => !empty($categories) ? $categories[0] : ''");
  PHP_PARTS.push("        );");
  PHP_PARTS.push("    }");
  PHP_PARTS.push("    if (empty($payload)) {");
  PHP_PARTS.push("        return array('success' => false, 'message' => 'کالایی پیدا نشد');");
  PHP_PARTS.push("    }");
  PHP_PARTS.push("    $response = wp_remote_post(MOSHTRIYAR_API_SYNC, array(");
  PHP_PARTS.push("        'timeout' => 60,");
  PHP_PARTS.push("        'headers' => array('Content-Type' => 'application/json'),");
  PHP_PARTS.push("        'body' => wp_json_encode(array(");
  PHP_PARTS.push("            'apiKey' => $apiKey,");
  PHP_PARTS.push("            'siteUrl' => home_url('/'),");
  PHP_PARTS.push("            'products' => $payload");
  PHP_PARTS.push("        ))");
  PHP_PARTS.push("    ));");
  PHP_PARTS.push("    if (is_wp_error($response)) {");
  PHP_PARTS.push("        return array('success' => false, 'message' => $response->get_error_message());");
  PHP_PARTS.push("    }");
  PHP_PARTS.push("    $body = json_decode(wp_remote_retrieve_body($response), true);");
  PHP_PARTS.push("    if (!empty($body['success'])) {");
  PHP_PARTS.push("        update_option('moshtiyar_last_sync', current_time('mysql'));");
  PHP_PARTS.push("        update_option('moshtiyar_synced_count', intval($body['synced'] ?? 0));");
  PHP_PARTS.push("        return array('success' => true, 'message' => 'تعداد ' . ($body['synced'] ?? 0) . ' کالا همگام شد');");
  PHP_PARTS.push("    }");
  PHP_PARTS.push("    return array('success' => false, 'message' => $body['error'] ?? 'خطای نامشخص');");
  PHP_PARTS.push("}");
  PHP_PARTS.push("");
  PHP_PARTS.push("function moshtiyar_sync_button() {");
  PHP_PARTS.push("    if (!current_user_can('manage_options')) return;");
  PHP_PARTS.push("    if (isset($_POST['moshtiyar_sync_now']) && check_admin_referer('moshtiyar_sync_action')) {");
  PHP_PARTS.push("        $result = moshtiyar_sync_products();");
  PHP_PARTS.push("        $cls = $result['success'] ? 'notice-success' : 'notice-error';");
  PHP_PARTS.push("        echo '<div class=\"notice ' . $cls . '\"><p>' . esc_html($result['message']) . '</p></div>';");
  PHP_PARTS.push("    }");
  PHP_PARTS.push("    $lastSync = get_option('moshtiyar_last_sync', 'هرگز');");
  PHP_PARTS.push("    $syncedCount = get_option('moshtiyar_synced_count', 0);");
  PHP_PARTS.push("    echo '<div class=\"notice notice-info\" style=\"padding:12px;\">';");
  PHP_PARTS.push("    echo '<p><strong>🔄 همگام‌سازی کالاها با مشتری‌یار</strong></p>';");
  PHP_PARTS.push("    echo '<p>آخرین همگام‌سازی: ' . esc_html($lastSync) . ' | تعداد کالا: ' . esc_html($syncedCount) . '</p>';");
  PHP_PARTS.push("    echo '<form method=\"post\">';");
  PHP_PARTS.push("    wp_nonce_field('moshtiyar_sync_action');");
  PHP_PARTS.push("    echo '<button type=\"submit\" name=\"moshtiyar_sync_now\" class=\"button button-primary\">🔄 همگام‌سازی الان</button>';");
  PHP_PARTS.push("    echo '</form>';");
  PHP_PARTS.push("    echo '</div>';");
  PHP_PARTS.push("}");
  PHP_PARTS.push("add_action('admin_notices', 'moshtiyar_sync_button');");
  PHP_PARTS.push("");
  PHP_PARTS.push("function moshtiyar_agent() {");
  PHP_PARTS.push("    if (is_admin()) return;");
  PHP_PARTS.push("    if (get_option('moshtiyar_status') !== 'connected') return;");
  PHP_PARTS.push("    $userId = get_option('moshtiyar_user_id', '');");
  PHP_PARTS.push("    if (!$userId) return;");
  PHP_PARTS.push("    echo '<script src=\"" + API + "/api/website-agent.js?v=1.2.0\" data-user-id=\"' . esc_attr($userId) . '\" data-site=\"' . esc_attr(home_url('/')) . '\" data-enabled=\"true\"></script>';");
  PHP_PARTS.push("}");
  PHP_PARTS.push("add_action('wp_head', 'moshtiyar_agent', 100);");
  PHP_PARTS.push("");
  PHP_PARTS.push("function moshtiyar_notice() {");
  PHP_PARTS.push("    if (!current_user_can('manage_options')) return;");
  PHP_PARTS.push("    $status = get_option('moshtiyar_status', '');");
  PHP_PARTS.push("    $message = get_option('moshtiyar_message', '');");
  PHP_PARTS.push("    if ($status === 'connected') {");
  PHP_PARTS.push("        $hasApiKey = !empty(get_option('moshtiyar_api_key', ''));");
  PHP_PARTS.push("        $apiKeyStatus = $hasApiKey ? '🟢 کلید API فعال' : '🟡 در انتظار کلید API';");
  PHP_PARTS.push("        echo '<div class=\"notice notice-success\"><p>✅ مشتری‌یار با موفقیت متصل است. ' . $apiKeyStatus . '</p></div>';");
  PHP_PARTS.push("    } elseif ($status === 'connecting') {");
  PHP_PARTS.push("        echo '<div class=\"notice notice-warning\"><p>⏳ مشتری‌یار در حال اتصال است.</p></div>';");
  PHP_PARTS.push("    } elseif ($status === 'error') {");
  PHP_PARTS.push("        echo '<div class=\"notice notice-error\"><p>❌ مشتری‌یار: ' . esc_html($message) . '</p></div>';");
  PHP_PARTS.push("    }");
  PHP_PARTS.push("}");
  PHP_PARTS.push("add_action('admin_notices', 'moshtiyar_notice');");

  return PHP_PARTS.join("\n");
}
