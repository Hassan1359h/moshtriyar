<?php

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

/*
 * توکن اتصال توسط مشتری‌یار هنگام ساخت ZIP جایگزین می‌شود.
 */
define(
    'MOSHTRIYAR_CONNECTION_TOKEN',
    '__CONNECTION_TOKEN__'
);

define(
    'MOSHTRIYAR_API_URL',
    'https://moshtriyar.vercel.app/api/wordpress-activate'
);

/*
 * اتصال خودکار هنگام فعال‌سازی افزونه
 */
function moshtriyar_activate_plugin() {

    $token = MOSHTRIYAR_CONNECTION_TOKEN;

    if (!$token || $token === '__CONNECTION_TOKEN__') {
        return;
    }

    $site_url = home_url('/');

    $response = wp_remote_post(
        MOSHTRIYAR_API_URL,
        array(
            'timeout' => 20,
            'headers' => array(
                'Content-Type' => 'application/json'
            ),
            'body' => wp_json_encode(
                array(
                    'token'   => $token,
                    'siteUrl' => $site_url
                )
            )
        )
    );

    if (is_wp_error($response)) {

        update_option(
            'moshtriyar_connection_status',
            'error'
        );

        update_option(
            'moshtriyar_connection_message',
            $response->get_error_message()
        );

        return;
    }

    $status =
        wp_remote_retrieve_response_code($response);

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

        update_option(
            'moshtriyar_connection_message',
            'اتصال با موفقیت انجام شد.'
        );

    } else {

        update_option(
            'moshtriyar_connection_status',
            'error'
        );

        update_option(
            'moshtriyar_connection_message',
            sanitize_text_field(
                $body['error'] ??
                'اتصال انجام نشد.'
            )
        );
    }
}

register_activation_hook(
    __FILE__,
    'moshtriyar_activate_plugin'
);

/*
 * نمایش دستیار در سایت
 */
function moshtriyar_add_agent() {

    $status =
        get_option(
            'moshtriyar_connection_status',
            ''
        );

    $user_id =
        get_option(
            'moshtriyar_user_id',
            ''
        );

    if (
        $status !== 'connected' ||
        !$user_id
    ) {
        return;
    }

    $site_url =
        home_url('/');

    echo '<script
        src="https://moshtriyar.vercel.app/api/website-agent.js"
        data-user-id="' .
        esc_attr($user_id) . '"
        data-site="' .
        esc_url($site_url) . '"
        data-enabled="true">
    </script>';
}

add_action(
    'wp_footer',
    'moshtriyar_add_agent',
    100
);

/*
 * وضعیت اتصال در پیشخوان وردپرس
 */
function moshtriyar_admin_notice() {

    if (!current_user_can('manage_options')) {
        return;
    }

    $status =
        get_option(
            'moshtriyar_connection_status',
            ''
        );

    if ($status === 'connected') {

        echo '<div class="notice notice-success is-dismissible">
            <p>✅ مشتری‌یار با موفقیت به این سایت متصل است.</p>
        </div>';

    } elseif ($status === 'error') {

        $message =
            get_option(
                'moshtriyar_connection_message',
                'اتصال انجام نشد.'
            );

        echo '<div class="notice notice-error">
            <p>❌ اتصال مشتری‌یار انجام نشد: ' .
            esc_html($message) .
            '</p>
        </div>';
    }
}

add_action(
    'admin_notices',
    'moshtriyar_admin_notice'
);
