module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, products, customerName } = req.body;

    if (!messages || !messages.length) {
        return res.status(400).json({ error: 'Messages required' });
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    const systemPrompt = `تو یک دستیار فروش ایرانی هستی که به فروشنده کمک می‌کنی پیام مناسب برای مشتری بنویسه.

مهم‌ترین قاعده:
- مستقیم متن پیام برای مشتری رو بنویس (نه راهنمایی به فروشنده)
- فروشنده این متن رو کپی می‌کنه و برای مشتری می‌فرسته
- پس پیام باید از زبان فروشنده به مشتری باشه

قواعد:
- فارسی روان و طبیعی
- لحن دوستانه ولی حرفه‌ای
- کوتاه و مؤثر (حداکثر ۴-۵ خط)
- از ایموجی به اندازه
- بدون توضیح اضافه، بدون راهنمایی، بدون چند گزینه

${products ? `محصولات موجود:\n${products}` : ''}
${customerName ? `نام مشتری: ${customerName} — توی پیام از اسمش استفاده کن` : ''}
وقتی کاربر درباره محصولی پرسید:
- حتماً توی پاسخ این فرمت رو دقیقاً بذار: [IMG:لینک_عکس]
- قیمت و مشخصات رو بنویس
- حتماً عکس محصول رو با فرمت بالا بذار (مهم‌ترین بخش پاسخه)
مثال درست (مستقیم برای مشتری):
«سلام! درکت می‌کنم قیمت مهمه، ولی این باتوم سیستم آنتی‌شوک داره که از زانوت محافظت می‌کنه. ارزشش رو داره 🌺»

حالا پیام مناسب برای مشتری رو بنویس:`;

    try {
        const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
        let response, lastError;

        // تبدیل پیام‌ها به فرمت Gemini
        const geminiContents = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        // اضافه کردن system prompt به اولین پیام
        geminiContents.unshift({
            role: 'user',
            parts: [{ text: systemPrompt }]
        });

        for (const model of models) {
            response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: geminiContents,
                        generationConfig: { temperature: 0.8, maxOutputTokens: 1500 }
                    })
                }
            );
            if (response.ok) break;
            lastError = await response.json();
        }

        if (!response.ok) throw new Error(lastError?.error?.message || 'خطا در AI');

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return res.status(200).json({ success: true, text: text.trim() });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
