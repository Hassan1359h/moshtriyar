module.exports = async function handler(req, res) {
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

سناریو: ${scenario || 'عمومی'}

درخواست کاربر: ${prompt}

حالا فقط متن پیام نهایی رو بنویس (بدون توضیح اضافه):`;

    try {
    
        const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_KEY}`, 
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: systemPrompt }]
                    }],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 2000,
                    }
                })
            }
        );

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'خطا در ارتباط با AI');
        }

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
