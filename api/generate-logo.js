
import { createClient } from '@supabase/supabase-js';

/*
 * Moshtriyar Logo Studio
 * Free, rule-based vector logo generator.
 * Output: four SVG strings compatible with dashboard.html
 */

const COLORS = {
    gold: '#C49A35',
    red: '#C62838',
    blue: '#2563EB',
    green: '#087F5B',
    purple: '#7542C8',
    black: '#172033',
    white: '#FFFFFF',
    silver: '#94A3B8',
    orange: '#EA580C',
    pink: '#DB2777',
    navy: '#142B50',
    brown: '#784421',
    turquoise: '#0891B2'
};

const COLOR_WORDS = [
    [/طلایی|طلا|gold|golden/i, 'gold'],
    [/قرمز|سرخ|red/i, 'red'],
    [/مشکی|سیاه|black/i, 'black'],
    [/سفید|white/i, 'white'],
    [/آبی|blue/i, 'blue'],
    [/سبز|green/i, 'green'],
    [/بنفش|purple/i, 'purple'],
    [/نقره|silver/i, 'silver'],
    [/نارنجی|orange/i, 'orange'],
    [/صورتی|pink/i, 'pink'],
    [/سرمه|navy/i, 'navy'],
    [/قهوه‌ای|قهوه ای|brown/i, 'brown'],
    [/فیروزه|turquoise/i, 'turquoise']
];

const DEFAULT_PALETTES = {
    jewelry: ['gold', 'black', 'red'],
    beauty: ['pink', 'gold', 'black'],
    food: ['brown', 'gold', 'black'],
    fashion: ['black', 'gold', 'silver'],
    technology: ['blue', 'navy', 'turquoise'],
    property: ['navy', 'gold', 'silver'],
    medical: ['green', 'blue', 'turquoise'],
    education: ['blue', 'gold', 'navy'],
    fitness: ['red', 'black', 'silver'],
    automotive: ['black', 'red', 'silver'],
    legal: ['navy', 'gold', 'silver'],
    general: ['blue', 'black', 'gold']
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

function categoryOf(value) {
    const t = String(value || '').toLowerCase();

    if (/طلا|جواهر|زرگر|زیور|سکه|gold|jewel/.test(t))
        return 'jewelry';

    if (/زیبایی|آرایش|سالن|ناخن|پوست|beauty|salon/.test(t))
        return 'beauty';

    if (/کافه|قهوه|رستوران|غذا|فست فود|coffee|cafe|food/.test(t))
        return 'food';

    if (/لباس|پوشاک|بوتیک|مد|fashion|clothing/.test(t))
        return 'fashion';

    if (/فناوری|نرم افزار|نرم‌افزار|هوش|دیجیتال|کامپیوتر|مشتری|tech|software|crm/.test(t))
        return 'technology';

    if (/املاک|مسکن|ساختمان|معماری|خانه|property|real estate/.test(t))
        return 'property';

    if (/پزشک|دندان|درمان|کلینیک|آزمایشگاه|دارو|سلامت|medical|dental/.test(t))
        return 'medical';

    if (/مدرسه|آموزش|دانشگاه|کتاب|education|school/.test(t))
        return 'education';

    if (/ورزش|باشگاه|بدنسازی|fitness|gym/.test(t))
        return 'fitness';

    if (/خودرو|ماشین|مکانیک|تعمیرگاه|auto|car/.test(t))
        return 'automotive';

    if (/حقوق|وکیل|وکالت|دادگاه|legal|law/.test(t))
        return 'legal';

    return 'general';
}

function getPalette(input, category) {
    const value = String(input || '');
    const selected = [];
    const matches = [];

    for (const [pattern, key] of COLOR_WORDS) {
        const match = pattern.exec(value);

        if (match) {
            matches.push({
                index: match.index,
                color: COLORS[key]
            });
        }
    }

    const hexPattern = /#[0-9a-fA-F]{6}\b/g;
    let match;

    while ((match = hexPattern.exec(value)) !== null) {
        matches.push({
            index: match.index,
            color: match[0]
        });
    }

    matches.sort((a, b) => a.index - b.index);

    for (const item of matches) {
        if (!selected.includes(item.color)) {
            selected.push(item.color);
        }
    }

    for (const key of DEFAULT_PALETTES[category]) {
        if (selected.length >= 3) break;

        const color = COLORS[key];

        if (!selected.includes(color)) {
            selected.push(color);
        }
    }

    return selected.slice(0, 3);
}

function symbolFor(category, primary, secondary, accent) {
    const line = `fill="none" stroke="${primary}"
        stroke-width="10" stroke-linecap="round"
        stroke-linejoin="round"`;

    switch (category) {
        case 'jewelry':
            return `
                <path d="M-94 -18 L-52 -73 H52 L94 -18 L0 83Z"
                    fill="${primary}"/>
                <path d="M-94 -18 H94 M-52 -73 L-24 -18
                    L0 83 L24 -18 L52 -73"
                    fill="none" stroke="${secondary}"
                    stroke-width="5"/>
                <path d="M0 -106 L8 -87 L27 -79
                    L8 -71 L0 -52 L-8 -71
                    L-27 -79 L-8 -87Z"
                    fill="${accent}"/>`;

        case 'beauty':
            return `
                <path d="M0 78 C-110 19 -88 -65 0 -10
                    C88 -65 110 19 0 78Z"
                    fill="${primary}"/>
                <path d="M0 78 C-45 5 -30 -48 0 -88
                    C30 -48 45 5 0 78Z"
                    fill="${secondary}"/>
                <path d="M0 78 C-5 25 -4 -25 0 -60"
                    fill="none" stroke="${accent}"
                    stroke-width="5"/>`;

        case 'food':
            return `
                <path d="M0 -87 C-25 -48 -64 -23 -64 22
                    A64 64 0 0 0 64 22
                    C64 -23 25 -48 0 -87Z"
                    fill="${primary}"/>
                <path d="M-28 19 Q0 -18 28 19
                    Q0 57 -28 19Z"
                    fill="${secondary}"/>
                <path d="M0 -7 Q-13 17 0 40"
                    fill="none" stroke="${accent}"
                    stroke-width="6"/>`;

        case 'fashion':
            return `
                <path d="M-78 -49 L-31 -84
                    Q0 -44 31 -84 L78 -49
                    L103 7 L60 27 L45 1
                    V86 H-45 V1 L-60 27
                    L-103 7Z"
                    fill="${primary}"/>
                <path d="M-31 -84 Q0 -17 31 -84"
                    fill="none" stroke="${secondary}"
                    stroke-width="8"/>`;

        case 'technology':
            return `
                <path d="M0 -89 L77 -44 V44
                    L0 89 L-77 44 V-44Z"
                    ${line}/>
                <circle cx="-34" cy="-19" r="12"
                    fill="${primary}"/>
                <circle cx="34" cy="-19" r="12"
                    fill="${secondary}"/>
                <circle cy="42" r="12" fill="${accent}"/>
                <path d="M-22 -19 H22 M-28 -7 L-7 30
                    M28 -7 L7 30" ${line}/>`;

        case 'property':
            return `
                <path d="M-94 -8 L0 -85 L94 -8" ${line}/>
                <path d="M-72 -23 V77 H72 V-23" ${line}/>
                <path d="M-15 77 V18 H15 V77"
                    fill="${primary}"/>
                <rect x="-54" y="5" width="23" height="25"
                    fill="${secondary}"/>
                <rect x="31" y="5" width="23" height="25"
                    fill="${accent}"/>`;

        case 'medical':
            return `
                <path d="M-24 -83 H24 V-24 H83
                    V24 H24 V83 H-24 V24
                    H-83 V-24 H-24Z"
                    fill="${primary}"/>
                <path d="M-68 5 H-31 L-17 -15
                    L2 30 L21 -10 L34 5 H68"
                    fill="none" stroke="${secondary}"
                    stroke-width="7"
                    stroke-linecap="round"
                    stroke-linejoin="round"/>`;

        case 'education':
            return `
                <path d="M0 -64 L94 -23 L0 18
                    L-94 -23Z" fill="${primary}"/>
                <path d="M-59 4 V45 Q0 81 59 45 V4"
                    fill="${secondary}"/>
                <path d="M94 -23 V45"
                    fill="none" stroke="${accent}"
                    stroke-width="7"/>
                <circle cx="94" cy="51" r="8"
                    fill="${accent}"/>`;

        case 'fitness':
            return `
                <rect x="-94" y="-43" width="23" height="86"
                    rx="6" fill="${primary}"/>
                <rect x="-65" y="-62" width="22" height="124"
                    rx="6" fill="${secondary}"/>
                <rect x="43" y="-62" width="22" height="124"
                    rx="6" fill="${secondary}"/>
                <rect x="71" y="-43" width="23" height="86"
                    rx="6" fill="${primary}"/>
                <path d="M-43 0 H43"
                    stroke="${accent}" stroke-width="15"/>`;

        case 'automotive':
            return `
                <path d="M-95 25 L-71 -30
                    Q0 -69 71 -30 L95 25
                    V58 H-95Z" fill="${primary}"/>
                <path d="M-60 -24 Q0 -49 60 -24
                    L75 9 H-75Z" fill="${secondary}"/>
                <circle cx="-59" cy="43" r="11"
                    fill="${accent}"/>
                <circle cx="59" cy="43" r="11"
                    fill="${accent}"/>`;

        case 'legal':
            return `
                <path d="M0 -87 V78 M-70 -45 H70
                    M-70 -45 L-92 17 H-48Z
                    M70 -45 L48 17 H92Z" ${line}/>
                <path d="M-34 78 H34 M-52 91 H52"
                    ${line}/>
                <circle cy="-87" r="9" fill="${accent}"/>`;

        default:
            return `
                <path d="M0 -89 L23 -27 L89 0
                    L23 27 L0 89 L-23 27
                    L-89 0 L-23 -27Z"
                    fill="${primary}"/>
                <circle r="25" fill="${secondary}"/>
                <circle r="9" fill="${accent}"/>`;
    }
}

function frameFor(shape, color) {
    if (shape === 'abstract') return '';

    if (shape === 'square') {
        return `
            <rect x="-119" y="-119" width="238"
                height="238" rx="23" fill="none"
                stroke="${color}" stroke-width="3"/>`;
    }

    if (shape === 'rectangle') {
        return `
            <rect x="-144" y="-111" width="288"
                height="222" rx="22" fill="none"
                stroke="${color}" stroke-width="3"/>`;
    }

    return `
        <circle r="120" fill="none"
            stroke="${color}" stroke-width="3"/>`;
}

function textElement({
    x = 384,
    y,
    value,
    size,
    color,
    weight = 700,
    anchor = 'middle'
}) {
    return `
        <text x="${x}" y="${y}"
            text-anchor="${anchor}"
            direction="rtl"
            unicode-bidi="plaintext"
            font-family="Vazirmatn,Tahoma,Arial,sans-serif"
            font-size="${size}"
            font-weight="${weight}"
            fill="${color}">${escapeXml(value)}</text>`;
}

// A refined, larger outline used only by the new third design.
function modernFrame(shape, primary, accent) {
    if (shape === 'abstract') {
        return `
            <path d="M-144 -56 Q-135 -142 -48 -151
                M48 -151 Q135 -142 144 -56
                M144 56 Q135 142 48 151
                M-48 151 Q-135 142 -144 56"
                fill="none" stroke="${primary}"
                stroke-width="5" stroke-linecap="round"/>
            <circle cx="-144" cy="0" r="5" fill="${accent}"/>
            <circle cx="144" cy="0" r="5" fill="${accent}"/>`;
    }

    if (shape === 'square') {
        return `
            <rect x="-151" y="-151" width="302" height="302"
                rx="48" fill="none" stroke="${primary}"
                stroke-width="5"/>
            <path d="M-117 -125 H-78 M78 125 H117"
                stroke="${accent}" stroke-width="6"
                stroke-linecap="round"/>`;
    }

    if (shape === 'rectangle') {
        return `
            <rect x="-177" y="-137" width="354" height="274"
                rx="49" fill="none" stroke="${primary}"
                stroke-width="5"/>
            <path d="M-140 -112 H-100 M100 112 H140"
                stroke="${accent}" stroke-width="6"
                stroke-linecap="round"/>`;
    }

    return `
        <circle r="151" fill="none"
            stroke="${primary}" stroke-width="5"/>
        <path d="M-35 -158 H35 M-35 158 H35"
            stroke="${accent}" stroke-width="6"
            stroke-linecap="round"/>`;
}

function createLogo(name, type, shape, palette, variant) {
    const [primary, secondary, accent] = palette;

    const category = categoryOf(type + ' ' + name);
    const symbol = symbolFor(
        category,
        primary,
        secondary,
        accent
    );

    const letters = [...name.trim()];

    const nameSize = letters.length > 30 ? 27 :
        letters.length > 22 ? 33 :
        letters.length > 14 ? 42 : 54;

    const typeSize = [...type].length > 30 ? 17 : 21;

    const background = variant === 1
        ? '#FCFAF5'
        : variant === 3
            ? '#111827'
            : '#FFFFFF';

    const textColor = variant === 3
        ? '#FFFFFF'
        : secondary;

    let artwork = '';

    if (variant === 0) {
        // Style 1: signature — unchanged.
        artwork = `
            <g transform="translate(384 270)">
                ${frameFor(shape, primary)}
                ${symbol}
            </g>

            <path d="M266 428 H502"
                stroke="${primary}"
                stroke-width="3"/>

            ${textElement({
                y: 510,
                value: name,
                size: nameSize,
                color: textColor,
                weight: 800
            })}

            ${textElement({
                y: 559,
                value: type,
                size: typeSize,
                color: primary,
                weight: 500
            })}`;
    } else if (variant === 1) {
        // Style 2: luxury seal — unchanged.
        artwork = `
            <circle cx="384" cy="292" r="172"
                fill="none"
                stroke="${primary}"
                stroke-width="3"/>

            <circle cx="384" cy="292" r="159"
                fill="none"
                stroke="${primary}"
                stroke-width="1"/>

            <g transform="translate(384 245) scale(0.74)">
                ${symbol}
            </g>

            ${textElement({
                y: 392,
                value: name,
                size: Math.min(nameSize, 37),
                color: secondary,
                weight: 800
            })}

            ${textElement({
                y: 432,
                value: type,
                size: 18,
                color: primary,
                weight: 500
            })}

            <path d="M384 105 L392 120
                L384 135 L376 120Z"
                fill="${accent}"/>`;
    } else if (variant === 2) {
        // Style 3: modern minimal emblem.
        // No horizontal advertising card or side-by-side layout.
        artwork = `
            <g transform="translate(384 274)">
                ${modernFrame(shape, primary, accent)}
                <g transform="scale(1.04)">
                    ${symbol}
                </g>
            </g>

            <path d="M315 461 H453"
                fill="none" stroke="${accent}"
                stroke-width="4" stroke-linecap="round"/>

            ${textElement({
                y: 531,
                value: name,
                size: Math.min(nameSize, 49),
                color: secondary,
                weight: 800
            })}

            ${textElement({
                y: 578,
                value: type,
                size: typeSize,
                color: primary,
                weight: 500
            })}

            <circle cx="294" cy="568" r="3.5"
                fill="${accent}"/>
            <circle cx="474" cy="568" r="3.5"
                fill="${accent}"/>`;
    } else {
        // Style 4: premium heritage mark.
        // Full occupation symbol instead of a single initial.
        artwork = `
            <defs>
                <linearGradient id="premiumMark" x1="0" y1="0"
                    x2="1" y2="1">
                    <stop offset="0%" stop-color="${primary}"/>
                    <stop offset="100%" stop-color="${accent}"/>
                </linearGradient>
            </defs>

            <circle cx="384" cy="274" r="169"
                fill="none"
                stroke="url(#premiumMark)"
                stroke-width="3"/>

            <circle cx="384" cy="274" r="155"
                fill="none"
                stroke="${primary}"
                stroke-width="1"
                opacity="0.55"/>

            <path d="M384 91 L391 105 L384 119
                L377 105Z"
                fill="${accent}"/>

            <path d="M384 429 L391 443 L384 457
                L377 443Z"
                fill="${accent}"/>

            <circle cx="215" cy="274" r="4"
                fill="${primary}"/>
            <circle cx="553" cy="274" r="4"
                fill="${primary}"/>

            <g transform="translate(384 274) scale(1.13)">
                ${symbol}
            </g>

            <path d="M260 485 H335 M433 485 H508"
                fill="none" stroke="${primary}"
                stroke-width="2.5"/>

            <path d="M384 476 L393 485 L384 494
                L375 485Z"
                fill="${accent}"/>

            ${textElement({
                y: 559,
                value: name,
                size: Math.min(nameSize, 49),
                color: textColor,
                weight: 800
            })}

            ${textElement({
                y: 611,
                value: type,
                size: typeSize,
                color: primary,
                weight: 500
            })}

            <path d="M322 638 H446"
                fill="none" stroke="${accent}"
                stroke-width="2"
                stroke-linecap="round"/>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg"
        width="768"
        height="768"
        viewBox="0 0 768 768"
        role="img"
        aria-label="${escapeXml(name)}">
        <rect width="768" height="768"
            fill="${background}"/>
        ${artwork}
    </svg>`;
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

        const {
            data: profile,
            error: profileError
        } = await supabase
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
            Boolean(profile.subscription_end_date) &&
            new Date(
                profile.subscription_end_date
            ).getTime() > Date.now();

        // Keep the existing subscription rules.
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

        const category = categoryOf(type + ' ' + name);
        const palette = getPalette(color, category);

        const logos = Array.from(
            { length: 4 },
            (_, index) => createLogo(
                name,
                type,
                safeShape,
                palette,
                index
            )
        );

        // Keep the original Pro quota update.
        if (!isAdmin && plan === 'pro') {
            const {
                data: updated,
                error: updateError
            } = await supabase
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
            error?.message || error
        );

        return res.status(500).json({
            success: false,
            error: 'خطا در ساخت لوگو. دوباره تلاش کنید.'
        });
    }
}
