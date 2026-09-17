import crypto from "crypto";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL =
    process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
    createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
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

    /*
     * فقط POST
     */

    if (req.method !== "POST") {

        return res.status(405).json({
            error: "Method Not Allowed"
        });

    }


    try {

        /*
         * بررسی ورود کاربر
         */

        const authHeader =
            req.headers.authorization || "";

        if (
            !authHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({
                error: "Unauthorized"
            });

        }


        const accessToken =
            authHeader
                .replace("Bearer ", "")
                .trim();


        if (!accessToken) {

            return res.status(401).json({
                error: "Unauthorized"
            });

        }


        /*
         * اعتبارسنجی Session
         */

        const {
            data: {
                user
            },
            error: userError
        } =
            await supabaseAdmin.auth.getUser(
                accessToken
            );


        if (
            userError ||
            !user
        ) {

            return res.status(401).json({
                error: "Unauthorized"
            });

        }


        /*
         * دریافت توکن اتصال
         */

        const token =
            String(
                req.body?.token || ""
            ).trim();


        if (!token) {

            return res.status(400).json({
                error: "Missing connection token"
            });

        }


        /*
         * اعتبارسنجی سایت
         */

        const siteUrl =
            String(
                req.body?.siteUrl || ""
            ).trim();


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


        /*
         * پیدا کردن اتصال
         */

        const tokenHash =
            hashToken(token);


        const {
            data: connection,
            error: connectionError
        } =
            await supabaseAdmin
                .from("wordpress_connections")
                .select(
                    `
                    id,
                    user_id,
                    site_url,
                    expires_at,
                    used_at
                    `
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
                error: "Connection lookup failed"
            });

        }


        /*
         * اتصال پیدا نشد
         */

        if (!connection) {

            return res.status(401).json({
                error: "Invalid connection token"
            });

        }


        /*
         * اطمینان از مالکیت اتصال
         */

        if (
            connection.user_id !==
            user.id
        ) {

            return res.status(403).json({
                error: "Connection does not belong to this user"
            });

        }


        /*
         * توکن قبلاً مصرف شده
         */

        if (connection.used_at) {

            return res.status(409).json({
                error: "Connection token has already been used"
            });

        }


        /*
         * بررسی انقضا
         */

        if (
            !connection.expires_at ||
            new Date(
                connection.expires_at
            ).getTime() <= Date.now()
        ) {

            return res.status(410).json({
                error: "Connection token has expired"
            });

        }


        /*
         * بررسی دامنه سایت
         */

        const configuredOrigin =
            normalizeOrigin(
                connection.site_url
            );


        if (
            configuredOrigin &&
            configuredOrigin.toLowerCase() !==
            requestedOrigin.toLowerCase()
        ) {

            return res.status(403).json({
                error: "Website is not authorized"
            });

        }


        /*
         * مسیر فایل افزونه
         */

        const pluginPath =
            path.join(
                process.cwd(),
                "wordpress-plugin",
                "moshtiyar-ai-agent",
                "moshtiyar-ai-agent.php"
            );


        /*
         * بررسی وجود قالب افزونه
         */

        if (
            !fs.existsSync(pluginPath)
        ) {

            console.error(
                "WordPress plugin template not found:",
                pluginPath
            );

            return res.status(500).json({
                error:
                    "WordPress plugin template is missing"
            });

        }


        /*
         * خواندن قالب افزونه
         */

        let pluginCode =
            fs.readFileSync(
                pluginPath,
                "utf8"
            );


        /*
         * بررسی Placeholder
         */

        if (
            !pluginCode.includes(
                "__CONNECTION_TOKEN__"
            )
        ) {

            console.error(
                "Plugin token placeholder missing"
            );

            return res.status(500).json({
                error:
                    "Plugin template is invalid"
            });

        }


        /*
         * قرار دادن توکن یک‌بارمصرف
         */

        pluginCode =
            pluginCode.replace(
                /__CONNECTION_TOKEN__/g,
                token
            );


        /*
         * ساخت ZIP
         */

        const zip =
            new JSZip();


        const folder =
            zip.folder(
                "moshtiyar-ai-agent"
            );


        folder.file(
            "moshtiyar-ai-agent.php",
            pluginCode
        );


        /*
         * فایل readme
         */

        folder.file(
            "readme.txt",
`=== مشتری‌یار AI Assistant ===

نسخه: 1.1.0

افزونه اتصال خودکار وب‌سایت وردپرسی
به دستیار هوشمند مشتری‌یار.

این افزونه پس از فعال‌سازی،
وب‌سایت را به حساب مشتری‌یار متصل می‌کند.

برای نصب:

1. افزونه را در وردپرس نصب کنید.
2. افزونه را فعال کنید.
3. اتصال به‌صورت خودکار انجام می‌شود.

Website:
https://moshtiyar.vercel.app
`
        );


        /*
         * تولید فایل ZIP
         */

        const zipBuffer =
            await zip.generateAsync({
                type: "nodebuffer",
                compression: "DEFLATE",
                compressionOptions: {
                    level: 9
                }
            });


        /*
         * مصرف اتمیک توکن
         *
         * اگر کاربر همزمان دوبار
         * درخواست ارسال کند،
         * فقط یکی باید موفق شود.
         */

        const {
            data: consumedConnection,
            error: consumeError
        } =
            await supabaseAdmin
                .from("wordpress_connections")
                .update({
                    used_at:
                        new Date().toISOString()
                })
                .eq(
                    "id",
                    connection.id
                )
                .is(
                    "used_at",
                    null
                )
                .select("id")
                .maybeSingle();


        if (consumeError) {

            console.error(
                "wordpress token consume:",
                consumeError
            );

            return res.status(500).json({
                error:
                    "Could not finalize connection"
            });

        }


        /*
         * توکن قبلاً توسط درخواست دیگری مصرف شده
         */

        if (!consumedConnection) {

            return res.status(409).json({
                error:
                    "Connection token has already been used"
            });

        }


        /*
         * ارسال ZIP
         */

        res.setHeader(
            "Content-Type",
            "application/zip"
        );

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="moshtiyar-ai-agent.zip"'
        );

        res.setHeader(
            "Content-Length",
            String(zipBuffer.length)
        );

        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate"
        );

        return res.status(200).send(
            zipBuffer
        );


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
