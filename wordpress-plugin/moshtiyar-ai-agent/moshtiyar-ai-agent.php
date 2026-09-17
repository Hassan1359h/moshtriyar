<?php
/**
 * Plugin Name: Moshtiyar AI Agent
 * Plugin URI: https://moshtiyar.vercel.app
 * Description: اتصال سایت وردپرس به سرویس هوشمند مشتری‌یار
 * Version: 1.1.0
 * Author: Moshtiyar
 * Text Domain: moshtiyar-ai-agent
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Connection token
 *
 * این مقدار هنگام ساخت ZIP توسط Vercel جایگزین می‌شود.
 */
define(
    'MOSHTIYAR_CONNECTION_TOKEN',
    '__CONNECTION_TOKEN__'
);

/**
 * API URL
 */
define(
    'MOSHTIYAR_API_URL',
    'https://moshtiyar.vercel.app/api'
);

/**
 * Plugin version
 */
define(
    'MOSHTIYAR_PLUGIN_VERSION',
    '1.1.0'
);


/**
 * ---------------------------------------------------------
 * Main Plugin Class
 * ---------------------------------------------------------
 */
final class Moshtiyar_AI_Agent {

    private static $instance = null;

    /**
     * Singleton
     */
    public static function instance() {

        if (self::$instance === null) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    /**
     * Constructor
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

        $connected = $this->is_connected();
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
                    این افزونه سایت وردپرسی شما را
                    به سرویس هوشمند مشتری‌یار متصل می‌کند.
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

                            <?php if ($connected) : ?>

                                <span
                                    style="
                                        color:#16803c;
                                        font-weight:bold;
                                    "
                                >
                                    ● اتصال فعال
                                </span>

                            <?php else : ?>

                                <span
                                    style="
                                        color:#b45309;
                                        font-weight:bold;
                                    "
                                >
                                    ● سایت هنوز متصل نشده است
                                </span>

                            <?php endif; ?>

                        </td>
                    </tr>

                </table>

                <hr>

                <h3>استفاده از دستیار</h3>

                <p>
                    برای نمایش دستیار هوشمند در هر صفحه یا نوشته،
                    از شورت‌کد زیر استفاده کنید:
                </p>

                <code>[moshtiyar_ai]</code>

            </div>

        </div>

        <?php
    }


    /**
     * -----------------------------------------------------
     * Frontend Assets
     * -----------------------------------------------------
     */
    public function frontend_assets() {

        wp_enqueue_script(
            'moshtiyar-ai-agent',
            false,
            array(),
            MOSHTIYAR_PLUGIN_VERSION,
            true
        );
    }


    /**
     * -----------------------------------------------------
     * REST Routes
     * -----------------------------------------------------
     */
    public function register_rest_routes() {

        register_rest_route(
            'moshtiyar/v1',
            '/status',
            array(
                'methods' => WP_REST_Server::READABLE,

                'callback' => array(
                    $this,
                    'status'
                ),

                'permission_callback' => '__return_true',
            )
        );


        register_rest_route(
            'moshtiyar/v1',
            '/activate',
            array(
                'methods' => WP_REST_Server::CREATABLE,

                'callback' => array(
                    $this,
                    'activate'
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
                'methods' => WP_REST_Server::CREATABLE,

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
     * Permission
     * -----------------------------------------------------
     */
    public function check_permission() {

        return current_user_can('manage_options');
    }


    /**
     * -----------------------------------------------------
     * Connected
     * -----------------------------------------------------
     */
    private function is_connected() {

        return (bool) get_option(
            'moshtiyar_connected',
            false
        );
    }


    /**
     * -----------------------------------------------------
     * Status
     * -----------------------------------------------------
     */
    public function status() {

        return new WP_REST_Response(
            array(
                'success' => true,

                'plugin' =>
                    'moshtiyar-ai-agent',

                'version' =>
                    MOSHTIYAR_PLUGIN_VERSION,

                'connected' =>
                    $this->is_connected(),

                'siteUrl' =>
                    home_url('/'),
            ),
            200
        );
    }


    /**
     * -----------------------------------------------------
     * Activate Connection
     * -----------------------------------------------------
     */
    public function activate(WP_REST_Request $request) {

        if (
            MOSHTIYAR_CONNECTION_TOKEN ===
            '__CONNECTION_TOKEN__'
        ) {

            return new WP_Error(
                'missing_token',
                'توکن اتصال افزونه وجود ندارد.',
                array(
                    'status' => 403,
                )
            );
        }


        $response = $this->api_request(
            '/wordpress-activate',
            array(
                'token' =>
                    MOSHTIYAR_CONNECTION_TOKEN,

                'siteUrl' =>
                    home_url('/'),
            ),
            false
        );


        if (is_wp_error($response)) {
            return $response;
        }


        if (
            empty($response['success']) ||
            empty($response['userId'])
        ) {

            return new WP_Error(
                'activation_failed',
                'فعال‌سازی سایت در مشتری‌یار انجام نشد.',
                array(
                    'status' => 502,
                )
            );
        }


        update_option(
            'moshtiyar_connected',
            true,
            false
        );

        update_option(
            'moshtiyar_user_id',
            sanitize_text_field(
                $response['userId']
            ),
            false
        );

        update_option(
            'moshtiyar_site_url',
            esc_url_raw(
                home_url('/')
            ),
            false
        );


        return new WP_REST_Response(
            array(
                'success' => true,

                'connected' => true,

                'userId' =>
                    $response['userId'],

                'siteUrl' =>
                    home_url('/'),
            ),
            200
        );
    }


    /**
     * -----------------------------------------------------
     * Ask AI
     * -----------------------------------------------------
     */
    public function ask_ai(WP_REST_Request $request) {

        $message =
            sanitize_textarea_field(
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


        if (!$this->is_connected()) {

            return new WP_Error(
                'not_connected',
                'سایت هنوز به مشتری‌یار متصل نشده است.',
                array(
                    'status' => 403,
                )
            );
        }


        $user_id =
            get_option(
                'moshtiyar_user_id',
                ''
            );


        if (empty($user_id)) {

            return new WP_Error(
                'missing_user_id',
                'شناسه اتصال مشتری‌یار پیدا نشد.',
                array(
                    'status' => 403,
                )
            );
        }


        $response = $this->api_request(
            '/website-chat',
            array(
                'userId' =>
                    $user_id,

                'site' =>
                    home_url('/'),

                'message' =>
                    $message,
            ),
            false
        );


        if (is_wp_error($response)) {
            return $response;
        }


        if (
            empty($response['reply'])
        ) {

            return new WP_Error(
                'empty_ai_response',
                'پاسخ مناسبی از دستیار دریافت نشد.',
                array(
                    'status' => 502,
                )
            );
        }


        return new WP_REST_Response(
            array(
                'success' => true,

                'reply' =>
                    $response['reply'],

                'businessName' =>
                    $response['businessName'] ?? '',

                'agentTitle' =>
                    $response['agentTitle'] ?? '',
            ),
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
        $body = array(),
        $include_token = true
    ) {

        $url =
            trailingslashit(
                MOSHTIYAR_API_URL
            ) .
            ltrim(
                $endpoint,
                '/'
            );


        if ($include_token) {

            $body['token'] =
                MOSHTIYAR_CONNECTION_TOKEN;
        }


        $response =
            wp_remote_post(
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

                    'body' =>
                        wp_json_encode(
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
                !empty($decoded['error'])
            ) {

                $message =
                    sanitize_text_field(
                        $decoded['error']
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

        if (!$this->is_connected()) {

            return '';
        }


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
                                            message:
                                                message
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
                                data.reply ||
                                'پاسخی دریافت نشد.';


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

    return Moshtiyar_AI_Agent::instance();
}

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

        /*
         * اتصال خودکار افزونه به مشتری‌یار
         */

        if (
            !defined('MOSHTIYAR_CONNECTION_TOKEN') ||
            MOSHTIYAR_CONNECTION_TOKEN === '__CONNECTION_TOKEN__'
        ) {
            update_option(
                'moshtiyar_connection_error',
                'توکن اتصال افزونه وجود ندارد.',
                false
            );

            return;
        }

        $response = wp_remote_post(
            trailingslashit(MOSHTIYAR_API_URL) .
            'wordpress-activate',
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
                    array(
                        'token' =>
                            MOSHTIYAR_CONNECTION_TOKEN,

                        'siteUrl' =>
                            home_url('/'),
                    )
                ),
            )
        );

        if (is_wp_error($response)) {

            update_option(
                'moshtiyar_connection_error',
                $response->get_error_message(),
                false
            );

            return;
        }

        $status_code =
            wp_remote_retrieve_response_code(
                $response
            );

        $body =
            wp_remote_retrieve_body(
                $response
            );

        $data =
            json_decode(
                $body,
                true
            );

        if (
            $status_code >= 200 &&
            $status_code < 300 &&
            is_array($data) &&
            !empty($data['success']) &&
            !empty($data['userId'])
        ) {

            update_option(
                'moshtiyar_connected',
                true,
                false
            );

            update_option(
                'moshtiyar_user_id',
                sanitize_text_field(
                    $data['userId']
                ),
                false
            );

            update_option(
                'moshtiyar_site_url',
                esc_url_raw(
                    home_url('/')
                ),
                false
            );

            delete_option(
                'moshtiyar_connection_error'
            );

            return;
        }

        $error_message =
            'اتصال خودکار به مشتری‌یار انجام نشد.';

        if (
            is_array($data) &&
            !empty($data['error'])
        ) {

            $error_message =
                sanitize_text_field(
                    $data['error']
                );
        }

        update_option(
            'moshtiyar_connection_error',
            $error_message,
            false
        );
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


                
