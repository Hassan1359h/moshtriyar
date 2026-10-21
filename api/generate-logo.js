
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        const authHeader = req.headers.authorization || '';

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'لطفاً وارد حساب خود شوید.'
            });
        }

        const supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: { user }, error: userError } =
            await supabaseAdmin.auth.getUser(
                authHeader.slice(7).trim()
            );

        if (userError || !user) {
            return res.status(401).json({
                success: false,
                error: 'نشست شما منقضی شده است.'
            });
        }

        const { data: profile, error: profileError } =
            await supabaseAdmin
                .from('profiles')
                .select('plan, logo_count, subscription_end_date')
                .eq('id', user.id)
                .single();

        if (profileError || !profile) {
            return res.status(404).json({
                success: false,
                error: 'پروفایل یافت نشد.'
            });
        }

        const plan = profile.plan || 'free';
        const logoCount = profile.logo_count || 0;

        const isSubscriptionActive =
            profile.subscription_end_date &&
            new Date(profile.subscription_end_date) > new Date();

        // شناسه ادمین را در متغیر محیطی تنظیم کنید
        const isAdmin =
            Boolean(process.env.ADMIN_USER_ID) &&
            user.id === process.env.ADMIN_USER_ID;

        if (!isAdmin) {
            if (
                !isSubscriptionActive ||
                ['free', 'test', 'trial'].includes(plan)
            ) {
                return res.status(403).json({
                    success: false,
                    error: 'برای ساخت لوگو اشتراک معتبر تهیه کنید.'
                });
            }

            if (plan === 'pro' && logoCount >= 5) {
                return res.status(403).json({
                    success: false,
                    error: 'سقف ۵ لوگوی پلن حرفه‌ای تکمیل شده است.'
                });
            }
        }

        const {
            businessName,
            businessType,
            shape = 'circle',
            color = 'blue',
            style = 'minimal'
        } = req.body || {};

        if (
            typeof businessName !== 'string' ||
            typeof businessType !== 'string' ||
            !businessName.trim() ||
            !businessType.trim() ||
            businessName.length > 100 ||
            businessType.length > 100
        ) {
            return res.status(400).json({
                success: false,
                error: 'نام و نوع کسب‌وکار معتبر الزامی است.'
            });
        }

        const safeOption = (value, fallback) =>
            typeof value === 'string'
                ? value.slice(0, 40).replace(/[^\p{L}\p{N}\s#-]/gu, '') || fallback
                : fallback;

        const safeShape = safeOption(shape, 'circle');
        const safeColor = safeOption(color, 'blue');
        const safeStyle = safeOption(style, 'minimal');

        // طراحی نماد بدون نوشته برای جلوگیری از خرابی متن فارسی
        const prompt = `
Create a premium professional brand logo symbol.

Business category: ${businessType.trim()}
Brand concept: ${businessName.trim()}

Design requirements:
- Professional visual identity
- ${safeStyle} design style
- ${safeShape} composition
- Primary color: ${safeColor}
- Clean flat vector-style illustration
- Strong recognizable silhouette
- Balanced geometric proportions
- Creative negative space
- Suitable for real commercial branding
- Centered composition
- Solid white background
- High contrast
- Maximum three colors

STRICT RULES:
- Symbol only
- Absolutely no text or letters
- No typography
- No mockup
- No 3D rendering
- No shadows
- No gradients
- No watermark
- No decorative background
- No generic clipart
- No photographic elements

The result must look like a professionally designed
brand identity symbol, not an AI-generated poster.
        `.trim();

        const encodedPrompt = encodeURIComponent(prompt);

        // بدون seed
        const imageUrl =
            `https://image.pollinations.ai/prompt/${encodedPrompt}` +
            `?width=768&height=768&nologo=true&model=flux`;

        // جلوگیری از انتظار نامحدود
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        let imageResponse;

        try {
            imageResponse = await fetch(imageUrl, {
                method: 'GET',
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!imageResponse.ok) {
            throw new Error(
                'سرویس تولید تصویر در دسترس نیست. لطفاً دوباره تلاش کنید.'
            );
        }

        const contentType =
            imageResponse.headers.get('content-type') || '';

        const mimeType = contentType.split(';')[0].trim().toLowerCase();

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
            throw new Error('پاسخ دریافتی تصویر معتبر نیست.');
        }

        const arrayBuffer = await imageResponse.arrayBuffer();

        if (!arrayBuffer.byteLength) {
            throw new Error('تصویر دریافتی خالی است.');
        }

        const base64Image =
            Buffer.from(arrayBuffer).toString('base64');

        const dataUrl =
            `data:${mimeType};base64,${base64Image}`;

        // افزایش شمارنده با شرط سقف فعلی
        if (!isAdmin && plan === 'pro') {
            const { data: updated, error: updateError } =
                await supabaseAdmin
                    .from('profiles')
                    .update({ logo_count: logoCount + 1 })
                    .eq('id', user.id)
                    .eq('logo_count', logoCount)
                    .lt('logo_count', 5)
                    .select('logo_count');

            if (updateError || !updated?.length) {
                throw new Error(
                    'ثبت سهمیه لوگو ناموفق بود. لطفاً دوباره تلاش کنید.'
                );
            }
        }

        return res.status(200).json({
            success: true,
            imageUrl: dataUrl,
            promptUsed: prompt
        });

    } catch (error) {
        console.error('Logo generation error:', error);

        const isTimeout = error.name === 'AbortError';

        return res.status(isTimeout ? 504 : 500).json({
            success: false,
            error: isTimeout
                ? 'زمان تولید تصویر بیش از حد طول کشید. دوباره تلاش کنید.'
                : error.message || 'خطا در تولید لوگو'
        });
    }
}
