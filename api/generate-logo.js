
import { createClient } from '@supabase/supabase-js';

const escapeXml = value => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const palettes = {
    blue: ['#2563eb', '#0f172a'],
    green: ['#059669', '#064e3b'],
    gold: ['#b8860b', '#292524'],
    purple: ['#7c3aed', '#312e81'],
    red: ['#dc2626', '#450a0a'],
    black: ['#171717', '#525252']
};

function chooseColor(input) {
    const value = String(input || '').toLowerCase();
    if (/سبز|green/.test(value)) return 'green';
    if (/طلایی|gold|زرد/.test(value)) return 'gold';
    if (/بنفش|purple/.test(value)) return 'purple';
    if (/قرمز|red/.test(value)) return 'red';
    if (/مشکی|سیاه|black/.test(value)) return 'black';
    return 'blue';
}

function getSymbol(type, primary) {
    const t = String(type).toLowerCase();

    if (/کافه|قهوه|رستوران|coffee|cafe|food/.test(t)) {
        return `<path d="M-48 -28 H35 V14 A42 42 0 0 1 -48 14Z"
            fill="none" stroke="${primary}" stroke-width="12"
            stroke-linejoin="round"/>
            <path d="M35 -20 H51 A24 24 0 0 1 51 28 H29"
            fill="none" stroke="${primary}" stroke-width="12"/>
            <path d="M-50 49 H48 M-23 -62 V-46 M7 -62 V-46"
            stroke="${primary}" stroke-width="10" stroke-linecap="round"/>`;
    }

    if (/زیبایی|آرایش|گل|beauty|salon|flower/.test(t)) {
        return Array.from({length: 6}, (_, i) =>
            `<ellipse cx="0" cy="-32" rx="17" ry="37"
            fill="${primary}" opacity=".85"
            transform="rotate(${i * 60})"/>`
        ).join('') +
        `<circle r="13" fill="white"/>`;
    }

    if (/فروشگاه|خرید|shop|store|لباس/.test(t)) {
        return `<path d="M-43 -20 H43 L36 53 H-36Z"
            fill="none" stroke="${primary}" stroke-width="12"
            stroke-linejoin="round"/>
            <path d="M-22 -17 V-33 A22 22 0 0 1 22 -33 V-17"
            fill="none" stroke="${primary}" stroke-width="12"
            stroke-linecap="round"/>`;
    }

    if (/نرم افزار|نرم‌افزار|فناوری|هوش|مشتری|tech|software|crm/.test(t)) {
        return `<circle cx="-28" cy="-22" r="16" fill="${primary}"/>
            <circle cx="30" cy="-22" r="16" fill="${primary}"/>
            <circle cx="0" cy="31" r="16" fill="${primary}"/>
            <path d="M-13 -22 H15 M-21 -8 L-7 17 M22 -8 L8 17"
            fill="none" stroke="${primary}" stroke-width="9"
            stroke-linecap="round"/>`;
    }

    if (/املاک|ساختمان|خانه|realestate|home/.test(t)) {
        return `<path d="M-52 -4 L0 -49 L52 -4 V49 H-52Z"
            fill="none" stroke="${primary}" stroke-width="12"
            stroke-linejoin="round"/>
            <path d="M-12 49 V7 H13 V49"
            fill="none" stroke="${primary}" stroke-width="10"/>`;
    }

    // نماد عمومی برای سایر کسب‌وکارها
    return `<path d="M0 -58 L49 -28 V28 L0 58 L-49 28 V-28Z"
        fill="none" stroke="${primary}" stroke-width="12"
        stroke-linejoin="round"/>
        <circle r="18" fill="${primary}"/>
        <path d="M0 -43 V-23 M0 23 V43 M-34 0 H-23 M23 0 H34"
        stroke="${primary}" stroke-width="7" stroke-linecap="round"/>`;
}

function createLogo(name, type, shape, colors, variant) {
    const [primary, dark] = colors;
    const symbol = getSymbol(type, primary);

    const frames = {
        circle: `<circle r="94" fill="none" stroke="${primary}" stroke-width="5"/>`,
        square: `<rect x="-94" y="-94" width="188" height="188"
            rx="19" fill="none" stroke="${primary}" stroke-width="5"/>`,
        rectangle: `<rect x="-110" y="-78" width="220" height="156"
            rx="20" fill="none" stroke="${primary}" stroke-width="5"/>`,
        abstract: ''
    };

    const frame = frames[shape] ?? frames.circle;

    const configurations = [
        { scale: 1, frame: true, line: false },
        { scale: 1.12, frame: false, line: true },
        { scale: .88, frame: true, line: true },
        { scale: 1.23, frame: false, line: false }
    ];

    const config = configurations[variant];
    const safeName = escapeXml(name);
    const fontSize = name.length > 22 ? 29 : name.length > 13 ? 37 : 46;

    return `<svg xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        width="768" height="768" viewBox="0 0 768 768">
        <rect width="768" height="768" fill="#ffffff"/>
        <g transform="translate(384 303)">
            ${config.frame ? frame : ''}
            <g transform="scale(${config.scale})">
                ${symbol}
            </g>
        </g>
        ${config.line ?
            `<path d="M300 458 H468" stroke="${primary}"
                stroke-width="4" stroke-linecap="round"/>` : ''}
        <text x="384" y="532"
            text-anchor="middle"
            direction="rtl"
            font-family="Vazirmatn,Tahoma,sans-serif"
            font-size="${fontSize}"
            font-weight="800"
            fill="${dark}">${safeName}</text>
        <text x="384" y="573"
            text-anchor="middle"
            direction="rtl"
            font-family="Vazirmatn,Tahoma,sans-serif"
            font-size="19"
            fill="${primary}">${escapeXml(type)}</text>
    </svg>`;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
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

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: { user }, error: authError } =
            await supabase.auth.getUser(
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

        const isAdmin = Boolean(process.env.ADMIN_USER_ID) &&
            user.id === process.env.ADMIN_USER_ID;

        const plan = profile.plan || 'free';
        const count = profile.logo_count || 0;

        const active = profile.subscription_end_date &&
            new Date(profile.subscription_end_date) > new Date();

        if (!isAdmin) {
            if (!active || !['pro', 'business', 'vip_yearly'].includes(plan)) {
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
            businessName.length > 60 ||
            businessType.length > 60
        ) {
            return res.status(400).json({
                success: false,
                error: 'نام و نوع کسب‌وکار معتبر وارد کنید.'
            });
        }

        const palette = palettes[chooseColor(color)];
        const allowedShapes = ['circle', 'square', 'rectangle', 'abstract'];
        const safeShape = allowedShapes.includes(shape) ? shape : 'circle';

        const logos = Array.from({length: 4}, (_, index) =>
            createLogo(
                businessName.trim(),
                businessType.trim(),
                safeShape,
                palette,
                index
            )
        );

        // ثبت یک نوبت تولید برای چهار طرح
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
        console.error('Logo generation error:', error);

        return res.status(500).json({
            success: false,
            error: 'خطا در ساخت لوگو. دوباره تلاش کنید.'
        });
    }
}
