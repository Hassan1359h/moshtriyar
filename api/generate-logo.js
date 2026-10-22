import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const authorization = req.headers.authorization || '';
        if (!authorization.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'لطفاً وارد حساب شوید.' });
        }

        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return res.status(500).json({ success: false, error: 'تنظیمات سرور ناقص است.' });
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(authorization.slice(7).trim());
        if (authError || !user) {
            return res.status(401).json({ success: false, error: 'نشست نامعتبر است.' });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('plan,logo_count,subscription_end_date')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({ success: false, error: 'پروفایل یافت نشد.' });
        }

        const isAdmin = Boolean(process.env.ADMIN_USER_ID) && user.id === process.env.ADMIN_USER_ID;
        const plan = profile.plan || 'free';
        const count = Number(profile.logo_count || 0);
        const active = Boolean(profile.subscription_end_date) && new Date(profile.subscription_end_date).getTime() > Date.now();

        if (!isAdmin) {
            if (!active || !['pro', 'business', 'vip_yearly'].includes(plan)) {
                return res.status(403).json({ success: false, error: 'اشتراک معتبر برای ساخت لوگو لازم است.' });
            }
            if (plan === 'pro' && count >= 5) {
                return res.status(403).json({ success: false, error: 'سهمیه ساخت لوگوی شما تمام شده است.' });
            }
        }

        const { businessName, businessType, color = 'gold' } = req.body || {};

        if (!businessName?.trim() || !businessType?.trim()) {
            return res.status(400).json({ success: false, error: 'نام و نوع کسب‌وکار معتبر وارد کنید.' });
        }

        const name = businessName.trim();
        const type = businessType.trim();

        // --- اصلاح پرامپت‌ها ---
        // ۱. نام برند (name) به پرامپت اضافه شد.
        // ۲. از کلمات کلیدی بهتر برای طراحی لوگو استفاده شد.
        // ۳. هر ۴ طرح استایل متفاوتی دارند تا شبیه هم نشوند.
        
        const basePrompt = `Professional vector logo for "${name}", a ${type} business, ${color} color theme, isolated on white background, high quality, flat design, trending on dribbble,`;
        
        const prompts = [
            `${basePrompt} minimalist geometric symbol, clean lines, corporate identity`, // طرح 1
            `${basePrompt} abstract modern mark, simple typography, sleek`, // طرح 2
            `${basePrompt} vintage badge style, emblem, classic, elegant`, // طرح 3
            `${basePrompt} creative mascot or lettermark, unique, bold` // طرح 4
        ];

        // تولید لینک‌های تصویر با سیدهای متفاوت برای تنوع
        const logos = prompts.map((prompt, index) => {
            const encodedPrompt = encodeURIComponent(prompt);
            const seed = Math.floor(Math.random() * 100000); // سید رندوم برای تنوع بیشتر
            return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${seed}`;
        });

        if (!isAdmin && plan === 'pro') {
            await supabase
                .from('profiles')
                .update({ logo_count: count + 1 })
                .eq('id', user.id);
        }

        return res.status(200).json({
            success: true,
            logos
        });

    } catch (error) {
        console.error('Logo generation error:', error?.message || error);
        return res.status(500).json({ success: false, error: 'خطا در ساخت لوگو. دوباره تلاش کنید.' });
    }
}
