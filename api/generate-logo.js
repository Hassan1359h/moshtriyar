
import { createClient } from '@supabase/supabase-js';

const PALETTES = {
    blue: ['#2563eb', '#0f172a'],
    green: ['#059669', '#064e3b'],
    gold: ['#b8860b', '#292524'],
    purple: ['#7c3aed', '#312e81'],
    red: ['#dc2626', '#450a0a'],
    black: ['#171717', '#525252']
};

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function chooseColor(input) {
    const value = String(input || '').toLowerCase();

    if (/سبز|green/.test(value)) return 'green';
    if (/طلایی|gold|زرد/.test(value)) return 'gold';
    if (/بنفش|purple/.test(value)) return 'purple';
    if (/قرمز|red/.test(value)) return 'red';
    if (/مشکی|سیاه|black/.test(value)) return 'black';

    return 'blue';
}

const DESIGN_STYLES = [
    {
        name: 'minimal',
        description:
            'Minimalist premium identity, geometric simplicity, ' +
            'bold recognizable silhouette, generous negative space.'
    },
    {
        name: 'luxury',
        description:
            'Luxury editorial brand identity, elegant symmetry, ' +
            'refined ornamental geometry, sophisticated visual balance.'
    },
    {
        name: 'geometric',
        description:
            'Distinctive geometric emblem, clever negative-space ' +
            'concept, crisp vector-like edges, memorable modern shape.'
    },
    {
        name: 'creative',
        description:
            'Creative boutique brand mark, unexpected organic ' +
            'shapes, expressive composition, distinctive artistic concept.'
    }
];

function buildPrompt({
    businessName,
    businessType,
    shape,
    primary,
    dark,
    description
}) {
    const shapes = {
        circle: 'Use a circular composition or circular emblem.',
        square: 'Use a balanced square composition.',
        rectangle: 'Use a horizontal rectangular composition.',
        abstract: 'Use a free-form abstract composition without a frame.'
    };

    return [
        'Design an original, professional, commercially usable logo symbol.',
        `Business name: ${businessName}.`,
        `Business category: ${businessType}.`,
        'Understand the business category and invent a relevant visual concept.',
        `Art direction: ${description}`,
        `Primary brand color: ${primary}.`,
        `Secondary brand color: ${dark}.`,
        shapes[shape] || shapes.circle,
        'Use a transparent background.',
        'Create one centered logo mark only.',
        'No mockups, photographs, products, scenery, shadows, or watermarks.',
        'Do not draw any text, letters, numbers, words, or typography.',
        'Do not reuse a generic stock icon.',
        'Make the visual concept substantially different from ordinary template logos.',
        'Use clean edges and a polished, professional brand identity aesthetic.'
    ].join('\n');
}

function makeSvgLogo(pngBase64, businessName, businessType, colors) {
    const [primary, dark] = colors;
    const safeName = escapeXml(businessName);
    const safeType = escapeXml(businessType);
    const fontSize =
        businessName.length > 22 ? 27 :
        businessName.length > 13 ? 35 : 43;

    return `<svg xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        width="768" height="768" viewBox="0 0 768 768">
        <rect width="768" height="768" fill="#ffffff"/>
        <image x="114" y="20" width="540" height="500"
            preserveAspectRatio="xMidYMid meet"
            href="data:image/png;base64,${pngBase64}"
            xlink:href="data:image/png;base64,${pngBase64}"/>
        <path d="M284 548 H484" stroke="${primary}"
            stroke-width="4" stroke-linecap="round"/>
        <text x="384" y="605" text-anchor="middle"
            direction="rtl" unicode-bidi="plaintext"
            font-family="Vazirmatn,Tahoma,sans-serif"
            font-size="${fontSize}" font-weight="800"
            fill="${dark}">${safeName}</text>
        <text x="384" y="650" text-anchor="middle"
            direction="rtl" unicode-bidi="plaintext"
            font-family="Vazirmatn,Tahoma,sans-serif"
            font-size="19" fill="${primary}">${safeType}</text>
    </svg>`;
}

async function generateImage(apiKey, prompt) {
    const response = await fetch(
        'https://api.openai.com/v1/images/generations',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-image-1',
                prompt,
                size: '1024x1024',
                quality: 'medium',
                background: 'transparent',
                output_format: 'png',
                n: 1
            })
        }
    );

    const result = await response.json();

    if (!response.ok) {
        console.error(
            'OpenAI image generation failed:',
            response.status,
            result?.error?.code || 'unknown_error'
        );

        throw new Error('IMAGE_GENERATION_FAILED');
    }

    const image = result?.data?.[0]?.b64_json;

    if (
        typeof image !== 'string' ||
        image.length === 0 ||
        image.length > 15_000_000
    ) {
        throw new Error('INVALID_IMAGE_RESPONSE');
    }

    return image;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        const authorization = req.headers.authorization || '';

        if (!authorization.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'لطفاً وارد حساب شوید.'
            });
        }

        if (
            !process.env.SUPABASE_URL ||
            !process.env.SUPABASE_SERVICE_ROLE_KEY
        ) {
            console.error('Supabase server environment is incomplete.');

            return res.status(500).json({
                success: false,
                error: 'تنظیمات سرور ناقص است.'
            });
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser(
            authorization.slice(7).trim()
        );

        if (authError || !user) {
            return res.status(401).json({
                success: false,
                error: 'نشست نامعتبر است.'
            });
        }

        const { data: profile, error: profileError } =
            await supabase
                .from('profiles')
                .select('plan,logo_count,subscription_end_date')
                .eq('id', user.id)
                .single();

        if (profileError || !profile) {
            return res.status(404).json({
                success: false,
                error: 'پروفایل یافت نشد.'
            });
        }

        const isAdmin =
            Boolean(process.env.ADMIN_USER_ID) &&
            user.id === process.env.ADMIN_USER_ID;

        const plan = profile.plan || 'free';
        const count = Number(profile.logo_count || 0);

        const active =
            profile.subscription_end_date &&
            new Date(profile.subscription_end_date).getTime() >
                Date.now();

        if (!isAdmin) {
            if (
                !active ||
                !['pro', 'business', 'vip_yearly'].includes(plan)
            ) {
                return res.status(403).json({
                    success: false,
                    error: 'اشتراک معتبر برای ساخت لوگو لازم است.'
                });
            }

            if (plan === 'pro' && count >= 5) {
                return res.status(403).json({
                    success: false,
                    error: 'سهمیه ساخت لوگوی شما تمام شده است.'
                });
            }
        }

        const {
            businessName,
            businessType,
            shape = 'circle',
            color = 'blue'
        } = req.body || {};

        if (
            typeof businessName !== 'string' ||
            typeof businessType !== 'string' ||
            !businessName.trim() ||
            !businessType.trim() ||
            businessName.trim().length > 60 ||
            businessType.trim().length > 60
        ) {
            return res.status(400).json({
                success: false,
                error: 'نام و نوع کسب‌وکار معتبر وارد کنید.'
            });
        }

        if (!process.env.OPENAI_API_KEY) {
            console.error('OPENAI_API_KEY is not configured.');

            return res.status(500).json({
                success: false,
                error: 'سرویس تولید تصویر تنظیم نشده است.'
            });
        }

        const name = businessName.trim();
        const type = businessType.trim();

        const allowedShapes = [
            'circle',
            'square',
            'rectangle',
            'abstract'
        ];

        const safeShape = allowedShapes.includes(shape)
            ? shape
            : 'circle';

        const colors = PALETTES[chooseColor(color)];

        const common = {
            businessName: name,
            businessType: type,
            shape: safeShape,
            primary: colors[0],
            dark: colors[1]
        };

        // چهار درخواست مستقل با چهار جهت هنری متفاوت
        const images = await Promise.all(
            DESIGN_STYLES.map(style =>
                generateImage(
                    process.env.OPENAI_API_KEY,
                    buildPrompt({
                        ...common,
                        description: style.description
                    })
                )
            )
        );

        const logos = images.map(image =>
            makeSvgLogo(image, name, type, colors)
        );

        // ثبت سهمیه فقط برای پلن Pro؛ چهار طرح یک نوبت محسوب می‌شوند.
        if (!isAdmin && plan === 'pro') {
            const { data: updated, error: updateError } =
                await supabase
                    .from('profiles')
                    .update({ logo_count: count + 1 })
                    .eq('id', user.id)
                    .eq('logo_count', count)
                    .lt('logo_count', 5)
                    .select('logo_count');

            if (updateError || !updated?.length) {
                return res.status(409).json({
                    success: false,
                    error: 'ثبت سهمیه ناموفق بود. دوباره تلاش کنید.'
                });
            }
        }

        return res.status(200).json({
            success: true,
            logos,
            count: logos.length
        });

    } catch (error) {
        console.error(
            'Logo generation error:',
            error?.message || 'unknown_error'
        );

        return res.status(500).json({
            success: false,
            error:
                'ساخت لوگو ناموفق بود. لطفاً کمی بعد دوباره تلاش کنید.'
        });
    }
}
