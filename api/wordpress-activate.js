
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

        if (!["http:", "https:"].includes(url.protocol)) {
            return null;
        }

        return url.origin;
    } catch {
        return null;
    }
}

// تولید توکن اتصال
async function handleConnect(req, res) {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    const accessToken = authHeader.slice(7).trim();

    const {
        data: { user },
        error: authError
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    const siteUrl = normalizeOrigin(req.body?.siteUrl);

    if (!siteUrl) {
        return res.status(400).json({
            error: "Invalid website URL"
        });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date(
        Date.now() + 30 * 60 * 1000
    ).toISOString();

    const { error } = await supabaseAdmin
        .from("wordpress_connections")
        .upsert(
            {
                user_id: user.id,
                token_hash: hashToken(token),
                site_url: siteUrl,
                expires_at: expiresAt,
                used_at: null
            },
            {
                onConflict: "user_id"
            }
        );

    if (error) {
        console.error("wordpress connect:", error.message);

        return res.status(500).json({
            error: "Could not create connection"
        });
    }

    return res.status(200).json({
        success: true,
        token,
        expiresAt,
        userId: user.id,
        siteUrl
    });
}

// فعال‌سازی افزونه وردپرس
async function handleActivate(req, res) {
    // جلوگیری از اتصال خودکار بدون احراز هویت
    if (req.body?.action === "auto-connect") {
        return res.status(403).json({
            error: "Unauthenticated auto-connect is disabled"
        });
    }

    const token = String(req.body?.token || "").trim();
    const siteUrl = normalizeOrigin(req.body?.siteUrl);

    if (!token) {
        return res.status(400).json({
            error: "Missing connection token"
        });
    }

    if (!siteUrl) {
        return res.status(400).json({
            error: "Invalid site URL"
        });
    }

    const { data: connection, error: lookupError } =
        await supabaseAdmin
            .from("wordpress_connections")
            .select("id, user_id, site_url, expires_at, used_at")
            .eq("token_hash", hashToken(token))
            .maybeSingle();

    if (lookupError) {
        console.error("Connection lookup:", lookupError.message);

        return res.status(500).json({
            error: "Connection lookup failed"
        });
    }

    if (!connection) {
        return res.status(401).json({
            error: "Invalid connection token"
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

    const configuredOrigin = normalizeOrigin(connection.site_url);

    if (
        !configuredOrigin ||
        configuredOrigin.toLowerCase() !== siteUrl.toLowerCase()
    ) {
        return res.status(403).json({
            error: "Website is not authorized"
        });
    }

    const { data: userResult, error: userError } =
        await supabaseAdmin.auth.admin.getUserById(
            connection.user_id
        );

    if (userError || !userResult?.user) {
        return res.status(404).json({
            error: "Customer account not found"
        });
    }

    const metadata = userResult.user.user_metadata || {};
    const oldAgent = metadata.website_agent || {};

    const websiteAgent = {
        ...oldAgent,
        enabled: true,
        websiteUrl: configuredOrigin,
        businessName:
            oldAgent.businessName || metadata.businessName || "",
        agentTitle:
            oldAgent.agentTitle || "دستیار هوشمند مشتری‌یار",
        welcomeMessage:
            oldAgent.welcomeMessage ||
            "سلام 👋 چطور می‌توانم کمکتان کنم؟"
    };

    const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(
            connection.user_id,
            {
                user_metadata: {
                    ...metadata,
                    website_agent: websiteAgent
                }
            }
        );

    if (updateError) {
        console.error("Agent update:", updateError.message);

        return res.status(500).json({
            error: "Could not enable website agent"
        });
    }

    const { data: consumed, error: consumeError } =
        await supabaseAdmin
            .from("wordpress_connections")
            .update({
                used_at: new Date().toISOString()
            })
            .eq("id", connection.id)
            .is("used_at", null)
            .select("id")
            .maybeSingle();

    if (consumeError) {
        return res.status(500).json({
            error: "Could not finalize connection"
        });
    }

    if (!consumed) {
        return res.status(409).json({
            error: "Connection token has already been used"
        });
    }

    const apiKey = "mst_" + crypto.randomBytes(32).toString("hex");

    const { error: apiKeyError } = await supabaseAdmin
        .from("site_api_keys")
        .upsert(
            {
                user_id: connection.user_id,
                site_url: configuredOrigin,
                api_key_hash: hashToken(apiKey),
                label: "WordPress Site",
                is_active: true,
                last_used_at: null
            },
            {
                onConflict: "user_id,site_url"
            }
        );

    if (apiKeyError) {
        console.error("API key save:", apiKeyError.message);

        return res.status(500).json({
            error: "Could not save site API key"
        });
    }

    return res.status(200).json({
        success: true,
        connected: true,
        userId: connection.user_id,
        siteUrl: configuredOrigin,
        apiKey,
        websiteAgent: {
            enabled: true
        }
    });
}

// تابع مشترک
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method Not Allowed"
        });
    }

    try {
        if (req.query?.mode === "connect") {
            return await handleConnect(req, res);
        }

        return await handleActivate(req, res);

    } catch (error) {
        console.error("WordPress API:", error?.message);

        return res.status(500).json({
            error: "Internal Server Error"
        });
    }
}
