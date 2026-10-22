import { createClient } from '@supabase/supabase-js';

const palettes = {
    blue: ['#2563eb', '#0f172a', '#dbeafe', '#3b82f6'],
    green: ['#059669', '#064e3b', '#d1fae5', '#10b981'],
    gold: ['#d97706', '#1c1917', '#fef3c7', '#f59e0b'],
    purple: ['#7c3aed', '#312e81', '#ede9fe', '#8b5cf6'],
    red: ['#dc2626', '#450a0a', '#fee2e2', '#ef4444'],
    black: ['#0f172a', '#334155', '#f8fafc', '#475569']
};

function escapeXml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
    })[char]);
}

function chooseColor(input) {
    const value = String(input || '').toLowerCase();
    if (/سبز|green/.test(value)) return 'green';
    if (/طلایی|gold|زرد/.test(value)) return 'gold';
    if (/بنفش|purple/.test(value)) return 'purple';
    if (/قرمز|red/.test(value)) return 'red';
    if (/مشکی|سیاه|black/.test(value)) return 'black';
    return 'gold';
}

// موتور ساخت لوگوهای وکتور مدرن، لوکس و تجاری (بدون خطای قطعی اینترنت یا API)
function createProSvgLogo(name, type, shape, colors, variant) {
    const [primary, dark, light, accent] = colors;
    const safeName = escapeXml(name);
    const safeType = escapeXml(type);
    const initial = escapeXml([...name][0] || 'M');

    let symbolGraphic = '';
    
    if (variant === 0) {
        // طرح ۱: استایل مدرن هندسی شبکه‌ای
        symbolGraphic = `
            <defs>
                <linearGradient id="lg0" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${primary}" />
                    <stop offset="100%" stop-color="${accent}" />
                </linearGradient>
            </defs>
            <g transform="translate(384 210)">
                <polygon points="0,-60 52,-30 52,30 0,60 -52,30 -52,-30" fill="url(#lg0)" opacity="0.9"/>
                <circle r="30" fill="#ffffff"/>
                <circle r="12" fill="${primary}"/>
            </g>`;
    } else if (variant === 1) {
        // طرح ۲: مونوگرام لوکس دایره‌ای شرکتی
        symbolGraphic = `
            <g transform="translate(384 210)">
                <circle r="70" fill="none" stroke="${primary}" stroke-width="4"/>
                <circle r="58" fill="${light}" opacity="0.5"/>
                <text x="0" y="22" text-anchor="middle" font-family="'Vazirmatn', 'Tahoma', sans-serif" font-size="64" font-weight="900" fill="${primary}">${initial}</text>
            </g>`;
    } else if (variant === 2) {
        // طرح ۳: قاب مینیمال الماس (Diamond Luxury)
        symbolGraphic = `
            <g transform="translate(384 210)">
                <rect x="-50" y="-50" width="100" height="100" rx="20" fill="none" stroke="${primary}" stroke-width="5" transform="rotate(45)"/>
                <path d="M-20 -10 L0 -30 L20 -10 L0 30 Z" fill="${primary}"/>
            </g>`;
    } else {
        // طرح ۴: استایل مدرن امروزی خطی (Modern Minimal)
        symbolGraphic = `
            <g transform="translate(384 210)">
                <circle cx="-20" cy="-10" r="30" fill="${primary}" opacity="0.8"/>
                <circle cx="20" cy="10" r="30" fill="${accent}" opacity="0.8"/>
                <circle r="20" fill="#ffffff"/>
            </g>`;
    }

    const fontSize = name.length > 20 ? 30 : 38;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768" width="768" height="768">
        <rect width="768" height="768" fill="#ffffff"/>
        ${symbolGraphic}
        <text x="384" y="440" text-anchor="middle" direction="rtl" font-family="'Vazirmatn', 'Tahoma', sans-serif" font-size="${fontSize}" font-weight="800" fill="${dark}">${safeName}</text>
        <text x="384" y="490" text-anchor="middle" direction="rtl" font-family="'Vazirmatn', 'Tahoma', sans-serif" font-size="18" font-weight="500" fill="${primary}">${safeType}</text>
        <line x1="320" y1="530" x2="448" y2="530" stroke="${primary}" stroke-width="2" opacity="0.4" stroke-linecap="round"/>
        <text x="384" y="670" text-anchor="middle" font-family="sans-serif" font-size="11" letter-spacing="4" fill="${primary}" opacity="0.6">EXCLUSIVE BRANDING</text>
    </svg>`;
}

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

        const { businessName, businessType, shape = 'circle', color = 'gold' } = req.body || {};

        if (!businessName?.trim() || !businessType?.trim()) {
            return res.status(400).json({ success: false, error: 'نام و نوع کسب‌وکار معتبر وارد کنید.' });
        }

        const name = businessName.trim();
        const type = businessType.trim();
        const colorKey = chooseColor(color);
        const colors = palettes[colorKey];

        // تولید ۴ طرح لوگوی وکتور تمیز، بی‌نقص و بدون خطای بیس‌64
        const logos = Array.from({ length: 4 }, (_, index) =>
            createProSvgLogo(name, type, shape, colors, index)
        );

        if (!isAdmin && plan === 'pro') {
            await supabase
                .from('profiles')
                .update({ logo_count: count + 1 })
                .eq('id', user.id);
        }

        return res.status(200).json({
            size: logos.length,
            success: true,
            logos
        });

    } catch (error) {
        console.error('Logo generation error:', error?.message || error);
        return res.status(500).json({ success: false, error: 'خطا در ساخت لوگو. دوباره تلاش کنید.' });
    }
}
