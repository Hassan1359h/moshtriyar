import crypto from "crypto";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

function hashToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

function normalizeOrigin(value) {
    try {
        const url =
            new URL(String(value || "").trim());

        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {
            return null;
        }

        return url.origin;
    } catch {
        return null;
    }
}

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method Not Allowed"
        });
    }

    try {

        /* =========================
           احراز هویت مشتری‌یار
        ========================= */

        const auth =
            req.headers.authorization || "";

        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        const accessToken =
            auth.replace("Bearer ", "").trim();

        const {
            data: { user },
            error: userError
        } =
            await supabaseAdmin.auth.getUser(
                accessToken
            );

        if (userError || !user) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        /* =========================
           اطلاعات اتصال
        ========================= */

        const token =
            String(
                req.body?.token || ""
            ).trim();

        const siteUrl =
            String(
                req.body?.siteUrl || ""
            ).trim();

        if (!token) {
            return res.status(400).json({
                error: "Missing connection token"
            });
        }

        if (!siteUrl) {
            return res.status(400).json({
                error: "Missing site URL"
            });
        }

        const requestedOrigin =
            normalizeOrigin(siteUrl);

        if (!requestedOrigin) {
            return res.status(400).json({
                error: "Invalid site URL"
            });
        }

        /* =========================
           بررسی توکن
        ========================= */

        const tokenHash =
            hashToken(token);

        const {
            data: connection,
            error: connectionError
        } =
            await supabaseAdmin
                .from("wordpress_connections")
                .select(
                    "id,user_id,site_url,expires_at,used_at"
                )
                .eq(
                    "token_hash",
                    tokenHash
                )
                .maybeSingle();

        if (connectionError) {

            console.error(
                "wordpress connection lookup:",
                connectionError
            );

            return res.status(500).json({
                error:
                    "Connection lookup failed"
            });
        }

        if (!connection) {
            return res.status(401).json({
                error:
                    "Invalid connection token"
            });
        }

        if (
            connection.user_id !== user.id
        ) {
            return res.status(403).json({
                error:
                    "Connection does not belong to this user"
            });
        }

        if (connection.used_at) {
            return res.status(409).json({
                error:
                    "Connection token has already been used"
            });
        }

        if (
            !connection.expires_at ||
            new Date(
                connection.expires_at
            ).getTime() <= Date.now()
        ) {
            return res.status(410).json({
                error:
                    "Connection token has expired"
            });
        }

        const configuredOrigin =
            normalizeOrigin(
                connection.site_url
            );

        if (
            !configuredOrigin ||
            configuredOrigin.toLowerCase() !==
            requestedOrigin.toLowerCase()
        ) {
            return res.status(403).json({
                error:
                    "Website is not authorized"
            });
        }

        /* =========================
           کد واقعی افزونه
        ========================= */

        const pluginCode = `<?php

/**
 * Plugin Name: Moshtriyar AI Agent
 * Plugin URI: https://moshtriyar.vercel.app
 * Description: اتصال خودکار وب‌سایت وردپرسی به دستیار هوشمند مشتری‌یار
 * Version: 1.0.2
 * Author: Moshtriyar
 */

if (!defined('ABSPATH')) {
    exit;
}

define(
    'MOSHTRIYAR_CONNECTION_TOKEN',
    '__CONNECTION_TOKEN__'
);

define(
    'MOSHTRIYAR_API_URL',
    'https://moshtriyar.vercel.app/api/wordpress-activate'
);

/*
 * تلاش برای اتصال به مشتری‌یار
 */
function moshtriyar_connect_to_service() {

    $token =
        MOSHTRIYAR_CONNECTION_TOKEN;

    if (
        !$token ||
        $token === '__CONNECTION_TOKEN__'
    ) {
        update_option(
            'moshtriyar_connection_status',
            'error'
        );

        update_option(
            'moshtriyar_connection_message',
            'توکن اتصال در افزونه وجود ندارد.'
        );

        return false;
    }

    $response =
        wp_remote_post(
            MOSHTRIYAR_API_URL,
            array(
                'timeout' => 30,
                'headers' => array(
                    'Content-Type' =>
                        'application/json'
                ),
                'body' => wp_json_encode(
                    array(
                        'token' =>
                            $token,
                        'siteUrl' =>
                            home_url('/')
                    )
                )
            )
        );

    /*
     * خطای ارتباط با سرور
     */
    if (is_wp_error($response)) {

        $errorMessage =
            $response->get_error_message();

        update_option(
            'moshtriyar_connection_status',
            'error'
        );

        update_option(
            'moshtriyar_connection_message',
            $errorMessage
        );

        error_log(
            'Moshtriyar connection error: ' .
            $errorMessage
        );

        return false;
    }

    $status =
        wp_remote_retrieve_response_code(
            $response
        );

    $rawBody =
        wp_remote_retrieve_body(
            $response
        );

    $body =
        json_decode(
            $rawBody,
            true
        );

    /*
     * اتصال موفق
     */
    if (
        $status >= 200 &&
        $status < 300 &&
        !empty($body['success'])
    ) {

        update_option(
            'moshtriyar_connection_status',
            'connected'
        );

        update_option(
            'moshtriyar_user_id',
            sanitize_text_field(
                $body['userId'] ?? ''
            )
        );

        update_option(
            'moshtriyar_connection_message',
            'اتصال با موفقیت انجام شد.'
        );

        delete_option(
            'moshtriyar_connection_pending'
        );

        return true;
    }

    /*
     * خطای برگشتی از API
     */
    $errorMessage =
        sanitize_text_field(
            $body['error'] ??
            (
                'HTTP ' .
                $status .
                ' - پاسخ نامعتبر از سرور مشتری‌یار'
            )
        );

    update_option(
        'moshtriyar_connection_status',
        'error'
    );

    update_option(
        'moshtriyar_connection_message',
        $errorMessage
    );

    error_log(
        'Moshtriyar API error: ' .
        $status .
        ' - ' .
        $rawBody
    );

    return false;
}

/*
 * هنگام فعال‌سازی فقط اتصال را علامت‌گذاری می‌کنیم.
 */
function moshtriyar_activate_plugin() {

    update_option(
        'moshtriyar_connection_pending',
        '1'
    );

    update_option(
        'moshtriyar_connection_status',
        'connecting'
    );

    update_option(
        'moshtriyar_connection_message',
        'در حال اتصال به مشتری‌یار...'
    );
}

register_activation_hook(
    __FILE__,
    'moshtriyar_activate_plugin'
);

/*
 * تلاش واقعی بعد از ورود به پیشخوان.
 */
function moshtriyar_admin_connection_check() {

    $status =
        get_option(
            'moshtriyar_connection_status',
            ''
        );

    $pending =
        get_option(
            'moshtriyar_connection_pending',
            ''
        );

    if (
        $status === 'connected'
    ) {
        return;
    }

    if (
        $pending === '1' ||
        $status === 'connecting' ||
        $status === 'error'
    ) {

        moshtriyar_connect_to_service();
    }
}

add_action(
    'admin_init',
    'moshtriyar_admin_connection_check'
);

/*
 * نمایش دستیار در سایت
 */
function moshtriyar_add_agent() {

    if (is_admin()) {
        return;
    }

    $status =
        get_option(
            'moshtriyar_connection_status',
            ''
        );

    $userId =
        get_option(
            'moshtriyar_user_id',
            ''
        );

    if (
        $status !== 'connected' ||
        !$userId
    ) {
        return;
    }

    $siteUrl =
        home_url('/');

    echo '<script
        src="https://moshtriyar.vercel.app/api/website-agent.js?v=1.0.2"
        data-user-id="' .
        esc_attr($userId) .
        '"
        data-site="' .
        esc_attr($siteUrl) .
        '"
        data-enabled="true">
    </script>';
}

add_action(
    'wp_head',
    'moshtriyar_add_agent',
    100
);

/*
 * پیام وضعیت در پیشخوان
 */
function moshtriyar_admin_notice() {

    if (
        !current_user_can('manage_options')
    ) {
        return;
    }

    $status =
        get_option(
            'moshtriyar_connection_status',
            ''
        );

    $message =
        get_option(
            'moshtriyar_connection_message',
            ''
        );

    if (
        $status === 'connected'
    ) {

        echo '<div class="notice notice-success is-dismissible">
            <p>
                ✅ مشتری‌یار با موفقیت به این سایت متصل است.
            </p>
        </div>';

        return;
    }

    if (
        $status === 'connecting'
    ) {

        echo '<div class="notice notice-warning">
            <p>
                ⏳ مشتری‌یار در حال اتصال است. صفحه را یک‌بار تازه‌سازی کنید.
            </p>
        </div>';

        return;
    }

    if (
        $status === 'error'
    ) {

        echo '<div class="notice notice-error">
            <p>
                ❌ اتصال مشتری‌یار انجام نشد:
                ' .
                esc_html(
                    $message
                ) .
                '
            </p>
        </div>';
    }
}

`;

        const finalPlugin =
            pluginCode.replace(
                /__CONNECTION_TOKEN__/g,
                token
            );

        /* =========================
           ساخت ZIP
        ========================= */

        const zip =
            new JSZip();

        const folder =
            zip.folder(
                "moshtriyar-ai-agent"
            );

        folder.file(
            "moshtriyar-ai-agent.php",
            finalPlugin
        );

        folder.file(
            "readme.txt",
`=== Moshtriyar AI Agent ===

Version: 1.0.2

اتصال خودکار سایت وردپرسی
به مشتری‌یار.

نصب:
1. افزونه را نصب کنید.
2. افزونه را فعال کنید.
3. وارد پیشخوان وردپرس شوید.
4. وضعیت اتصال مشتری‌یار را مشاهده کنید.
`
        );

        const zipBuffer =
            await zip.generateAsync({
                type: "nodebuffer",
                compression: "DEFLATE",
                compressionOptions: {
                    level: 9
                }
            });

        res.statusCode = 200;

        res.setHeader(
            "Content-Type",
            "application/zip"
        );

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="moshtriyar-ai-agent.zip"'
        );

        res.setHeader(
            "Content-Length",
            String(zipBuffer.length)
        );

        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate"
        );

        return res.end(zipBuffer);

    } catch (error) {

        console.error(
            "wordpress-plugin error:",
            error
        );

        return res.status(500).json({
            error:
                "Internal Server Error"
        });
    }
}
