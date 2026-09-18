import crypto from "crypto";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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
        const url = new URL(String(value || "").trim());

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

        const authHeader =
            req.headers.authorization || "";

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        const accessToken =
            authHeader.replace("Bearer ", "").trim();

        const {
            data: { user },
            error: userError
        } = await supabaseAdmin.auth.getUser(accessToken);

        if (userError || !user) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        const token =
            String(req.body?.token || "").trim();

        const siteUrl =
            String(req.body?.siteUrl || "").trim();

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

        const tokenHash = hashToken(token);

        const {
            data: connection,
            error: connectionError
        } = await supabaseAdmin
            .from("wordpress_connections")
            .select(`
                id,
                user_id,
                site_url,
                expires_at,
                used_at
            `)
            .eq("token_hash", tokenHash)
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

        if (!connection) {
            return res.status(401).json({
                error: "Invalid connection token"
            });
        }

        if (connection.user_id !== user.id) {
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
            new Date(connection.expires_at).getTime() <= Date.now()
        ) {
            return res.status(410).json({
                error:
                    "Connection token has expired"
            });
        }

        const configuredOrigin =
            normalizeOrigin(connection.site_url);

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

        const pluginPath = path.join(
            process.cwd(),
            "wordpress-plugin",
            "moshtriyar-ai-agent",
            "moshtiryar-ai-agent.php"
        );

        if (!fs.existsSync(pluginPath)) {
            return res.status(500).json({
                error:
                    "WordPress plugin template is missing"
            });
        }

        let pluginCode =
            fs.readFileSync(pluginPath, "utf8");

        if (
            !pluginCode.includes(
                "__CONNECTION_TOKEN__"
            )
        ) {
            return res.status(500).json({
                error:
                    "Plugin template is invalid"
            });
        }

        pluginCode =
            pluginCode.replace(
                /__CONNECTION_TOKEN__/g,
                token
            );

        const zip = new JSZip();

        const folder =
            zip.folder("moshtriyar-ai-agent");

        folder.file(
            "moshFix WordPress plugin template pathtiyar-ai-agent.php",
            pluginCode
        );

        folder.file(
            "readme.txt",
`=== مشتری‌یار AI Assistant ===

نسخه: 1.1.0

افزونه اتصال خودکار وب‌سایت وردپرسی
به دستیار هوشمند مشتری‌یار.

نصب:
1. افزونه را نصب کنید.
2. افزونه را فعال کنید.
3. اتصال به‌صورت خودکار انجام می‌شود.

Website:
https://moshtriyar.vercel.app
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

        res.end(zipBuffer);

    } catch (error) {

        console.error(
            "wordpress-plugin error:",
            error
        );

        return res.status(500).json({
            error: "Internal Server Error"
        });
    }
}
