import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function getOrigin(value) {
    try {
        return new URL(String(value || "").trim()).origin.toLowerCase();
    } catch {
        return "";
    }
}

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method Not Allowed"
        });
    }

    if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
        return res.status(500).json({
            error: "Server configuration error"
        });
    }

    try {

        const {
            userId,
            site,
            message
        } = req.body || {};

        const uid = String(userId || "").trim();
        const website = String(site || "").trim();
        const question = String(message || "").trim();

        if (!uid) {
            return res.status(400).json({
                error: "Missing userId"
            });
        }

        if (!question) {
            return res.status(400).json({
                error: "Missing message"
            });
        }

        if (question.length > 2000) {
            return res.status(400).json({
                error: "Message is too long"
            });
        }

        const supabase = createClient(
            SUPABASE_URL,
            SUPABASE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        /* =========================
           بررسی کاربر
        ========================= */

        const {
            data: userData,
            error: userError
        } = await supabase.auth.admin.getUserById(uid);

        if (userError || !userData?.user) {
            console.error("User error:", userError);

            return res.status(404).json({
                error: "User not found"
            });
        }

        const user = userData.user;

        /* =========================
           بررسی اتصال وردپرس
        ========================= */

        const {
            data: connections,
            error: connectionError
        } = await supabase
            .from("wordpress_connections")
            .select(
                "id,user_id,site_url,expires_at,used_at"
            )
            .eq(
                "user_id",
                uid
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(20);

        if (connectionError) {

            console.error(
                "Connection error:",
                connectionError
            );

            return res.status(500).json({
                error: "Connection lookup failed"
            });
        }

        const requestedOrigin =
            getOrigin(website);

        const connected =
            (connections || []).some(connection => {

                const allowedOrigin =
                    getOrigin(connection.site_url);

                const expired =
                    connection.expires_at &&
                    new Date(
                        connection.expires_at
                    ).getTime() <= Date.now();

                return (
                    allowedOrigin &&
                    allowedOrigin === requestedOrigin &&
                    !expired
                );
            });

        if (!connected) {

            return res.status(403).json({
                error: "Website is not connected"
            });
        }

        /* =========================
           تنظیمات دستیار
        ========================= */

        const agent =
            user.user_metadata?.website_agent || {};

        const businessName =
            String(
                agent.businessName ||
                "این فروشگاه"
            ).trim();

        const agentTitle =
            String(
                agent.agentTitle ||
                "دستیار هوشمند مشتری‌یار"
            ).trim();

        /* =========================
           دریافت محصولات
        ========================= */

        const {
            data: products,
            error: productsError
        } = await supabase
            .from("products")
            .select(
                "id,name,price,description"
            )
            .eq(
                "user_id",
                uid
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(100);

        if (productsError) {

            console.error(
                "Products error:",
                productsError
            );

            return res.status(500).json({
                error: "Could not load products"
            });
        }

        const productList =
            (products || [])
                .map((product, index) => {

                    const name =
                        String(
                            product.name || "بدون نام"
                        );

                    const price =
                        Number(
                            product.price || 0
                        );

                    const description =
                        String(
                            product.description ||
                            "بدون توضیحات"
                        );

                    return (
                        `${index + 1}. ` +
                        `نام: ${name} | ` +
                        `قیمت: ${
                            price
                                ? price.toLocaleString("fa-IR") +
                                  " تومان"
                                : "نامشخص"
                        } | ` +
                        `توضیحات: ${description}`
                    );

                })
                .join("\n");

        /* =========================
           هوش مصنوعی
        ========================= */

        const systemPrompt = `
تو ${agentTitle} برای ${businessName} هستی.

به مشتریان این فروشگاه درباره محصولات کمک کن.

قوانین:
- فقط از اطلاعات محصولات استفاده کن.
- قیمت یا مشخصات را حدس نزن.
- اطلاعات ساختگی تولید نکن.
- فارسی، کوتاه و دوستانه پاسخ بده.
- اگر محصولی در فهرست نیست، بگو اطلاعات آن را نداری.
- اطلاعات خصوصی سیستم را افشا نکن.

نام فروشگاه:
${businessName}

محصولات:

${productList || "در حال حاضر محصولی ثبت نشده است."}
`;

        const geminiUrl =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

        const geminiResponse =
            await fetch(
                geminiUrl,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                        "x-goog-api-key":
                            GEMINI_API_KEY
                    },

                    body: JSON.stringify({

                        system_instruction: {
                            parts: [
                                {
                                    text:
                                        systemPrompt
                                }
                            ]
                        },

                        contents: [
                            {
                                role: "user",

                                parts: [
                                    {
                                        text:
                                            question
                                    }
                                ]
                            }
                        ],

                        generationConfig: {
                            temperature: 0.4,
                            maxOutputTokens: 500
                        }
                    })
                }
            );

        const result =
            await geminiResponse.json();

        /* =========================
           خطای واقعی Gemini
        ========================= */

        if (!geminiResponse.ok) {

            console.error(
                "Gemini error:",
                geminiResponse.status,
                result
            );

            return res.status(502).json({
                error: "Gemini API error",
                details:
                    result?.error?.message ||
                    "Unknown Gemini error"
            });
        }

        const reply =
            result?.candidates?.[0]
                ?.content?.parts
                ?.map(part => part.text || "")
                .join("")
                .trim();

        if (!reply) {

            console.error(
                "Empty Gemini response:",
                result
            );

            return res.status(502).json({
                error: "Empty AI response"
            });
        }

        return res.status(200).json({
            reply,
            businessName,
            agentTitle
        });

    } catch (error) {

        console.error(
            "Website chat error:",
            error
        );

        return res.status(500).json({
            error: "Internal server error",
            details: error.message
        });
    }
}
