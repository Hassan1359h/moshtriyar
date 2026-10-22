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
    if (/طلایی|gold|زرد|طلا/.test(value)) return 'gold';
    if (/بنفش|purple/.test(value)) return 'purple';
    if (/قرمز|red/.test(value)) return 'red';
    if (/مشکی|سیاه|black/.test(value)) return 'black';
    return 'gold';
}

// تولید آیکون‌های وکتور کاملاً تخصصی و مرتبط با صنف کسب‌وکار
function getIndustryIcon(type, primary, accent, variant) {
    const t = String(type || '').toLowerCase();

    // ۱. کافه، قهوه، رستوران، فست فود
    if (/کافه|قهوه|رستوران|کافی‌شاپ|فست|غذا|cafe|coffee|restaurant|food/.test(t)) {
        if (variant === 0) {
            return `<g transform="translate(384 205)">
                <path d="M-35 -20 H25 V15 Q25 35 -5 35 Q-35 35 -35 15 Z" fill="none" stroke="${primary}" stroke-width="6" stroke-linejoin="round"/>
                <path d="M25 -10 H38 Q50 -10 45 10 Q40 25 25 20" fill="none" stroke="${primary}" stroke-width="6" stroke-linecap="round"/>
                <path d="M-20 -35 Q-25 -45 -15 -55 M0 -35 Q-5 -45 5 -55 M20 -35 Q15 -45 25 -55" fill="none" stroke="${primary}" stroke-width="4" stroke-linecap="round"/>
            </g>`;
        }
        return `<g transform="translate(384 205)">
            <circle r="65" fill="${accent}" opacity="0.3"/>
            <path d="M-25 -15 H25 V10 Q25 30 0 30 Q-25 30 -25 10 Z" fill="${primary}"/>
            <path d="M-15 -35 Q0 -45 15 -35" fill="none" stroke="${primary}" stroke-width="4" stroke-linecap="round"/>
        </g>`;
    }

    // ۲. طلا و جواهر، ساعت، لوکس
    if (/طلا|جواهر|زیورآلات|گالری|ساعت|jewelry|gold|watch/.test(t)) {
        return `<g transform="translate(384 205)">
            <polygon points="0,-50 45,-15 25,45 -25,45 -45,-15" fill="none" stroke="${primary}" stroke-width="6" stroke-linejoin="round"/>
            <path d="M-45 -15 L45 -15 M-28 10 L28 10 M0 -50 L0 45" stroke="${primary}" stroke-width="3" opacity="0.6"/>
            <circle r="12" fill="${accent}"/>
        </g>`;
    }

    // ۳. املاک، ساختمان، ساخت و ساز
    if (/املاک|مسکن|ساختمان|معماری|realestate|home|building/.test(t)) {
        return `<g transform="translate(384 205)">
            <path d="M0 -60 L60 -10 L45 0 L45 55 L-45 55 L-45 0 L-60 -10 Z" fill="none" stroke="${primary}" stroke-width="6" stroke-linejoin="round"/>
            <rect x="-15" y="15" width="30" height="40" fill="${accent}" rx="4"/>
        </g>`;
    }

    // ۴. پزشکی، کلینیک، داروخانه، سلامت
    if (/پزشک|دکتر|درمانگاه|کلینیک|سلامت|دارو|medical|clinic|health/.test(t)) {
        return `<g transform="translate(384 205)">
            <circle r="60" fill="none" stroke="${primary}" stroke-width="5"/>
            <path d="M-25 -5 H25 M0 -30 V30" stroke="${primary}" stroke-width="8" stroke-linecap="round"/>
        </g>`;
    }

    // ۵. پوشاک، بوتیک، مد، لباس
    if (/پوشاک|بوتیک|لباس|مد|fashion|clothing|shop/.test(t)) {
        return `<g transform="translate(384 205)">
            <path d="M-50 -20 L-25 -45 Q0 -55 25 -45 L50 -20 L30 -5 L15 -25 L0 -35 L-15 -25 L-30 -5 Z" fill="${primary}"/>
            <path d="M-30 -5 L-40 35 H40 L30 -5" fill="none" stroke="${primary}" stroke-width="5" stroke-linejoin="round"/>
        </g>`;
    }

    // ۶. فناوری، کامپیوتر، موبایل، نرم‌افزار، هوش مصنوعی
    if (/فناوری|کامپیوتر|موبایل|سایت|اپ|نرم‌افزار|tech|it|software|digital/.test(t)) {
        return `<g transform="translate(384 205)">
            <rect x="-50" y="-35" width="100" height="70" rx="12" fill="none" stroke="${primary}" stroke-width="6"/>
            <path d="M-25 0 L-10 -15 L5 0 L-10 15 Z M20 -10 H35 M20 10 H30" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
    }

    // طرح پیش‌فرض فوق‌العاده شیک و مدرن (مناسب سایر کسب‌وکارها)
    return `<g transform="translate(384 205)">
        <circle r="65" fill="none" stroke="${primary}" stroke-width="5"/>
        <circle r="45" fill="${accent}" opacity="0.3"/>
        <path d="M-20 0 L0 -25 L20 0 L0 25 Z" fill="${primary}"/>
    </g>`;
}

function createStunningLogo(name, type, shape, colors, variant) {
    const [primary, dark, light, accent] = colors;
    const safeName = escapeXml(name);
    const safeType = escapeXml(type);
    
    const iconElement = getIndustryIcon(type, primary, accent, variant);

    let frameElement = '';
    if (variant === 1) {
        frameElement = `<rect x="64" y="64" width="640" height="640" rx="40" fill="none" stroke="${primary}" stroke-width="3" opacity="0.4"/>`;
    } else if (variant === 2) {
        frameElement = `<circle cx="384" cy="384" r="320" fill="none" stroke="${primary}" stroke-width="2" stroke-dasharray="8,8" opacity="0.5"/>`;
    }

    const fontSize = name.length > 20 ? 32 : 42;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768" width="768" height="768">
        <rect width="768" height="768" fill="#ffffff"/>
        ${frameElement}
        ${iconElement}
        <text x="384" y="440" text-anchor="middle" direction="rtl" font-family="'Vazirmatn', 'Tahoma', sans-serif" font-size="${fontSize}" font-weight="900" fill="${dark}">${safeName}</text>
        <text x="384" y="495" text-anchor="middle" direction="rtl" font-family="'Vazirmatn', 'Tahoma', sans-serif" font-size="20" font-weight="600" fill="${primary}">${safeType}</text>
        <line x1="284" y1="535" x2="484" y2="535" stroke="${primary}" stroke-width="3" opacity="0.3" stroke-linecap="round"/>
        <text x="384" y="680" text-anchor="middle" font-family="sans-serif" font-size="12" letter-spacing="5" fill="${primary}" opacity="0.6">BRAND IDENTITY</text>
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

        // تولید ۴ طرح کاملاً مرتبط، حرفه‌ای و اختصاصی با صنف کاربر
        const logos = Array.from({ length: 4 }, (_, index) =>
            createStunningLogo(name, type, shape, colors, index)
        );

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
