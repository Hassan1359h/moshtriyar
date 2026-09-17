import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

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

export default async function handler(req, res) {

    if(req.method !== "POST"){

        return res.status(405).json({
            error: "Method Not Allowed"
        });

    }

    try{

        const token =
            String(
                req.body?.token || ""
            ).trim();

        const siteUrl =
            String(
                req.body?.siteUrl || ""
            ).trim();

        if(!token){

            return res.status(400).json({
                error: "Missing connection token"
            });

        }

        if(!siteUrl){

            return res.status(400).json({
                error: "Missing site URL"
            });

        }

        let requestedUrl;

        try{

            requestedUrl =
                new URL(siteUrl);

        }catch{

            return res.status(400).json({
                error: "Invalid site URL"
            });

        }

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

        if(connectionError){

            console.error(
                "Connection lookup error:",
                connectionError
            );

            return res.status(500).json({
                error: "Connection lookup failed"
            });

        }

        if(!connection){

            return res.status(401).json({
                error: "Invalid connection token"
            });

        }

        if(connection.used_at){

            return res.status(409).json({
                error: "Connection token has already been used"
            });

        }

        if(
            !connection.expires_at ||
            new Date(connection.expires_at).getTime()
                < Date.now()
        ){

            return res.status(410).json({
                error: "Connection token has expired"
            });

        }

        if(connection.site_url){

            try{

                const configuredUrl =
                    new URL(
                        connection.site_url
                    );

                if(
                    configuredUrl.hostname.toLowerCase() !==
                    requestedUrl.hostname.toLowerCase()
                ){

                    return res.status(403).json({
                        error: "Website is not authorized"
                    });

                }

            }catch{

                return res.status(400).json({
                    error: "Invalid configured website URL"
                });

            }

        }

        const {
            error: updateError
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
                );

        if(updateError){

            console.error(
                "Connection update error:",
                updateError
            );

            return res.status(500).json({
                error: "Could not activate connection"
            });

        }

        return res.status(200).json({

            success: true,

            userId:
                connection.user_id,

            siteUrl:
                connection.site_url

        });

    }catch(error){

        console.error(
            "wordpress-activate error:",
            error
        );

        return res.status(500).json({
            error: "Internal Server Error"
        });

    }

              }
