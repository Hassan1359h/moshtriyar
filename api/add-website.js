// ==========================================================
// 🌐 مشتری‌یار | Add Website API
// مسیر: api/add-website.js
// هدف: اضافه کردن دستی سایت (برای غیروردپرسی‌ها)
// ==========================================================

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// 🎯 تولید API Key یکتا (مثل cst_live_xxx)
function generateApiKey() {
    return "cst_live_" + crypto.randomBytes(24).toString("hex");
}

// 🎯 نرمال‌سازی دامنه
function normalizeDomain(value) {
    try {
        const url = new URL(String(value || "").trim());
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return null;
        }
        return url.origin;
    } catch {
        return null;
    }
}

export default async function handler(req, res) {
    // 🎯 فقط POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        // 🎯 چک احراز هویت
        const authHeader = req.headers.authorization || "";
        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const accessToken = authHeader.replace("Bearer ", "").trim();

        const { data: { user }, error: userError } =
            await supabaseAdmin.auth.admin.getUserById(accessToken);

        // ⚠️ اگه accessToken اشتباه بود، از روش دیگه امتحان کن
        let currentUser = user;
        if (userError || !user) {
            const { data: { user: verifiedUser }, error: verifyError } =
                await supabaseAdmin.auth.getUser(accessToken);

            if (verifyError || !verifiedUser) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            currentUser = verifiedUser;
        }

        // 🎯 دریافت ورودی‌ها
        const name = String(req.body?.name || "").trim();
        const siteUrl = String(req.body?.siteUrl || "").trim();

        if (!name) {
            return res.status(400).json({ error: "نام سایت الزامی است" });
        }

        if (!siteUrl) {
            return res.status(400).json({ error: "آدرس سایت الزامی است" });
        }

        // 🎯 اعتبارسنجی دامنه
        const domain = normalizeDomain(siteUrl);
        if (!domain) {
            return res.status(400).json({ error: "آدرس سایت معتبر نیست" });
        }

        // 🎯 چک کن کاربر قبلاً سایت داره یا نه
        const { data: existing, error: checkError } = await supabaseAdmin
            .from("websites")
            .select("id, name, domain, api_key, active")
            .eq("user_id", currentUser.id)
            .maybeSingle();

        if (checkError) {
            console.error("website check:", checkError);
            return res.status(500).json({ error: "خطا در بررسی سایت" });
        }

        // اگه قبلاً سایت داره → برگردون
        if (existing) {
            return res.status(200).json({
                success: true,
                alreadyExists: true,
                website: existing
            });
        }

        // 🎯 تولید api_key
        const apiKey = generateApiKey();

        // 🎯 insert توی جدول websites
        const { data: inserted, error: insertError } = await supabaseAdmin
            .from("websites")
            .insert({
                user_id: currentUser.id,
                name: name,
                domain: domain,
                api_key: apiKey,
                active: true
            })
            .select("id, name, domain, api_key, active")
            .single();

        if (insertError) {
            console.error("website insert:", insertError);
            return res.status(500).json({ error: "خطا در ذخیره سایت" });
        }

        // ✅ موفق
        return res.status(200).json({
            success: true,
            alreadyExists: false,
            website: inserted
        });

    } catch (error) {
        console.error("add-website error:", error);
        return res.status(500).json({ error: "خطای سرور" });
    }
}
