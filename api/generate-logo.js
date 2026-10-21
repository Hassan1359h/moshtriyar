
import { createClient } from '@supabase/supabase-js';

const palettes = {
    blue: ['#2563eb', '#0f172a'],
    green: ['#059669', '#064e3b'],
    gold: ['#b8860b', '#292524'],
    purple: ['#7c3aed', '#312e81'],
    red: ['#dc2626', '#450a0a'],
    black: ['#171717', '#525252']
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
    let h = 2166136261;
    for (const char of text) {
        h ^= char.codePointAt(0);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function rng(seed) {
    let state = seed || 1;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function symbolFor(type, color, variant, random) {
    const t = type.toLowerCase();

    if (/کافه|قهوه|رستوران|coffee|cafe|food/.test(t)) {
        if (variant === 0) return `
          <path d="M-35 -30 H27 V15 Q27 38 0 38 Q-35 38 -35 15Z"
            fill="none" stroke="${color}" stroke-width="9"/>
          <path d="M27 -18 H39 Q58 -18 52 3 Q48 16 29 14"
            fill="none" stroke="${color}" stroke-width="8"/>
          <path d="M-28 49 H35 M-12 -45 Q-22 -57 -11 -67 M12 -45 Q2 -57 13 -67"
            fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`;
        return `
          <path d="M0 -58 C-12 -36 -42 -20 -42 5 A42 42 0 0 0 42 5 C42 -20 12 -36 0 -58Z"
            fill="${color}"/>
          <path d="M-17 6 Q0 -12 17 6 Q0 24 -17 6Z" fill="#fff"/>`;
    }

    if (/زیبایی|آرایش|گل|beauty|salon|flower/.test(t)) {
        if (variant === 1) return Array.from({ length: 8 }, (_, i) =>
            `<ellipse cx="0" cy="-27" rx="12" ry="27"
              fill="${color}" transform="rotate(${i * 45})"/>`
        ).join('') + `<circle r="11" fill="#fff"/>`;
        return `
          <path d="M0 -49 C-39 -70 -49 -31 -15 -8 C-52 -18 -56 23 -10 18
          C-12 57 19 57 14 18 C55 29 60 -10 19 -12 C49 -48 18 -70 0 -49Z"
          fill="${color}"/>
          <circle r="9" fill="#fff"/>`;
    }

    if (/فروشگاه|خرید|shop|store|لباس/.test(t)) {
        if (variant === 2) return `
          <path d="M-43 -20 L-23 -42 H23 L43 -20 V43 H-43Z"
            fill="${color}"/>
          <path d="M-19 -20 V-29 A19 19 0 0 1 19 -29 V-20"
            fill="none" stroke="#fff" stroke-width="7"/>`;
        return `
          <path d="M-48 -5 L0 -45 L48 -5 L35 43 H-35Z"
            fill="none" stroke="${color}" stroke-width="8" stroke-linejoin="round"/>
          <path d="M-14 43 V10 H14 V43" fill="${color}"/>`;
    }

    if (/املاک|ساختمان|خانه|realestate|home/.test(t)) {
        return `
          <path d="M-50 -4 L0 -48 L50 -4 V44 H-50Z"
            fill="${variant === 1 ? color : 'none'}"
            stroke="${color}" stroke-width="8" stroke-linejoin="round"/>
          <path d="M-12 44 V9 H12 V44" stroke="${variant === 1 ? '#fff' : color}"
            stroke-width="7" fill="none"/>`;
    }

    if (/فناوری|نرم افزار|نرم‌افزار|هوش|مشتری|tech|software|crm/.test(t)) {
        if (variant === 3) return `
          <path d="M-40 -30 L0 -52 L40 -30 L40 15 L0 43 L-40 15Z"
            fill="none" stroke="${color}" stroke-width="7"/>
          <circle cx="-20" cy="-8" r="7" fill="${color}"/>
          <circle cx="20" cy="-8" r="7" fill="${color}"/>
          <circle cx="0" cy="19" r="7" fill="${color}"/>
          <path d="M-13 -5 L-3 12 M13 -5 L3 12 M-13 -8 H13"
            stroke="${color}" stroke-width="5"/>`;
        return `
          <circle cx="-23" cy="-20" r="13" fill="${color}"/>
          <circle cx="23" cy="-20" r="13" fill="${color}"/>
          <circle cy="24" r="13" fill="${color}"/>
          <path d="M-10 -20 H10 M-17 -8 L-5 12 M17 -8 L5 12"
            stroke="${color}" stroke-width="7" stroke-linecap="round"/>`;
    }

    const points = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI * 2 * i / 6) - Math.PI / 2;
        const radius = 35 + Math.round(random() * 22);
        return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
    }).join(' ');

    if (variant === 0) return `
      <polygon points="${points}" fill="none" stroke="${color}" stroke-width="8"/>
      <circle r="14" fill="${color}"/>`;

    if (variant === 1) return `
      <path d="M0 -56 L15 -17 L55 0 L15 17 L0 56 L-15 17 L-55 0 L-15 -17Z"
        fill="${color}"/>`;

    if (variant === 2) return `
      <circle r="48" fill="none" stroke="${color}" stroke-width="7"/>
      <path d="M-25 0 L-7 20 L29 -23" fill="none"
        stroke="${color}" stroke-width="9" stroke-linecap="round"/>`;

    return `
      <path d="M0 -54 C58 -54 58 0 0 54 C-58 0 -58 -54 0 -54Z"
        fill="${color}"/>
      <circle r="12" fill="#fff"/>`;
}

function createLogo(name, type, shape, colors, variant, seed) {
    const [primary, dark] = colors;
    const random = rng(seed + variant * 7919);
    const safeName = escapeXml(name);
    const safeType = escapeXml(type);

    const frames = [
        `<circle r="91" fill="none" stroke="${primary}" stroke-width="3"/>`,
        `<rect x="-91" y="-91" width="182" height="182" rx="24"
          fill="none" stroke="${primary}" stroke-width="4"/>`,
        `<path d="M0 -102 L88 -51 L88 51 L0 102 L-88 51 L-88 -51Z"
          fill="none" stroke="${primary}" stroke-width="4"/>`,
        ''
    ];

    const frame = shape === 'abstract' ? '' :
        shape === 'square' ? frames[1] :
        shape === 'rectangle' ? `<rect x="-108" y="-76" width="216" height="152"
          rx="22" fill="none" stroke="${primary}" stroke-width="4"/>` :
        variant === 0 ? frames[0] : frames[variant];

    const symbol = symbolFor(type, primary, variant, random);
    const fontSize = name.length > 22 ? 27 : name.length > 13 ? 35 : 43;
    const rotation = variant === 2 ? -8 : variant === 3 ? 8 : 0;

    const decorations = [
        `<circle cx="-112" cy="-25" r="4" fill="${primary}"/>
         <circle cx="112" cy="25" r="4" fill="${primary}"/>`,
        `<path d="M-122 0 H-98 M98 0 H122" stroke="${primary}" stroke-width="4"/>`,
        `<path d="M-95 -80 L-85 -70 M95 80 L85 70" stroke="${primary}" stroke-width="5"/>`,
        ''
    ][variant];

    return `<svg xmlns="http://www.w3.org/2000/svg"
      width="768" height="768" viewBox="0 0 768 768">
      <rect width="768" height="768" fill="#ffffff"/>
      <g transform="translate(384 286)">
        ${frame}
        ${decorations}
        <g transform="rotate(${rotation})">${symbol}</g>
      </g>
      <path d="M300 452 H468" stroke="${primary}" stroke-width="${variant + 1}"
        stroke-linecap="round"/>
      <text x="384" y="515" text-anchor="middle" direction="rtl"
        font-family="Vazirmatn,Tahoma,sans-serif" font-size="${fontSize}"
        font-weight="800" fill="${dark}">${safeName}</text>
      <text x="384" y="557" text-anchor="middle" direction="rtl"
        font-family="Vazirmatn,Tahoma,sans-serif" font-size="19"
        fill="${primary}">${safeType}</text>
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

        const { data: { user }, error: authError } =
            await supabase.auth.getUser(authorization.slice(7).trim());

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
        const active = profile.subscription_end_date &&
            new Date(profile.subscription_end_date).getTime() > Date.now();

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

        if (typeof businessName !== 'string' ||
            typeof businessType !== 'string' ||
            !businessName.trim() || !businessType.trim() ||
            businessName.trim().length > 60 ||
            businessType.trim().length > 60) {
            return res.status(400).json({
                success: false,
                error: 'نام و نوع کسب‌وکار معتبر وارد کنید.'
            });
        }

        const name = businessName.trim();
        const type = businessType.trim();
        const allowedShapes = ['circle', 'square', 'rectangle', 'abstract'];
        const safeShape = allowedShapes.includes(shape) ? shape : 'circle';
        const colors = palettes[chooseColor(color)];
        const seed = hash(`${name}|${type}|${color}`);

        const logos = Array.from({ length: 4 }, (_, index) =>
            createLogo(name, type, safeShape, colors, index, seed)
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
        console.error('Logo generation error:', error?.message || error);

        return res.status(500).json({
            success: false,
            error: 'خطا در ساخت لوگو. دوباره تلاش کنید.'
        });
    }
}
