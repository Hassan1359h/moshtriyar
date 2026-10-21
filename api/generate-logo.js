
import { createClient } from '@supabase/supabase-js';

const palettes = {
    blue: ['#2563eb', '#0f172a', '#dbeafe'],
    green: ['#059669', '#064e3b', '#d1fae5'],
    gold: ['#b8860b', '#292524', '#fef3c7'],
    purple: ['#7c3aed', '#312e81', '#ede9fe'],
    red: ['#dc2626', '#450a0a', '#fee2e2'],
    black: ['#171717', '#525252', '#e5e5e5']
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

    return 'blue';
}

function hash(text) {
    let result = 2166136261;

    for (const char of text) {
        result ^= char.codePointAt(0);
        result = Math.imul(result, 16777619);
    }

    return result >>> 0;
}

function getSymbol(type, color, variant) {
    const t = String(type).toLowerCase();
    const stroke = `stroke="${color}" stroke-width="8"
        stroke-linecap="round" stroke-linejoin="round"`;

    if (/کافه|قهوه|رستوران|coffee|cafe|food/.test(t)) {
        if (variant === 1) {
            return `
                <path d="M-36 -28 H22 V12 Q22 34 -3 34
                    Q-36 34 -36 12Z" fill="none" ${stroke}/>
                <path d="M22 -15 H36 Q53 -15 47 2
                    Q43 12 23 12" fill="none" ${stroke}/>
                <path d="M-35 46 H32 M-14 -42 Q-23 -53 -13 -64
                    M8 -42 Q-1 -53 9 -64"
                    fill="none" ${stroke}/>`;
        }

        return `
            <path d="M0 -54 C-14 -32 -39 -15 -39 8
                A39 39 0 0 0 39 8 C39 -15 14 -32 0 -54Z"
                fill="${color}"/>
            <path d="M-18 4 Q0 -18 18 4 Q0 23 -18 4Z"
                fill="#ffffff"/>`;
    }

    if (/زیبایی|آرایش|گل|beauty|salon|flower/.test(t)) {
        return Array.from({ length: 6 }, (_, i) => `
            <ellipse cx="0" cy="-26" rx="13" ry="26"
                fill="${color}" transform="rotate(${i * 60})"/>
        `).join('') + `
            <circle r="12" fill="#ffffff"/>
            <circle r="5" fill="${color}"/>`;
    }

    if (/فروشگاه|خرید|shop|store|لباس/.test(t)) {
        if (variant === 2) {
            return `
                <path d="M-40 -13 L-29 -39 H29 L40 -13
                    V39 H-40Z" fill="${color}"/>
                <path d="M-16 -15 V-25 A16 16 0 0 1 16 -25 V-15"
                    fill="none" stroke="#ffffff" stroke-width="7"/>`;
        }

        return `
            <path d="M-47 -5 L0 -45 L47 -5
                M-35 -14 V42 H35 V-14"
                fill="none" ${stroke}/>
            <path d="M-12 42 V12 H12 V42" fill="${color}"/>`;
    }

    if (/املاک|ساختمان|خانه|realestate|home/.test(t)) {
        return `
            <path d="M-48 -3 L0 -46 L48 -3"
                fill="none" ${stroke}/>
            <path d="M-37 -14 V42 H37 V-14"
                fill="none" ${stroke}/>
            <path d="M-11 42 V12 H11 V42" fill="${color}"/>
            <rect x="-27" y="-7" width="12" height="12"
                rx="2" fill="${color}"/>
            <rect x="15" y="-7" width="12" height="12"
                rx="2" fill="${color}"/>`;
    }

    if (/فناوری|نرم افزار|نرم‌افزار|هوش|مشتری|tech|software|crm/.test(t)) {
        return `
            <path d="M0 -43 L38 -22 L38 22
                L0 43 L-38 22 L-38 -22Z"
                fill="none" ${stroke}/>
            <circle cx="-19" cy="-7" r="7" fill="${color}"/>
            <circle cx="19" cy="-7" r="7" fill="${color}"/>
            <circle cy="21" r="7" fill="${color}"/>
            <path d="M-12 -7 H12 M-15 -1 L-4 15 M15 -1 L4 15"
                fill="none" ${stroke}/>`;
    }

    if (/پزشک|درمان|سلامت|medical|health|clinic/.test(t)) {
        return `
            <path d="M-13 -39 V-13 H-39 V13 H-13
                V39 H13 V13 H39 V-13 H13 V-39Z"
                fill="${color}"/>`;
    }

    return `
        <path d="M0 -47 L12 -14 L46 0 L12 14
            L0 47 L-12 14 L-46 0 L-12 -14Z"
            fill="${color}"/>
        <circle r="7" fill="#ffffff"/>`;
}

function getFrame(shape, color, variant) {
    if (shape === 'abstract') return '';

    if (variant === 1) {
        return `
            <circle r="88" fill="none"
                stroke="${color}" stroke-width="3"/>
            <circle r="76" fill="none"
                stroke="${color}" stroke-width="1.5"/>`;
    }

    if (variant === 2) {
        if (shape === 'square') {
            return `<rect x="-78" y="-78" width="156" height="156"
                rx="16" fill="none" stroke="${color}" stroke-width="5"/>`;
        }

        if (shape === 'rectangle') {
            return `<rect x="-96" y="-65" width="192" height="130"
                rx="18" fill="none" stroke="${color}" stroke-width="5"/>`;
        }

        return `<path d="M0 -94 L82 -47 L82 47 L0 94
            L-82 47 L-82 -47Z"
            fill="none" stroke="${color}" stroke-width="5"/>`;
    }

    if (shape === 'circle') {
        return `<circle r="72" fill="none"
            stroke="${color}" stroke-width="3"/>`;
    }

    if (shape === 'square') {
        return `<rect x="-69" y="-69" width="138" height="138"
            rx="18" fill="none" stroke="${color}" stroke-width="4"/>`;
    }

    if (shape === 'rectangle') {
        return `<rect x="-91" y="-59" width="182" height="118"
            rx="18" fill="none" stroke="${color}" stroke-width="4"/>`;
    }

    return '';
}

function createLogo(name, type, shape, colors, variant) {
    const [primary, dark, light] = colors;
    const safeName = escapeXml(name);
    const safeType = escapeXml(type);
    const symbol = getSymbol(type, primary, variant);
    const frame = getFrame(shape, primary, variant);
    const length = [...name].length;

    const fontSize = length > 28 ? 25 :
        length > 20 ? 30 :
        length > 13 ? 36 : 43;

    const background = variant === 1 ? '#fffdf8' : '#ffffff';

    let artwork;
    let nameY;
    let typeY;

    if (variant === 0) {
        artwork = `
            <g transform="translate(384 245)">
                ${frame}
                ${symbol}
            </g>
            <path d="M322 365 H446" stroke="${primary}"
                stroke-width="3" stroke-linecap="round"/>`;

        nameY = 433;
        typeY = 480;
    } else if (variant === 1) {
        artwork = `
            <circle cx="384" cy="246" r="112" fill="${light}"/>
            <g transform="translate(384 246)">
                ${frame}
                <g transform="scale(0.85)">${symbol}</g>
            </g>
            <path d="M266 391 H340 M428 391 H502"
                stroke="${primary}" stroke-width="2"/>
            <path d="M384 383 L391 391 L384 399 L377 391Z"
                fill="${primary}"/>`;

        nameY = 455;
        typeY = 501;
    } else if (variant === 2) {
        artwork = `
            <path d="M384 105 L521 246 L384 387 L247 246Z"
                fill="${light}"/>
            <g transform="translate(384 246)">
                ${frame}
                ${symbol}
            </g>
            <circle cx="263" cy="125" r="5" fill="${primary}"/>
            <circle cx="505" cy="125" r="5" fill="${primary}"/>`;

        nameY = 463;
        typeY = 509;
    } else {
        const initial = escapeXml([...name][0] || '?');

        artwork = `
            <circle cx="384" cy="218" r="91" fill="${primary}"/>
            <circle cx="384" cy="218" r="78"
                fill="none" stroke="#ffffff" stroke-width="2"/>
            <text x="384" y="248" text-anchor="middle"
                font-family="Vazirmatn,Tahoma,sans-serif"
                font-size="88" font-weight="800" fill="#ffffff">
                ${initial}
            </text>
            <path d="M272 350 H496" stroke="${primary}" stroke-width="2"/>
            <circle cx="260" cy="350" r="4" fill="${primary}"/>
            <circle cx="508" cy="350" r="4" fill="${primary}"/>`;

        nameY = 414;
        typeY = 462;
    }

    const typeFontSize = [...type].length > 25 ? 15 : 19;

    return `<svg xmlns="http://www.w3.org/2000/svg"
        width="768" height="768" viewBox="0 0 768 768">
        <rect width="768" height="768" fill="${background}"/>
        ${artwork}
        <text x="384" y="${nameY}" text-anchor="middle"
            direction="rtl"
            font-family="Vazirmatn,Tahoma,sans-serif"
            font-size="${fontSize}" font-weight="800"
            fill="${dark}">${safeName}</text>
        <text x="384" y="${typeY}" text-anchor="middle"
            direction="rtl"
            font-family="Vazirmatn,Tahoma,sans-serif"
            font-size="${typeFontSize}" font-weight="500"
            fill="${primary}">${safeType}</text>
        <text x="384" y="696" text-anchor="middle"
            font-family="Arial,sans-serif" font-size="12"
            letter-spacing="3" fill="${primary}" opacity="0.7">
            BRAND IDENTITY
        </text>
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

        if (!process.env.SUPABASE_URL ||
            !process.env.SUPABASE_SERVICE_ROLE_KEY) {
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
        } = await supabase.auth.getUser(authorization.slice(7).trim());

        if (authError || !user) {
            return res.status(401).json({
                success: false,
                error: 'نشست نامعتبر است.'
            });
        }

        const { data: profile, error: profileError } = await supabase
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

        const isAdmin = Boolean(process.env.ADMIN_USER_ID) &&
            user.id === process.env.ADMIN_USER_ID;
        const plan = profile.plan || 'free';
        const count = Number(profile.logo_count || 0);

        const active = Boolean(profile.subscription_end_date) &&
            new Date(profile.subscription_end_date).getTime() > Date.now();

        if (!isAdmin) {
            if (!active ||
                !['pro', 'business', 'vip_yearly'].includes(plan)) {
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

        if (typeof businessName !== 'string' ||
            typeof businessType !== 'string' ||
            !businessName.trim() ||
            !businessType.trim() ||
            businessName.trim().length > 60 ||
            businessType.trim().length > 60) {
            return res.status(400).json({
                success: false,
                error: 'نام و نوع کسب‌وکار معتبر وارد کنید.'
            });
        }

        const name = businessName.trim();
        const type = businessType.trim();
        const allowedShapes = [
            'circle', 'square', 'rectangle', 'abstract'
        ];
        const safeShape = allowedShapes.includes(shape) ? shape : 'circle';
        const colors = palettes[chooseColor(color)];

        const logos = Array.from({ length: 4 }, (_, index) =>
            createLogo(name, type, safeShape, colors, index)
        );

        if (!isAdmin && plan === 'pro') {
            const { data: updated, error: updateError } = await supabase
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
