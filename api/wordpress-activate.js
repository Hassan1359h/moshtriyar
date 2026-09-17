import crypto from "crypto";
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
                "wordpress activate lookup:",
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

        /*
         * دریافت اطلاعات فعلی کاربر
         */
        const {
            data: userResult,
            error: userError
        } = await supabaseAdmin.auth.admin.getUserById(
            connection.user_id
        );

        if (userError || !userResult?.user) {
            return res.status(404).json({
                error:
                    "Customer account not found"
            });
        }

        const user =
            userResult.user;

        const metadata =
            user.user_metadata || {};

        const oldAgent =
            metadata.website_agent || {};

        /*
         * فعال‌سازی Website Agent
         */
        const websiteAgent = {
            ...oldAgent,
            enabled: true,
            websiteUrl: configuredOrigin,
            businessName:
                oldAgent.businessName ||
                metadata.businessName ||
                "",
            agentTitle:
                oldAgent.agentTitle ||
                "دستیار هوشمند مشتری‌یار",
            welcomeMessage:
                oldAgent.welcomeMessage ||
                "سلام 👋 چطور می‌توانم کمکتان کنم؟"
        };

        const {
            error: updateUserError
        } = await supabaseAdmin.auth.admin.updateUserById(
            connection.user_id,
            {
                user_metadata: {
                    ...metadata,
                    website_agent: websiteAgent
                }
            }
        );

        if (updateUserError) {
            console.error(
                "website agent update:",
                updateUserError
            );

            return res.status(500).json({
                error:
                    "Could not enable website agent"
            });
        }

        /*
         * مصرف اتمیک توکن
         */
        const {
            data: consumedConnection,
            error: consumeError
        } = await supabaseAdmin
            .from("wordpress_connections")
            .update({
                used_at:
                    new Date().toISOString()
            })
            .eq("id", connection.id)
            .is("used_at", null)
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

        if (!consumedConnection) {
            return res.status(409).json({
                error:
                    "Connection token has already been used"
            });
        }

        return res.status(200).json({
            success: true,
            connected: true,
            userId: connection.user_id,
            siteUrl: configuredOrigin,
            websiteAgent: {
                enabled: true
            }
        });

    } catch (error) {

        console.error(
            "wordpress-activate error:",
            error
        );

        return res.status(500).json({
            error:
                "Internal Server Error"
        });
    }
    }
