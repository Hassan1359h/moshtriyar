import { createClient } from '@supabase/supabase-js';

// ==========================================
// بخش اول: تنظیمات صنایع و رنگ‌شناسی
// (این دیکشنری قلب تپنده حرفه‌ای شدن لوگوست)
// ==========================================
const industryConfig = {
    'کافه': { en: 'Cafe', colors: ['#4A3B32', '#D4A373', '#FAEDCD'], vibe: 'warm, organic, coffee bean' },
    'رستوران': { en: 'Restaurant', colors: ['#9B2226', '#E9D8A6', '#0A9396'], vibe: 'appetizing, elegant, culinary' },
    'پوشاک': { en: 'Fashion Store', colors: ['#000000', '#D4AF37', '#FFFFFF'], vibe: 'minimalist, luxurious, elegant' },
    'فناوری': { en: 'Tech Company', colors: ['#0077B6', '#00B4D8', '#CAF0F8'], vibe: 'modern, geometric, futuristic' },
    'پزشکی': { en: 'Medical Clinic', colors: ['#2A9D8F', '#E9C46A', '#FFFFFF'], vibe: 'clean, trustworthy, health' },
    'ورزشی': { en: 'Sports', colors: ['#E63946', '#1D3557', '#F1FAEE'], vibe: 'dynamic, bold, energetic' },
    'آرایشی': { en: 'Beauty Salon', colors: ['#FFB5A7', '#FCD5CE', '#F8EDEB'], vibe: 'soft, feminine, luxury' },
    'املاک': { en: 'Real Estate', colors: ['#264653', '#2A9D8F', '#E9C46A'], vibe: 'solid, building, trust' }
};

// تابع تولید عدد تصادفی بر اساس نام (Seed)
function generateSeed(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

// ==========================================
// بخش دوم: موتور تولید لوگوی وکتور (SVG)
// ==========================================
function generateProSVG(businessName, industry, colorShift = 0) {
    const config = industryConfig[industry] || { colors: ['#1A365D', '#2B6CB0', '#E2E8F0'], vibe: 'corporate' };
    const seed = generateSeed(businessName) + colorShift;
    
    const primary = config.colors[seed % config.colors.length];
    const secondary = config.colors[(seed + 1) % config.colors.length];
    const bg = config.colors[(seed + 2) % config.colors.length];
    
    const initials = businessName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const shapeType = seed % 3;

    let iconSvg = '';
    // تولید اشکال هندسی پیچیده بر اساس صنعت
    if (industry === 'فناوری' || industry === 'املاک') {
        // اشکال تیز و مهندسی
        iconSvg = `<path d="M 50 10 L 90 50 L 50 90 L 10 50 Z" fill="none" stroke="${primary}" stroke-width="6"/>
                   <circle cx="50" cy="50" r="15" fill="${secondary}"/>`;
    } else if (industry === 'کافه' || industry === 'رستوران') {
        // اشکال منحنی و ارگانیک
        iconSvg = `<path d="M 20 50 Q 20 20 50 20 Q 80 20 80 50 Q 80 80 50 80 Q 20 80 20 50" fill="${primary}"/>
                   <path d="M 35 50 Q 50 35 65 50 Q 50 65 35 50" fill="${bg}"/>`;
    } else {
        // اشکال مینیمال و متقارن
        iconSvg = `<circle cx="50" cy="50" r="35" fill="none" stroke="${primary}" stroke-width="8"/>
                   <rect x="35" y="35" width="30" height="30" fill="${secondary}" transform="rotate(45 50 50)"/>`;
    }

    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="512" height="512">
        <rect width="200" height="200" fill="#ffffff" />
        <g transform="translate(50, 20)">${iconSvg}</g>
        <text x="100" y="150" font-family="'Vazirmatn', 'Arial', sans-serif" font-size="22" font-weight="900" fill="${primary}" text-anchor="middle">${businessName}</text>
        <line x1="60" y1="162" x2="140" y2="162" stroke="${secondary}" stroke-width="2"/>
        <text x="100" y="180" font-family="'Arial', sans-serif" font-size="10" fill="${secondary}" text-anchor="middle" letter-spacing="3">${config.en.toUpperCase()}</text>
    </svg>
    `;
}

// ==========================================
// بخش سوم: هندلر اصلی API
// ==========================================
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        // --- بخش احراز هویت و دیتابیس (همان کد قبلی شما) ---
        const authorization = req.headers.authorization || '';
        if (!authorization.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'لطفاً وارد حساب شوید.' });

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data: { user }, error: authError } = await supabase.auth.getUser(authorization.slice(7).trim());
        
        if (authError || !user) return res.status(401).json({ success: false, error: 'نشست نامعتبر است.' });

        const { data: profile } = await supabase.from('profiles').select('plan, logo_count, subscription_end_date').eq('id', user.id).single();
        
        // --- بررسی اشتراک ---
        const isAdmin = Boolean(process.env.ADMIN_USER_ID) && user.id === process.env.ADMIN_USER_ID;
        const plan = profile?.plan || 'free';
        const count = Number(profile?.logo_count || 0);
        const active = Boolean(profile?.subscription_end_date) && new Date(profile.subscription_end_date).getTime() > Date.now();

        if (!isAdmin) {
            if (!active || !['pro', 'business', 'vip_yearly'].includes(plan)) return res.status(403).json({ success: false, error: 'اشتراک معتبر لازم است.' });
            if (plan === 'pro' && count >= 5) return res.status(403).json({ success: false, error: 'سهمیه تمام شده است.' });
        }

        const { businessName, businessType, useAI = false } = req.body || {};
        if (!businessName?.trim() || !businessType?.trim()) return res.status(400).json({ success: false, error: 'نام و نوع کسب‌وکار الزامی است.' });

        const name = businessName.trim();
        const type = businessType.trim();
        const config = industryConfig[type] || { en: 'Business', colors: ['#333', '#666'], vibe: 'modern' };

        let logos = [];

        // ==========================================
        // لایه اول: استفاده از هوش مصنوعی DALL-E 3 (نیاز به API Key)
        // ==========================================
        if (useAI && process.env.OPENAI_API_KEY) {
            const prompt = `A professional, minimalist, vector-style logo icon for a ${config.en} business. 
            Theme: ${config.vibe}. Color palette: ${config.colors.join(', ')}. 
            Flat design, white background, highly creative, corporate identity, no text, clean lines, 8k resolution.`;

            try {
                const response = await fetch('https://api.openai.com/v1/images/generations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
                    body: JSON.stringify({ model: "dall-e-3", prompt: prompt, n: 1, size: "1024x1024", quality: "standard" })
                });
                const aiData = await response.json();
                if (aiData.data && aiData.data[0]) {
                    logos.push({ type: 'ai_image', url: aiData.data[0].url });
                }
            } catch (e) {
                console.error("AI Generation Failed", e);
                // اگر هوش مصنوعی خطا داد، به صورت خودکار به لایه دوم (SVG) می‌رود
            }
        }

        // ==========================================
        // لایه دوم: تولید لوگوهای وکتور پیشرفته (SVG)
        // ==========================================
        // ما 3 طرح متفاوت وکتور با رنگ‌بندی‌های مختلف از همان صنعت تولید می‌کنیم
        logos.push({ type: 'svg', code: generateProSVG(name, type, 0) });
        logos.push({ type: 'svg', code: generateProSVG(name, type, 1) });
        logos.push({ type: 'svg', code: generateProSVG(name, type, 2) });

        // آپدیت دیتابیس
        if (!isAdmin && plan === 'pro') {
            await supabase.from('profiles').update({ logo_count: count + 1 }).eq('id', user.id);
        }

        return res.status(200).json({ success: true, logos });

    } catch (error) {
        console.error('Logo generation error:', error);
        return res.status(500).json({ success: false, error: 'خطا در ساخت لوگو.' });
    }
}
