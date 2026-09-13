۸module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, scenario } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    const systemPrompt = `تو یک دستیار فروش حرفه‌ای ایرانی هستی. 
وظیفه‌ات کمک به فروشنده‌ها برای نوشتن پیام‌های فروش مؤثر است.

قواعد مهم:
- فقط و فقط متن پیام نهایی رو بنویس
- فارسی روان و طبیعی بنویس
- از کلیشه و جمله‌های رباتیک پرهیز کن
- پیام باید کوتاه و مؤثر باشه (حداکثر ۴ خط)
- از ایموجی به اندازه استفاده کن
- لحن دوستانه ولی حرفه‌ای داشته باش
- اگه اسم مشتری داده شد، در ابتدای پیام به کار ببر
- اگه لینک عکس محصول در پیام بود، حتماً توی پاسخ نهایی به صورت "عکسش: [لینک]" بنویس

سناریو: ${scenario || 'عمومی'}

درخواست کاربر: ${prompt}

حالا فقط متن پیام نهایی رو بنویس (بدون توضیح اضافه):`;

    try {
    const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-3.8-flash'];
let response, lastError;
for (const model of models) {
    response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
            })
        }
    );
    if (response.ok) break;
    lastError = await response.json();
}

if (!response.ok) throw new Error(lastError?.error?.message || 'خطا در AI')

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return res.status(200).json({
            success: true,
            text: text.trim()
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
