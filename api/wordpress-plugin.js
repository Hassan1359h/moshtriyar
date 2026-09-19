import crypto from "crypto";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
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
    /* احراز هویت مدیر مشتری‌یار */
    const auth = req.headers.authorization || "";

    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const accessToken = auth.slice(7).trim();

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    /* اطلاعات اتصال */
    const token = String(req.body?.token || "").trim();
    const siteUrl = String(req.body?.siteUrl || "").trim();

    if (!token || !siteUrl) {
      return res.status(400).json({
        error: "Token and site URL are required"
      });
    }

    const requestedOrigin = origin(siteUrl);

    if (!requestedOrigin) {
      return res.status(400).json({
        error: "Invalid site URL"
      });
    }

    /* بررسی اتصال */
    const { data: connection, error } = await supabase
      .from("wordpress_connections")
      .select("id,user_id,site_url,expires_at,used_at")
      .eq("token_hash", hashToken(token))
      .maybeSingle();

    if (error) {
      console.error(error);
      return res.status(500).json({
        error: "Connection lookup failed"
      });
    }

    if (!connection) {
      return res.status(401).json({
        error: "Invalid connection token"
      });
    }

    if (connection.user_id !== user.id) {
      return res.status(403).json({
        error: "Connection does not belong to this user"
      });
    }

    if (connection.used_at) {
      return res.status(409).json({
        error: "Connection token has already been used"
      });
    }

    if (
      !connection.expires_at ||
      new Date(connection.expires_at).getTime() <= Date.now()
    ) {
      return res.status(410).json({
        error: "Connection token has expired"
      });
    }

    const allowedOrigin = origin(connection.site_url);

    if (
      !allowedOrigin ||
      allowedOrigin.toLowerCase() !== requestedOrigin.toLowerCase()
    ) {
      return res.status(403).json({
        error: "Website is not authorized"
      });
    }

    /* افزونه وردپرس */
    const plugin = `<?php
/**
 * Plugin Name: Moshtriyar AI Agent
 * Description: اتصال خودکار سایت وردپرسی به دستیار مشتری‌یار
 * Version: 1.1.0
 * Author: Moshtriyar
 */

if (!defined('ABSPATH')) exit;

define('MOSHTRIYAR_TOKEN', '${token}');
define('MOSHTRIYAR_API', '${API}/api/wordpress-activate');

function moshtriyar_connect() {

    $response = wp_remote_post(
        MOSHTRIYAR_API,
        array(
            'timeout' => 30,
            'headers' => array(
                'Content-Type' => 'application/json'
            ),
            'body' => wp_json_encode(array(
                'token' => MOSHTRIYAR_TOKEN,
                'siteUrl' => home_url('/')
            ))
        )
    );

    if (is_wp_error($response)) {
        update_option(
            'moshtiyar_status',
            'error'
        );

        update_option(
            'moshtiyar_message',
            $response->get_error_message()
        );

        return false;
    }

    $code = wp_remote_retrieve_response_code($response);
    $body = json_decode(
        wp_remote_retrieve_body($response),
        true
    );

    if ($code >= 200 && $code < 300 && !empty($body['success'])) {

        update_option(
            'moshtiyar_status',
            'connected'
        );

        update_option(
            'moshtiyar_user_id',
            sanitize_text_field($body['userId'] ?? '')
        );

        update_option(
            'moshtiyar_message',
            'مشتری‌یار با موفقیت متصل شد.'
        );

        return true;
    }

    update_option(
        'moshtiyar_status',
        'error'
    );

    update_option(
        'moshtiyar_message',
        sanitize_text_field(
            $body['error'] ?? 'خطا در اتصال به مشتری‌یار'
        )
    );

    return false;
}

function moshtiyar_activate() {

    update_option(
        'moshtiyar_status',
        'connecting'
    );

    update_option(
        'moshtiyar_message',
        'در حال اتصال به مشتری‌یار...'
    );
}

register_activation_hook(
    __FILE__,
    'moshtiyar_activate'
);

function moshtiyar_admin_check() {

    $status = get_option(
        'moshtiyar_status',
        ''
    );

    if ($status !== 'connected') {
        moshtriyar_connect();
    }
}

add_action(
    'admin_init',
    'moshtiyar_admin_check'
);

function moshtiyar_agent() {

    if (is_admin()) return;

    if (
        get_option('moshtiyar_status') !== 'connected'
    ) {
        return;
    }

    $userId = get_option(
        'moshtiyar_user_id',
        ''
    );

    if (!$userId) return;

    echo '<script
        src="${API}/api/website-agent.js?v=1.1.0"
        data-user-id="' .
        esc_attr($userId) .
        '"
        data-site="' .
        esc_attr(home_url('/')) .
        '"
        data-enabled="true">
    </script>';
}

add_action(
    'wp_head',
    'moshtiyar_agent',
    100
);

function moshtiyar_notice() {

    if (!current_user_can('manage_options')) {
        return;
    }

    $status = get_option(
        'moshtiyar_status',
        ''
    );

    $message = get_option(
        'moshtiyar_message',
        ''
    );

    if ($status === 'connected') {

        echo '<div class="notice notice-success">
        <p>✅ مشتری‌یار با موفقیت متصل است.</p>
        </div>';

    } elseif ($status === 'connecting') {

        echo '<div class="notice notice-warning">
        <p>⏳ مشتری‌یار در حال اتصال است.</p>
        </div>';

    } elseif ($status === 'error') {

        echo '<div class="notice notice-error">
        <p>❌ مشتری‌یار: ' .
        esc_html($message) .
        '</p>
        </div>';
    }
}

add_action(
    'admin_notices',
    'moshtiyar_notice'
);
`;

    /* ساخت ZIP */
    const zip = new JSZip();
    const folder = zip.folder("moshtiyar-ai-agent");

    folder.file(
      "moshtiyar-ai-agent.php",
      plugin
    );

    folder.file(
      "readme.txt",
      `Moshtriyar AI Agent

نسخه: 1.1.0

نصب:
1. افزونه را نصب کنید.
2. افزونه را فعال کنید.
3. وارد پیشخوان وردپرس شوید.
4. اتصال به مشتری‌یار انجام می‌شود.
5. دستیار در سایت نمایش داده خواهد شد.
`
    );

    const buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 }
    });

    res.status(200);

    res.setHeader(
      "Content-Type",
      "application/zip"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="moshtariyar-ai-agent.zip"'
    );

    res.setHeader(
      "Content-Length",
      buffer.length
    );

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    return res.end(buffer);

  } catch (error) {

    console.error(
      "Moshtriyar plugin error:",
      error
    );

    return res.status(500).json({
      error: "Internal Server Error",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined
    });
  }
}
