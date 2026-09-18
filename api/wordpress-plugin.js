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

        /* ===== احراز هویت مشتری‌یار ===== */

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

        /* ===== اطلاعات اتصال ===== */

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

        /* ===== بررسی توکن ===== */

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

        /* ===== قالب واقعی افزونه ===== */

        const pluginCode = `<?php

/**
 * Plugin Name: Moshtriyar AI Agent
 * Plugin URI: https://moshtriyar.vercel.app
 * Description: اتصال خودکار وب‌سایت وردپرسی به دستیار هوشمند مشتری‌یار
 * Version: 1.0.0
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

function moshtriyar_activate_plugin() {

    $token =
        MOSHTRIYAR_CONNECTION_TOKEN;

    if (
        !$token ||
        $token === '__CONNECTION_TOKEN__'
    ) {
        return;
    }

    $response =
        wp_remote_post(
            MOSHTRIYAR_API_URL,
            array(
                'timeout' => 20,
                'headers' => array(
                    'Content-Type' =>
                        'application/json'
                ),
                'body' => wp_json_encode(
                    array(
                        'token' => $token,
                        'siteUrl' =>
                            home_url('/')
                    )
                )
            )
        );

    if (is_wp_error($response)) {

        update_option(
            'moshtriyar_connection_status',
            'error'
        );

        return;
    }

    $status =
        wp_remote_retrieve_response_code(
            $response
        );

    $body =
        json_decode(
            wp_remote_retrieve_body($response),
            true
        );

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

    } else {

        update_option(
            'moshtriyar_connection_status',
            'error'
        );
    }
}

register_activation_hook(
    __FILE__,
    'moshtriyar_activate_plugin'
);

function moshtriyar_add_agent() {

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

    echo '<script
        src="https://moshtriyar.vercel.app/api/website-agent.js"
        data-user-id="' .
        esc_attr($userId) .
        '"
        data-site="' .
        esc_url(home_url('/')) .
        '"
        data-enabled="true">
    </script>';
}

add_action(
    'wp_head',
    'moshtriyar_add_agent',
    100
);

        const finalPlugin =
            pluginCode.replace(
                /__CONNECTION_TOKEN__/g,
                token
            );

        /* ===== ساخت ZIP ===== */

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

نسخه: 1.0.0

افزونه اتصال خودکار سایت وردپرسی
به مشتری‌یار.

نصب:
افزونه را نصب و فعال کنید.
اتصال به‌صورت خودکار انجام می‌شود.
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
