<?php
/**
 * Plugin Name: Moshtiyar AI Agent
 * Plugin URI: https://moshtiyar.vercel.app
 * Description: اتصال سایت وردپرس به سرویس هوشمند مشتری‌یار
 * Version: 1.0.0
 * Author: Moshtiyar
 * Text Domain: moshtiyar-ai-agent
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * ---------------------------------------------------------
 * Configuration
 * ---------------------------------------------------------
 *
 * این مقدار توسط Vercel هنگام ساخت فایل ZIP جایگزین می‌شود.
 */
define(
    'MOSHTIYAR_CONNECTION_TOKEN',
    '__CONNECTION_TOKEN__'
);

/**
 * آدرس API اصلی مشتری‌یار
 *
 * در صورت تغییر دامنه Vercel فقط این مقدار باید تغییر کند.
 */
define(
    'MOSHTIYAR_API_URL',
    'https://moshtiyar.vercel.app/api'
);

/**
 * Version
 */
define(
    'MOSHTIYAR_PLUGIN_VERSION',
    '1.0.0'
);


/**
 * ---------------------------------------------------------
 * Main Plugin Class
 * ---------------------------------------------------------
 */
final class Moshtiyar_AI_Agent {

    /**
     * Singleton instance
     *
     * @var Moshtiyar_AI_Agent|null
     */
    private static $instance = null;


    /**
     * Get plugin instance.
     *
     * @return Moshtiyar_AI_Agent
     */
    public static function instance() {

        if (self::$instance === null) {
            self::$instance = new self();
        }

        return self::$instance;
    }


    /**
     * Constructor.
     */
    private function __construct() {

        add_action(
            'rest_api_init',
            array($this, 'register_rest_routes')
        );

        add_action(
            'admin_menu',
            array($this, 'admin_menu')
        );

        add_action(
            'admin_enqueue_scripts',
            array($this, 'admin_assets')
        );

        add_action(
            'wp_enqueue_scripts',
            array($this, 'frontend_assets')
        );

        add_shortcode(
            'moshtiyar_ai',
            array($this, 'shortcode')
        );
    }


    /**
     * -----------------------------------------------------
     * Admin Menu
     * -----------------------------------------------------
     */
    public function admin_menu() {

        add_menu_page(
            'مشتری‌یار AI',
            'مشتری‌یار AI',
            'manage_options',
            'moshtiyar-ai-agent',
            array($this, 'admin_page'),
            'dashicons-format-chat',
            58
        );
    }


    /**
     * -----------------------------------------------------
     * Admin Page
     * -----------------------------------------------------
     */
    public function admin_page() {

        if (!current_user_can('manage_options')) {
            return;
        }

        $site_url = home_url('/');
        ?>

        <div class="wrap" dir="rtl">

            <h1>مشتری‌یار AI</h1>

            <div
                style="
                    max-width:760px;
                    background:#fff;
                    padding:25px;
                    margin-top:20px;
                    border:1px solid #ddd;
                    border-radius:12px;
                "
            >

                <h2>اتصال سایت به مشتری‌یار</h2>

                <p>
                    این افزونه برای اتصال سایت وردپرس شما
                    به سرویس هوشمند مشتری‌یار استفاده می‌شود.
                </p>

                <table class="form-table">

                    <tr>
                        <th>آدرس سایت</th>

                        <td>
                            <input
                                type="text"
                                class="regular-text"
                                value="<?php echo esc_attr($site_url); ?>"
                                readonly
                            />
                        </td>
                    </tr>

                    <tr>
                        <th>وضعیت اتصال</th>

                        <td>

                            <?php
                            if (
                                MOSHTIYAR_CONNECTION_TOKEN !==
                                '__CONNECTION_TOKEN__'
                            ) {
                                ?>

                                <span
                                    style="
                                        color:#16803c;
                                        font-weight:bold;
                                    "
                                >
                                    ● اتصال فعال
                                </span>

                                <?php
                            } else {
                                ?>

                                <span
                                    style="
                                        color:#b45309;
                                        font-weight:bold;
                                    "
                                >
                                    ● افزونه هنوز فعال‌سازی نشده است
                                </span>

                                <?php
                            }
                            ?>

                        </td>
                    </tr>

                </table>

                <hr>

                <h3>درباره افزونه</h3>

                <p>
                    مشتری‌یار AI برای اضافه کردن قابلیت‌های
                    هوشمند به سایت وردپرسی طراحی شده است.
                </p>

                <p>
                    پس از فعال‌سازی، ارتباط سایت با سرویس
                    مشتری‌یار از طریق API امن انجام می‌شود.
                </p>

            </div>

        </div>

        <?php
    }


    /**
     * -----------------------------------------------------
     * Admin Assets
     * -----------------------------------------------------
     */
    public function admin_assets($hook) {

        if ($hook !== 'toplevel_page_moshtiyar-ai-agent') {
            return;
        }

        wp_enqueue_style(
            'moshtiyar-ai-admin',
            false,
            array(),
            MOSHTIYAR_PLUGIN_VERSION
        );
    }


    /**
     * -----------------------------------------------------
     * Frontend Assets
     * -----------------------------------------------------
     */
    public function frontend_assets() {

        wp_register_script(
            'moshtiyar-ai-agent',
            '',
            array(),
            MOSHTIYAR_PLUGIN_VERSION,
            true
        );

        wp_enqueue_script(
            'moshtiyar-ai-agent'
        );

        wp_localize_script(
            'moshtiyar-ai-agent',
            'MoshtiyarAI',
            array(
                'restUrl' => esc_url_raw(
                    rest_url('moshtiyar/v1/')
                ),
                'nonce' => wp_create_nonce(
                    'wp_rest'
                ),
            )
        );
    }


    /**
     * -----------------------------------------------------
     * REST API Routes
     * -----------------------------------------------------
     */
    public function register_rest_routes() {

        register_rest_route(
            'moshtiyar/v1',
            '/status',
            array(
                'methods'  => WP_REST_Server::READABLE,
                'callback' => array(
                    $this,
                    'status'
                ),
                'permission_callback' => '__return_true',
            )
        );


        register_rest_route(
            'moshtiyar/v1',
            '/connect',
            array(
                'methods'  => WP_REST_Server::CREATABLE,
                'callback' => array(
                    $this,
                    'connect'
                ),
                'permission_callback' => array(
                    $this,
                    'check_permission'
                ),
            )
        );


        register_rest_route(
            'moshtiyar/v1',
            '/ask',
            array(
                'methods'  => WP_REST_Server::CREATABLE,
                'callback' => array(
                    $this,
                    'ask_ai'
                ),
                'permission_callback' => array(
                    $this,
                    'check_permission'
                ),
            )
        );
    }


    /**
     * -----------------------------------------------------
     * Permission Check
     * -----------------------------------------------------
     */
    public function check_permission() {

        return current_user_can('manage_options');
    }


    /**
     * -----------------------------------------------------
     * Status Endpoint
     * -----------------------------------------------------
     */
    public function status() {

        $connected =
            MOSHTIYAR_CONNECTION_TOKEN !==
            '__CONNECTION_TOKEN__';

        return new WP_REST_Response(
            array(
                'success' => true,
                'plugin' => 'moshtiyar-ai-agent',
                'version' => MOSHTIYAR_PLUGIN_VERSION,
                'connected' => $connected,
                'siteUrl' => home_url('/'),
            ),
            200
        );
    }


    /**
     * -----------------------------------------------------
     * Connect Endpoint
     * -----------------------------------------------------
     */
    public function connect(WP_REST_Request $request) {

        if (
            MOSHTIYAR_CONNECTION_TOKEN ===
            '__CONNECTION_TOKEN__'
        ) {

            return new WP_Error(
                'not_activated',
                'افزونه هنوز فعال‌سازی نشده است.',
                array(
                    'status' => 403,
                )
            );
        }


        $response = $this->api_request(
            '/wordpress/connect',
            array(
                'siteUrl' => home_url('/'),
                'siteName' => get_bloginfo('name'),
                'wpVersion' => get_bloginfo('version'),
                'pluginVersion' =>
                    MOSHTIYAR_PLUGIN_VERSION,
            )
        );


        if (is_wp_error($response)) {
            return $response;
        }


        return new WP_REST_Response(
            $response,
            200
        );
    }


    /**
     * -----------------------------------------------------
     * Ask AI Endpoint
     * -----------------------------------------------------
     */
    public function ask_ai(WP_REST_Request $request) {

        $message = sanitize_textarea_field(
            $request->get_param('message')
        );


        if (empty($message)) {

            return new WP_Error(
                'empty_message',
                'پیام نمی‌تواند خالی باشد.',
                array(
                    'status' => 400,
                )
            );
        }


        if (
            MOSHTIYAR_CONNECTION_TOKEN ===
            '__CONNECTION_TOKEN__'
        ) {

            return new WP_Error(
                'not_activated',
                'افزونه هنوز فعال‌سازی نشده است.',
                array(
                    'status' => 403,
                )
            );
        }


        $response = $this->api_request(
            '/wordpress/ask',
            array(
                'message' => $message,
                'siteUrl' => home_url('/'),
                'siteName' => get_bloginfo('name'),
            )
        );


        if (is_wp_error($response)) {
            return $response;
        }


        return new WP_REST_Response(
            $response,
            200
        );
    }


    /**
     * -----------------------------------------------------
     * API Request
     * -----------------------------------------------------
     */
    private function api_request(
        $endpoint,
        $body = array()
    ) {

        $url = trailingslashit(
            MOSHTIYAR_API_URL
        ) . ltrim(
            $endpoint,
            '/'
        );


        $body['connectionToken'] =
            MOSHTIYAR_CONNECTION_TOKEN;


        $response = wp_remote_post(
            $url,
            array(
                'timeout' => 30,

                'headers' => array(
                    'Content-Type' =>
                        'application/json',

                    'Accept' =>
                        'application/json',

                    'X-Moshtiyar-Plugin' =>
                        MOSHTIYAR_PLUGIN_VERSION,
                ),

                'body' => wp_json_encode(
                    $body
                ),
            )
        );


        if (is_wp_error($response)) {

            return new WP_Error(
                'api_connection_error',
                'ارتباط با سرور مشتری‌یار برقرار نشد.',
                array(
                    'status' => 502,
                    'error' =>
                        $response->get_error_message(),
                )
            );
        }


        $status_code =
            wp_remote_retrieve_response_code(
                $response
            );


        $response_body =
            wp_remote_retrieve_body(
                $response
            );


        $decoded =
            json_decode(
                $response_body,
                true
            );


        if (
            $status_code < 200 ||
            $status_code >= 300
        ) {

            $message =
                'خطا در ارتباط با سرویس مشتری‌یار.';


            if (
                is_array($decoded) &&
                !empty($decoded['message'])
            ) {

                $message =
                    sanitize_text_field(
                        $decoded['message']
                    );
            }


            return new WP_Error(
                'moshtiyar_api_error',
                $message,
                array(
                    'status' =>
                        $status_code ?: 500,
                )
            );
        }


        if (!is_array($decoded)) {

            return new WP_Error(
                'invalid_api_response',
                'پاسخ نامعتبر از سرور مشتری‌یار دریافت شد.',
                array(
                    'status' => 502,
                )
            );
        }


        return $decoded;
    }


    /**
     * -----------------------------------------------------
     * Shortcode
     * -----------------------------------------------------
     */
    public function shortcode($atts = array()) {

        ob_start();
        ?>

        <div
            id="moshtiyar-ai-box"
            dir="rtl"
            style="
                max-width:600px;
                margin:20px auto;
                padding:20px;
                border:1px solid #ddd;
                border-radius:14px;
                background:#fff;
                box-sizing:border-box;
            "
        >

            <h3>مشتری‌یار AI</h3>

            <textarea
                id="moshtiyar-ai-message"
                rows="5"
                style="
                    width:100%;
                    box-sizing:border-box;
                    padding:12px;
                    border-radius:8px;
                    border:1px solid #ccc;
                "
                placeholder="پیام خود را بنویسید..."
            ></textarea>

            <button
                type="button"
                id="moshtiyar-ai-send"
                style="
                    margin-top:10px;
                    padding:10px 20px;
                    border:0;
                    border-radius:8px;
                    cursor:pointer;
                "
            >
                ارسال
            </button>

            <div
                id="moshtiyar-ai-result"
                style="
                    margin-top:15px;
                    white-space:pre-wrap;
                "
            ></div>

        </div>

        <script>
        document.addEventListener(
            'DOMContentLoaded',
            function () {

                const button =
                    document.getElementById(
                        'moshtiyar-ai-send'
                    );

                const input =
                    document.getElementById(
                        'moshtiyar-ai-message'
                    );

                const result =
                    document.getElementById(
                        'moshtiyar-ai-result'
                    );


                if (
                    !button ||
                    !input ||
                    !result
                ) {
                    return;
                }


                button.addEventListener(
                    'click',
                    async function () {

                        const message =
                            input.value.trim();


                        if (!message) {

                            result.textContent =
                                'لطفاً پیام خود را وارد کنید.';

                            return;
                        }


                        button.disabled = true;

                        result.textContent =
                            'در حال پردازش...';


                        try {

                            const response =
                                await fetch(
                                    '<?php
                                    echo esc_url(
                                        rest_url(
                                            'moshtiyar/v1/ask'
                                        )
                                    );
                                    ?>',
                                    {
                                        method: 'POST',

                                        headers: {
                                            'Content-Type':
                                                'application/json',

                                            'X-WP-Nonce':
                                                '<?php
                                                echo esc_js(
                                                    wp_create_nonce(
                                                        'wp_rest'
                                                    )
                                                );
                                                ?>'
                                        },

                                        body: JSON.stringify({
                                            message: message
                                        })
                                    }
                                );


                            const data =
                                await response.json();


                            if (!response.ok) {

                                throw new Error(
                                    data.message ||
                                    'خطا در پردازش درخواست'
                                );
                            }


                            result.textContent =
                                data.answer ||
                                data.message ||
                                JSON.stringify(
                                    data,
                                    null,
                                    2
                                );

                        } catch (error) {

                            result.textContent =
                                error.message ||
                                'خطایی رخ داد.';

                        } finally {

                            button.disabled = false;
                        }
                    }
                );
            }
        );
        </script>

        <?php

        return ob_get_clean();
    }
}


/**
 * ---------------------------------------------------------
 * Initialize
 * ---------------------------------------------------------
 */
function moshtiyar_ai_agent() {

    return Moshtiyar_AI_Agent::instance()
      
moshtiyar_ai_agent();


/**
 * ---------------------------------------------------------
 * Activation
 * ---------------------------------------------------------
 */
register_activation_hook(
    __FILE__,
    function () {

        flush_rewrite_rules();
    }
);


/**
 * ---------------------------------------------------------
 * Deactivation
 * ---------------------------------------------------------
 */
register_deactivation_hook(
    __FILE__,
    function () {

        flush_rewrite_rules();
    }
);
