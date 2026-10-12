import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: { autoRefreshToken: false, persistSession: false }
    }
);

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeOrigin(value) {
    try {
        const url = new URL(String(value || "").trim());
        if (url.protocol !== "http:" && url.protocol !== "https:") return null;
        return url.origin;
    } catch {
        return null;
    }
}

export default async function handler(req, res) {
    // فقط POST قبول می‌کنیم
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        // ۱. دریافت اطلاعات
        const apiKey = String(req.body?.apiKey || "").trim();
        const siteUrl = String(req.body?.siteUrl || "").trim();
        const products = Array.isArray(req.body?.products) ? req.body.products : [];

        // ۲. اعتبارسنجی اولیه
        if (!apiKey) {
            return res.status(400).json({ error: "Missing API key" });
        }
        if (!siteUrl) {
            return res.status(400).json({ error: "Missing site URL" });
        }
        if (!products.length) {
            return res.status(400).json({ error: "No products provided" });
        }

        const requestedOrigin = normalizeOrigin(siteUrl);
        if (!requestedOrigin) {
            return res.status(400).json({ error: "Invalid site URL" });
        }

        // ۳. بررسی API Key
        const apiKeyHash = hashToken(apiKey);

        const { data: keyData, error: keyError } = await supabaseAdmin
            .from("site_api_keys")
            .select("id, user_id, site_url, is_active")
            .eq("api_key_hash", apiKeyHash)
            .maybeSingle();

        if (keyError) {
            console.error("api key lookup:", keyError);
            return res.status(500).json({ error: "API key lookup failed" });
        }

        if (!keyData) {
            return res.status(401).json({ error: "Invalid API key" });
        }

        if (!keyData.is_active) {
            return res.status(403).json({ error: "API key is inactive" });
        }

        // ۴. بررسی تطابق دامنه
        const configuredOrigin = normalizeOrigin(keyData.site_url);
        if (!configuredOrigin || configuredOrigin.toLowerCase() !== requestedOrigin.toLowerCase()) {
            return res.status(403).json({ error: "Site URL mismatch" });
        }

        // ۵. به‌روزرسانی last_used_at
        await supabaseAdmin
            .from("site_api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", keyData.id);

        // ۶. آماده‌سازی رکوردهای کالا
        const rows = products.map((p) => ({
            user_id: keyData.user_id,
            site_url: configuredOrigin,
            external_id: String(p.id ?? p.external_id ?? ""),
            sku: String(p.sku || ""),
            name: String(p.name || "بدون نام"),
            sale_price: Number(p.sale_price || p.price || 0),
            stock: Number(p.stock || 0),
            image_url: String(p.image_url || ""),
            category: String(p.category || ""),
            last_synced_at: new Date().toISOString()
        })).filter((r) => r.external_id); // فقط اونایی که external_id دارن

        if (!rows.length) {
            return res.status(400).json({ error: "No valid products to sync" });
        }

        // ۷. Upsert (درج یا آپدیت) با استفاده از UNIQUE(user_id, site_url, external_id)
        const { data: saved, error: upsertError } = await supabaseAdmin
            .from("site_products")
            .upsert(rows, {
                onConflict: "user_id,site_url,external_id",
                ignoreDuplicates: false
            })
            .select("id");

        if (upsertError) {
            console.error("product upsert:", upsertError);
            return res.status(500).json({
                error: "Could not save products",
                details: upsertError.message
            });
        }

        // ۸. پاسخ موفق
        return res.status(200).json({
            success: true,
            synced: saved?.length || 0,
            total: rows.length,
            siteUrl: configuredOrigin
        });

    } catch (error) {
        console.error("product-sync error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
