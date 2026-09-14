module.exports = async function handler(req, res) {
    // فقط POST مجاز است
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            error: "Method not allowed"
        });
    }

    try {
        const {
            messages,
            products,
            customerName
        } = req.body || {};

        // بررسی پیام‌ها
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Messages required"
            });
        }

        // دریافت API Key
        const GEMINI_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_KEY) {
            return res.status(500).json({
                success: false,
                error: "GEMINI_API_KEY is not configured"
            });
        }

        /*
         * دستور اصلی هوش مصنوعی
         */
        const systemPrompt = `
تو یک دستیار فروش ایرانی هستی که به فروشنده کمک می‌کنی
پیام مناسب و آماده ارسال برای مشتری بنویسد.

مهم‌ترین قانون:
- مستقیماً متن پیام برای مشتری را بنویس.
- با فروشنده صحبت نکن.
- راهنمایی یا توضیح برای فروشنده نده.
- پیام باید از زبان فروشنده خطاب به مشتری باشد.
- فقط یک متن نهایی ارائه بده.
- چند گزینه ارائه نده.

قواعد نوشتن:
- فارسی روان، طبیعی و قابل فهم
- لحن دوستانه ولی حرفه‌ای
- کوتاه و مؤثر
- حداکثر ۴ تا ۵ خط
- از ایموجی به اندازه استفاده کن
- از توضیحات اضافی خودداری کن
- اگر اطلاعات محصول در فهرست محصولات وجود دارد، فقط بر اساس همان اطلاعات پاسخ بده.
- قیمت را اگر در اطلاعات محصول وجود دارد ذکر کن.
- مشخصات مهم محصول را کوتاه ذکر کن.
- اطلاعات ساختگی درباره محصول، قیمت، موجودی یا ویژگی‌ها ایجاد نکن.

${customerName ? `نام مشتری: ${customerName}` : ""}

${products ? `
محصولات موجود:
${products}
` : ""}

قانون مهم درباره لینک عکس:
اگر برای محصول موردنظر لینک عکس در اطلاعات محصولات وجود دارد،
لینک عکس را در آخرین خط پیام قرار بده.

لینک باید به صورت خام نوشته شود:
https://example.com/image.jpg

از Markdown یا عنوان برای لینک استفاده نکن.

اگر لینک عکس وجود ندارد، لینک ساختگی ایجاد نکن.

نمونه لحن:
سلام! این محصول کیفیت خوبی داره و برای استفاده روزمره گزینه مناسبیه 🌺
اگر بخواید، می‌تونم اطلاعات و قیمت دقیقش رو هم خدمتتون بگم.

حالا بر اساس پیام مشتری، فقط متن نهایی مناسب برای ارسال به مشتری را بنویس.
`;

        /*
         * تبدیل پیام‌ها به فرمت Gemini
         */
        const geminiContents = messages
            .filter(message =>
                message &&
                typeof message.content === "string" &&
                message.content.trim() !== ""
            )
            .map(message => ({
                role: message.role === "assistant" ? "model" : "user",
                parts: [
                    {
                        text: message.content.trim()
                    }
                ]
            }));

        if (geminiContents.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No valid messages found"
            });
        }

        /*
         * مدل‌های اصلی و پشتیبان
         */
        const models = [
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemini-2.5-flash"
        ];

        let response = null;
        let lastError = null;

        /*
         * تلاش با مدل‌ها
         */
        for (const model of models) {
            try {
                response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            systemInstruction: {
                                parts: [
                                    {
                                        text: systemPrompt
                                    }
                                ]
                            },

                            contents: geminiContents,

                            generationConfig: {
                                temperature: 0.7,
                                maxOutputTokens: 1000
                            }
                        })
                    }
                );

                /*
                 * اگر موفق بود، حلقه متوقف می‌شود
                 */
                if (response.ok) {
                    break;
                }

                /*
                 * دریافت خطای API
                 */
                let errorData = null;

                try {
                    errorData = await response.json();
                } catch {
                    errorData = null;
                }

                lastError =
                    errorData?.error?.message ||
                    `Gemini API error: ${response.status}`;

            } catch (error) {
                lastError = error.message;
            }
        }

        /*
         * اگر هیچ مدلی پاسخ نداد
         */
        if (!response || !response.ok) {
            return res.status(502).json({
                success: false,
                error: lastError || "خطا در ارتباط با سرویس هوش مصنوعی"
            });
        }

        /*
         * خواندن پاسخ Gemini
         */
        const data = await response.json();

        const text =
            data?.candidates?.[0]?.content?.parts
                ?.map(part => part?.text || "")
                .join("")
                .trim() || "";

        /*
         * بررسی پاسخ خالی
         */
        if (!text) {
            return res.status(502).json({
                success: false,
                error: "پاسخ خالی از Gemini دریافت شد"
            });
        }

        /*
         * پاسخ نهایی
         */
        return res.status(200).json({
            success: true,
            text
        });

    } catch (error) {
        console.error("AI CHAT ERROR:", error);

        return res.status(500).json({
            success: false,
            error: error?.message || "خطای داخلی سرور"
        });
    }
};
