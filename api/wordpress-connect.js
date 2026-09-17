import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
    createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
    );

function hashToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
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

        const siteUrl =
            String(
                req.body?.siteUrl || ""
            ).trim();

        if (!siteUrl) {
            return res.status(400).json({
                error: "siteUrl is required"
            });
        }

        let parsedUrl;

        try {

            parsedUrl =
                new URL(siteUrl);

        } catch {

            return res.status(400).json({
                error: "Invalid website URL"
            });

        }

        if (
            parsedUrl.protocol !== "http:" &&
            parsedUrl.protocol !== "https:"
        ) {
            return res.status(400).json({
                error: "Invalid website protocol"
            });
        }

        const token =
            crypto.randomBytes(32).toString("hex");

        const tokenHash =
            hashToken(token);

        const expiresAt =
            new Date(
                Date.now() +
                30 * 60 * 1000
            ).toISOString();

        const {
            error: insertError
        } =
            await supabaseAdmin
                .from("wordpress_connections")
                .upsert(
                    {
                        user_id: user.id,
                        token_hash: tokenHash,
                        site_url: parsedUrl.origin,
                        expires_at: expiresAt,
                        used_at: null
                    },
                    {
                        onConflict: "user_id"
                    }
                );

        if (insertError) {

            console.error(
                "wordpress connection:",
                insertError
            );

            return res.status(500).json({
                error: "Could not create connection"
            });

        }

        return res.status(200).json({

            success: true,

            token: token,

            expiresAt: expiresAt,

            userId: user.id,

            siteUrl: parsedUrl.origin

        });

    } catch (error) {

        console.error(
            "wordpress-connect error:",
            error
        );

        return res.status(500).json({
            error: "Internal Server Error"
        });

    }

          }
