import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'لطفاً وارد حساب خود شوید.' });
        }

        const supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // ۱. احراز هویت کاربر
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.slice(7).trim());
        if (userError || !user) {
            return res.status(401).json({ success: false, error: 'نشست شما منقضی شده است.' });
        }

        // ۲. بررسی وضعیت اشتراک و تعداد لوگوهای ساخته‌شده
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('plan_name, logo_count, subscription_end_date')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({ success: false, error: 'پروفایل کاربری یافت نشد.' });
        }

        const now = new Date();
        const isSubscriptionActive = profile.subscription_end_date && new Date(profile.subscription_end_date) > now;
        const plan = profile.plan_name || 'free';
        const logoCount = profile.logo_count || 0;

        // ۳. اعمال محدودیت‌ها بر اساس پلن
        if (!isSubscriptionActive || plan === 'test' || plan === 'free') {
            return res.status(403).json({ success: false, error: 'جهت ساخت لوگو، لطفاً اشتراک کسب‌وکار یا اشتراک سالیانه تهیه کنید.' });
        }

        if (plan === 'pro' && logoCount >= 5) {
            return res.status(403).json({ success: false, error: 'شما به سقف ۵ لوگوی مجاز در پلن حرفه‌ای رسیده‌اید. برای ساخت نامحدود، به پلن کسب‌وکار ارتقا دهید.' });
        }

        // ۴. پردازش درخواست و ساخت لوگو
        const { businessType, businessName, shape, color, style } = req.body;
        if (!businessType || !businessName) {
            return res.status(400).json({ success: false, error: 'نام و نوع کسب و کار الزامی است.' });
        }

        // پرامپت حرفه‌ای برای هوش مصنوعی
        const prompt = `A professional, minimalist vector logo for a ${businessType} named "${businessName}". Shape: ${shape}. Primary color: ${color}. Style: ${style}. Flat design, white background, high quality, corporate identity, no realistic photos, no 3D, clean lines.`;
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;

        const imageResponse = await fetch(imageUrl);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        // ۵. افزایش تعداد لوگو (فقط اگر پلن حرفه‌ای باشد)
        if (plan === 'pro') {
            await supabaseAdmin
                .from('profiles')
                .update({ logo_count: logoCount + 1 })
                .eq('id', user.id);
        }

        return res.status(200).json({
            success: true,
            imageUrl: dataUrl,
            promptUsed: prompt
        });

    } catch (error) {
        console.error('Logo generation error:', error);
        return res.status(500).json({ success: false, error: 'خطا در تولید لوگو' });
    }
}
