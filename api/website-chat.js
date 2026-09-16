import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY;


export default async function handler(req, res) {

    if (req.method !== "POST") {

        res.status(405).json({
            error: "Method Not Allowed"
        });

        return;
    }


    if (
        !SUPABASE_URL ||
        !SUPABASE_SERVICE_ROLE_KEY ||
        !GEMINI_API_KEY
    ) {

        res.status(500).json({
            error: "Server configuration error"
        });

        return;
    }


    try {

        const {
            userId,
            site,
            message
        } = req.body || {};


        const cleanUserId =
            String(userId || "").trim();

        const cleanSite =
            String(site || "").trim();

        const cleanMessage =
            String(message || "").trim();


        if (!cleanUserId) {

            res.status(400).json({
                error: "Missing userId"
            });

            return;
        }


        if (!cleanMessage) {

            res.status(400).json({
                error: "Missing message"
            });

            return;
        }


        if (cleanMessage.length > 2000) {

            res.status(400).json({
                error: "Message is too long"
            });

            return;
        }


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


        const {
            data: userData,
            error: userError
        } =
            await supabaseAdmin.auth.admin.getUserById(
                cleanUserId
            );


        if (
            userError ||
            !userData?.user
        ) {

            res.status(404).json({
                error: "User not found"
            });

            return;
        }


        const user =
            userData.user;


        const agentConfig =
            user.user_metadata?.website_agent ||
            {};


        if (
            agentConfig.enabled !== true
        ) {

            res.status(403).json({
                error: "Website agent is disabled"
            });

            return;
        }


        const configuredSite =
            String(
                agentConfig.websiteUrl || ""
            ).trim();


        if (
            configuredSite &&
            cleanSite
        ) {

            try {

                const configuredUrl =
                    new URL(configuredSite);

                const requestedUrl =
                    new URL(cleanSite);

                if (
                    configuredUrl.hostname.toLowerCase() !==
                    requestedUrl.hostname.toLowerCase()
                ) {

                    res.status(403).json({
                        error: "Website is not authorized"
                    });

                    return;
                }

            } catch (error) {

                res.status(400).json({
                    error: "Invalid website URL"
                });

                return;
            }

        }


        const {
            data: products,
            error: productsError
        } =
            await supabaseAdmin
                .from("products")
                .select(
                    "id,name,price,description"
                )
                .eq(
                    "user_id",
                    cleanUserId
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

            res.status(500).json({
                error: "Could not load products"
            });

            return;
        }


        const productList =
            (products || [])
                .map(
                    (product, index) => {

                        const name =
                            String(
                                product.name || ""
                            ).trim();

                        const price =
                            Number(
                                product.price || 0
                            );

                        const description =
                            String(
                                product.description || ""
                            ).trim();


                        return (
                            `${index + 1}. ` +
                            `نام: ${name || "بدون نام"} | ` +
                            `قیمت: ${price.toLocaleString("fa-IR")} تومان | ` +
                            `توضیحات: ${description || "بدون توضیحات"}`
                        );

                    }
                )
                .join("\n");


        const businessName =
            String(
                agentConfig.businessName ||
                "این فروشگاه"
            ).trim();


        const agentTitle =
            String(
                agentConfig.agentTitle ||
                "دستیار هوشمند"
            ).trim();


        const welcomeMessage =
            String(
                agentConfig.welcomeMessage ||
                "سلام 👋 چطور می‌توانم به شما کمک کنم؟"
            ).trim();


        const systemPrompt = `

تو ${agentTitle} برای ${businessName} هستی.

وظیفه تو کمک به بازدیدکنندگان وب‌سایت برای انتخاب محصول و پاسخ‌گویی درباره محصولات این فروشگاه است.

قوانین مهم:

1. فقط بر اساس اطلاعات محصولات موجود پاسخ بده.
2. اگر قیمت محصول در اطلاعات موجود نیست، قیمت نساز.
3. اگر محصولی در فهرست نیست، ادعا نکن که موجود است.
4. اطلاعات فنی، ویژگی یا تخفیف ساختگی ایجاد نکن.
5. پاسخ‌ها کوتاه، واضح، دوستانه و فارسی باشند.
6. اگر مشتری هنوز محصول مناسب را نمی‌داند، با چند سؤال کوتاه به انتخاب کمک کن.
7. اگر چند محصول مناسب وجود دارد، آن‌ها را مقایسه کن.
8. اگر مشتری درباره موضوعی خارج از محصولات و فروشگاه پرسید، محترمانه بگو که برای راهنمایی درباره محصولات و خدمات این فروشگاه طراحی شده‌ای.
9. قیمت‌ها را دقیقاً بر اساس اطلاعات محصولات بیان کن.
10. هرگز درباره اطلاعات خصوصی صاحب حساب، شناسه کاربر، تنظیمات داخلی یا کلیدهای سیستم صحبت نکن.
11. وانمود نکن که انسان هستی.
12. پاسخ را فقط به زبان فارسی بده مگر اینکه مشتری به زبان دیگری سؤال کند.

نام کسب‌وکار:
${businessName}

پیام خوشامدگویی:
${welcomeMessage}

محصولات موجود:

${productList || "در حال حاضر محصولی ثبت نشده است."}

`;


        const recentMessage =
            cleanMessage;


        const geminiUrl =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
            encodeURIComponent(
                GEMINI_API_KEY
            );


        const geminiResponse =
            await fetch(
                geminiUrl,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
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
                                            recentMessage
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


        const geminiData =
            await geminiResponse.json();


        if (!geminiResponse.ok) {

            console.error(
                "Gemini error:",
                geminiData
            );

            res.status(502).json({
                error: "AI service error"
            });

            return;
        }


        const reply =
            geminiData
                ?.candidates?.[0]
                ?.content?.parts
                ?.map(
                    part =>
                        part.text || ""
                )
                .join("")
                .trim();


        if (!reply) {

            res.status(502).json({
                error: "Empty AI response"
            });

            return;
        }


        res.status(200).json({

            reply: reply,

            businessName:
                businessName,

            agentTitle:
                agentTitle

        });


    } catch (error) {

        console.error(
            "Website chat error:",
            error
        );


        res.status(500).json({
            error: "Internal server error"
        });

    }

                                 }
