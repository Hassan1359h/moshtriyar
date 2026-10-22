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
    return 'gold'; // Default to luxury Gold theme
}

// ساخت پرامپت انگلیسی بهینه برای مدل تصویرساز FLUX AI
function buildAIPrompt(name, type, colorName) {
    const cleanType = type.replaceAll(/[/\\#,$]/g, ' ');
    return `Minimalist luxury vector logo icon for ${cleanType}, emblem symbol, modern flat design, aesthetic line art, ${colorName} color scheme, premium branding identity, white background, high quality vector graphics --no text, photorealistic, realistic photos, noisy, blurry, 3d render, frame`;
}

// تولید تصویر با مدل هوش مصنوعی FLUX
async function generateAILogoImage(prompt, seed) {
    try {
        const encodedPrompt = encodeURIComponent(prompt);
        // استفاده از API هوش مصنوعی FLUX با خروجی باکیفیت 1024x1024
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
        
        const response = await fetch(imageUrl);
        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/png';
        return `data:${mimeType};base64,${base64}`;
    } catch (e) {
        console.error("AI Generation Error:", e);
        return null;
    }
}

// موتور وکتور هندسی لوکس (برای طرح‌های SVG نهایی)
function createLuxurySvgLogo(name, type, shape, colors, variant) {
    const [primary, dark, light, accent] = colors;
    const safeName = escapeXml(name);
    const safeType = escapeXml(type);
    const initial = escapeXml([...name][0] || 'M');

    let symbolGraphic = '';
    
    if (variant === 0) {
        // طرح ۱: نشان هندسی لوکس دو‌رنگ (Modern Geometric)
        symbolGraphic = `
            <defs>
                <linearGradient id="grad0" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${primary}" />
                    <stop offset="100%" stop-color="${accent}" />
                </linearGradient>
            </defs>
            <g transform="translate(384 220)">
                <rect x="-55" y="-55" width="110" height="110" rx="28" fill="url(#grad0)" transform="rotate(45)"/>
                <circle r="38" fill="none" stroke="#ffffff" stroke-width="4"/>
                <path d="M-15 0 L0 -15 L15 0 L0 15 Z" fill="#ffffff"/>
            </g>`;
    } else if (variant === 1) {
        // طرح ۲: لوگوی مونوگرام شیک و طلایی/مدرن
        symbolGraphic = `
            <g transform="translate(384 220)">
                <circle r="75" fill="none" stroke="${primary}" stroke-width="3"/>
                <circle r="65" fill="none" stroke="${primary}" stroke-width="1" stroke-dasharray="6,6"/>
                <text x="0" y="28" text-anchor="middle" font-family="'Vazirmatn', 'B Yekan', sans-serif" font-size="70" font-weight="900" fill="${primary}">${initial}</text>
            </g>`;
    } else if (variant === 2) {
        // طرح ۳: المان نئونی/مینیمال خطی مدرن (Luxury Minimal Line Art)
        symbolGraphic = `
            <g transform="translate(384 220)">
                <path d="M-45 -45 L0 -75 L45 -45 L45 25 L0 55 L-45 25 Z" fill="none" stroke="${primary}" stroke-width="5" stroke-linejoin="round"/>
                <path d="M-25 -25 L0 -42 L25 -25 L25 15 L0 32 L-25 15 Z" fill="${light}" opacity="0.6"/>
                <circle cx="0" cy="-5" r="12" fill="${primary}"/>
            </g>`;
    } else {
        // طرح ۴: استارتاپی مینیمال آیکون دار
        symbolGraphic = `
            <g transform="translate(384 220)">
                <circle r="70" fill="${light}"/>
                <path d="M-25 -35 L25 -35 L35 35 L-35 35 Z" fill="none" stroke="${primary}" stroke-width="6" stroke-linejoin="round"/>
                <circle cx="0" cy="-10" r="14" fill="${primary}"/>
            </g>`;
    }

    const fontSize = name.length > 20 ? 32 : 40;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768" width="768" height="768">
        <rect width="768" height="768" fill="#ffffff"/>
        ${symbolGraphic}
        <text x="384" y="440" text-anchor="middle" direction="rtl" font-family="'Vazirmatn', 'Tahoma', sans-serif" font-size="${fontSize}" font-weight="800" fill="${dark}">${safeName}</text>
        <text x="384" y="490" text-anchor="middle" direction="rtl" font-family="'Vazirmatn', 'Tahoma', sans-serif" font-size="20" font-weight="500" fill="${primary}">${safeType}</text>
        <line x1="300" y1="520" x2="468" y2="520" stroke="${primary}" stroke-width="2" opacity="0.3"/>
        <text x="384" y="680" text-anchor="middle" font-family="sans-serif" font-size="12" letter-spacing="4" fill="${primary}" opacity="0.6">PREMIUM BRANDING</text>
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

        // ۱. تلاش برای تولید طرح‌های برتر با هوش مصنوعی FLUX AI
        const prompt = buildAIPrompt(name, type, colorKey);
        const randomSeeds = [Math.floor(Math.random() * 10000), Math.floor(Math.random() * 10000)];
        
        const aiResults = await Promise.all([
            generateAILogoImage(prompt, randomSeeds[0]),
            generateAILogoImage(prompt, randomSeeds[1])
        ]);

        const logos = [];

        // اگر تصویر هوش مصنوعی با موفقیت تولید شد، آن را اضافه کن
        aiResults.forEach(aiImg => {
            if (aiImg) logos.push(aiImg);
        });

        // ۲. ساخت خروجی‌های وکتور لوکس اختصاصی (مجموعاً ۴ طرح عالی)
        let variantIndex = 0;
        while (logos.length < 4) {
            logos.push(createLuxurySvgLogo(name, type, shape, colors, variantIndex % 4));
            variantIndex++;
        }

        // ثبت استفاده در دیتابیس
        if (!isAdmin && plan === 'pro') {
            await supabase
                .from('profiles')
                .update({ logo_count: count + 1 })
                .eq('id', user.id);
        }

        return res.status(200).json({
            success: true,
            logos,
            count: logos.length
        });

    } catch (error) {
        console.error('Logo generation error:', error?.message || error);
        return res.status(500).json({ success: false, error: 'خطا در ساخت لوگو. دوباره تلاش کنید.' });
    }
}
