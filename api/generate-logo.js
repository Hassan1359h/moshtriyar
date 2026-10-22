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

        // ایجاد لینک مستقیم به موتور سریع تولید تصویر هوش مصنوعی (بدون معطلی و خطای تایم‌اوت Vercel)
        const encodedType = encodeURIComponent(`Professional minimalist vector logo symbol for ${type}, corporate branding, clean design, white background`);
        
        const logos = [
            `https://image.pollinations.ai/prompt/${encodedType}%20style%201?width=512&height=512&nologo=true&seed=101`,
            `https://image.pollinations.ai/prompt/${encodedType}%20style%202?width=512&height=512&nologo=true&seed=202`,
            `https://image.pollinations.ai/prompt/${encodedType}%20style%203?width=512&height=512&nologo=true&seed=303`,
            `https://image.pollinations.ai/prompt/${encodedType}%20style%204?width=512&height=512&nologo=true&seed=404`
        ];

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
