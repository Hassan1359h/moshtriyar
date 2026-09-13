module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, products } = req.body;

    if (!messages || !messages.length) {
        return res.status(400).json({ error: 'Messages required' });
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    const systemPrompt = `تو یک دستیار فروش حرفه‌ای ایرانی هستی. کاربر (فروشنده) با تو چت می‌کنه تا بتونه به مشتری‌هاش جواب بده.

قواعد مهم:
- فارسی روان و طبیعی بنویس
- لحن دوستانه ولی حرفه‌ای داشته باش
- کوتاه و مؤثر باش
- از ایموجی به اندازه استفاده کن
- مثل یه دوست فروشنده حرفه‌ای حرف بزن

${products ? `محصولات کاربر:\n${products}` : ''}

وقتی کاربر درباره محصولی پرسید:
- اطلاعات محصول رو از لیست بالا بردار
- اگه عکس داره، توی پاسخ این فرمت رو بذار: [IMG:لینک عکس]
- قیمت و مشخصات رو بنویس

مثال پاسخ با عکس:
«بله، باتوم کوهنوردی داریم.
💰 قیمت: ۱,۴۰۰,۰۰۰ تومان
📦 مارک: Naturehike

[IMG:https://supabase.co/.../image.jpg]

می‌خوای برات بفرستم؟»

حالا جواب کاربر رو بده:`;

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
