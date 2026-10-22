
import { createClient } from '@supabase/supabase-js';

/*
 * Moshtriyar Logo Studio
 * Free rule-based SVG logo generator
 * Four different designs compatible with dashboard.html
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

/*
 * Original symbols used by designs 1 and 2.
 */
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

/*
 * New independent geometric symbol for design 3.
 */
function geometricSymbol(category, primary, secondary, accent) {
    const outline = `fill="none" stroke="${primary}"
        stroke-width="9" stroke-linecap="round"
        stroke-linejoin="round"`;

    switch (category) {
        case 'jewelry':
            return `
                <path d="M-106 -26 L-61 -82 H61 L106 -26
                    L0 94Z" ${outline}/>
                <path d="M-106 -26 H106
                    M-61 -82 L-30 -26 L0 94
                    M61 -82 L30 -26 L0 94"
                    fill="none" stroke="${primary}"
                    stroke-width="7" stroke-linejoin="round"/>
                <path d="M-30 -26 H30 L0 94Z"
                    fill="${secondary}"/>
                <path d="M-61 -82 H61 L30 -26 H-30Z"
                    fill="${accent}"/>
                <path d="M0 -116 V-99 M-9 -108 H9"
                    stroke="${accent}" stroke-width="5"
                    stroke-linecap="round"/>`;

        case 'beauty':
            return `
                <path d="M0 91 C-86 34 -84 -31 -26 -37
                    C-15 -73 -3 -91 0 -98
                    C3 -91 15 -73 26 -37
                    C84 -31 86 34 0 91Z" ${outline}/>
                <path d="M0 78 Q-39 1 0 -75
                    Q39 1 0 78Z" fill="${secondary}"/>
                <path d="M-67 5 Q-33 8 -12 43
                    M67 5 Q33 8 12 43"
                    fill="none" stroke="${accent}"
                    stroke-width="6" stroke-linecap="round"/>`;

        case 'food':
            return `
                <path d="M0 -96 C-17 -53 -71 -24 -71 27
                    A71 71 0 0 0 71 27
                    C71 -24 17 -53 0 -96Z" ${outline}/>
                <path d="M-38 22 Q0 -28 38 22
                    Q0 78 -38 22Z" fill="${secondary}"/>
                <path d="M0 -4 Q-18 24 0 52"
                    fill="none" stroke="${accent}"
                    stroke-width="7" stroke-linecap="round"/>`;

        case 'fashion':
            return `
                <path d="M-65 -65 L-26 -91
                    Q0 -45 26 -91 L65 -65
                    L94 -4 L57 14 L42 -14
                    V91 H-42 V-14 L-57 14
                    L-94 -4Z" ${outline}/>
                <path d="M-26 -91 Q0 -20 26 -91"
                    fill="none" stroke="${accent}"
                    stroke-width="7"/>
                <path d="M-42 46 H42 V91 H-42Z"
                    fill="${secondary}"/>`;

        case 'technology':
            return `
                <path d="M-77 -66 H31 L77 -20
                    V66 H-31 L-77 20Z" ${outline}/>
                <path d="M-77 -20 H-18 V-66
                    M18 66 V20 H77" ${outline}/>
                <circle cx="-18" cy="-20" r="13"
                    fill="${secondary}"/>
                <circle cx="18" cy="20" r="13"
                    fill="${accent}"/>
                <path d="M-5 -7 L5 7"
                    stroke="${primary}" stroke-width="9"/>`;

        case 'property':
            return `
                <path d="M-96 -7 L0 -87 L96 -7
                    M-70 -26 V84 H70 V-26" ${outline}/>
                <path d="M-15 84 V12 H22 V84"
                    fill="${secondary}"/>
                <path d="M-45 5 H-26 V27 H-45
                    M35 5 H54 V27 H35"
                    fill="${accent}"/>`;

        case 'medical':
            return `
                <path d="M-27 -88 H27 V-27 H88
                    V27 H27 V88 H-27 V27
                    H-88 V-27 H-27Z" ${outline}/>
                <path d="M-67 4 H-33 L-15 -22
                    L4 32 L24 -11 L38 4 H67"
                    fill="none" stroke="${secondary}"
                    stroke-width="8" stroke-linejoin="round"
                    stroke-linecap="round"/>
                <circle cx="4" cy="32" r="5"
                    fill="${accent}"/>`;

        case 'education':
            return `
                <path d="M-91 -30 L0 -77 L91 -30
                    L0 17Z" ${outline}/>
                <path d="M-57 0 V46 Q0 82 57 46 V0"
                    fill="none" stroke="${secondary}"
                    stroke-width="9" stroke-linecap="round"/>
                <path d="M91 -30 V43"
                    stroke="${accent}" stroke-width="7"/>
                <circle cx="91" cy="49" r="8"
                    fill="${accent}"/>`;

        case 'fitness':
            return `
                <path d="M-102 -38 V38
                    M-75 -58 V58 M-46 0 H46
                    M75 -58 V58 M102 -38 V38"
                    fill="none" stroke="${primary}"
                    stroke-width="17" stroke-linecap="round"/>
                <path d="M-46 0 H46"
                    stroke="${secondary}" stroke-width="11"/>
                <circle r="8" fill="${accent}"/>`;

        case 'automotive':
            return `
                <path d="M-102 32 L-69 -28
                    Q0 -68 69 -28 L102 32
                    V56 H-102Z" ${outline}/>
                <path d="M-64 -24 Q0 -47 64 -24
                    L79 12 H-79Z" fill="${secondary}"/>
                <circle cx="-62" cy="51" r="12"
                    fill="${accent}"/>
                <circle cx="62" cy="51" r="12"
                    fill="${accent}"/>`;

        case 'legal':
            return `
                <path d="M0 -95 V83 M-78 -48 H78" ${outline}/>
                <path d="M-78 -48 L-105 22 H-51Z
                    M78 -48 L51 22 H105Z"
                    fill="none" stroke="${secondary}"
                    stroke-width="8" stroke-linejoin="round"/>
                <path d="M-46 83 H46 M-61 96 H61" ${outline}/>
                <circle cy="-95" r="9" fill="${accent}"/>`;

        default:
            return `
                <path d="M0 -104 L28 -28 L104 0
                    L28 28 L0 104 L-28 28
                    L-104 0 L-28 -28Z" ${outline}/>
                <path d="M0 -54 L15 -15 L54 0
                    L15 15 L0 54 L-15 15
                    L-54 0 L-15 -15Z"
                    fill="${secondary}"/>
                <circle r="11" fill="${accent}"/>`;
    }
}

/*
 * Small occupation-specific ornaments for design 4.
 * The business name remains the main part of the wordmark.
 */
function wordmarkAccent(category, primary, accent) {
    switch (category) {
        case 'jewelry':
            return `
                <path d="M-39 -7 L-20 -30 H20 L39 -7
                    L0 33Z"
                    fill="none" stroke="${primary}"
                    stroke-width="5" stroke-linejoin="round"/>
                <path d="M-39 -7 H39 M-20 -30 L-10 -7
                    L0 33 L10 -7 L20 -30"
                    fill="none" stroke="${accent}"
                    stroke-width="3"/>`;

        case 'beauty':
            return `
                <path d="M0 30 Q-42 5 -24 -21
                    Q-8 -35 0 -10
                    Q8 -35 24 -21 Q42 5 0 30Z"
                    fill="none" stroke="${primary}"
                    stroke-width="5"/>
                <path d="M0 26 V-25"
                    stroke="${accent}" stroke-width="4"/>`;

        case 'food':
            return `
                <path d="M0 -32 C-9 -12 -29 -2 -29 13
                    A29 29 0 0 0 29 13
                    C29 -2 9 -12 0 -32Z"
                    fill="none" stroke="${primary}"
                    stroke-width="5"/>
                <path d="M-11 13 Q0 -3 11 13
                    Q0 27 -11 13Z"
                    fill="${accent}"/>`;

        case 'fashion':
            return `
                <path d="M-29 -19 L-10 -32
                    Q0 -12 10 -32 L29 -19
                    L37 4 L20 11 L15 2
                    V30 H-15 V2 L-20 11
                    L-37 4Z"
                    fill="none" stroke="${primary}"
                    stroke-width="5" stroke-linejoin="round"/>`;

        case 'technology':
            return `
                <path d="M0 -32 L28 -16 V16
                    L0 32 L-28 16 V-16Z"
                    fill="none" stroke="${primary}"
                    stroke-width="5"/>
                <circle cx="-11" cy="-7" r="5"
                    fill="${accent}"/>
                <circle cx="11" cy="8" r="5"
                    fill="${accent}"/>
                <path d="M-7 -3 L7 4"
                    stroke="${primary}" stroke-width="4"/>`;

        case 'property':
            return `
                <path d="M-34 0 L0 -29 L34 0
                    M-25 -7 V29 H25 V-7
                    M-7 29 V7 H8 V29"
                    fill="none" stroke="${primary}"
                    stroke-width="5" stroke-linejoin="round"/>`;

        case 'medical':
            return `
                <path d="M-10 -30 H10 V-10 H30
                    V10 H10 V30 H-10 V10
                    H-30 V-10 H-10Z"
                    fill="${primary}"/>
                <path d="M-22 1 H-9 L-2 -8
                    L6 11 L12 1 H22"
                    fill="none" stroke="${accent}"
                    stroke-width="3"/>`;

        case 'education':
            return `
                <path d="M-34 -9 L0 -27 L34 -9
                    L0 9Z"
                    fill="none" stroke="${primary}"
                    stroke-width="5"/>
                <path d="M-20 2 V17 Q0 31 20 17 V2"
                    fill="none" stroke="${accent}"
                    stroke-width="5"/>`;

        case 'fitness':
            return `
                <path d="M-34 -15 V15 M-23 -23 V23
                    M-16 0 H16 M23 -23 V23
                    M34 -15 V15"
                    fill="none" stroke="${primary}"
                    stroke-width="7" stroke-linecap="round"/>`;

        case 'automotive':
            return `
                <path d="M-34 9 L-23 -13
                    Q0 -28 23 -13 L34 9
                    V22 H-34Z"
                    fill="none" stroke="${primary}"
                    stroke-width="5" stroke-linejoin="round"/>
                <circle cx="-20" cy="20" r="5"
                    fill="${accent}"/>
                <circle cx="20" cy="20" r="5"
                    fill="${accent}"/>`;

        case 'legal':
            return `
                <path d="M0 -32 V29 M-27 -17 H27
                    M-27 -17 L-36 9 H-18Z
                    M27 -17 L18 9 H36Z
                    M-17 29 H17"
                    fill="none" stroke="${primary}"
                    stroke-width="5" stroke-linejoin="round"/>`;

        default:
            return `
                <path d="M0 -34 L10 -10 L34 0
                    L10 10 L0 34 L-10 10
                    L-34 0 L-10 -10Z"
                    fill="${primary}"/>
                <circle r="7" fill="${accent}"/>`;
    }
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
        // DESIGN 1: Original signature.
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
        // DESIGN 2: Original luxury seal.
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
        // DESIGN 3: Independent minimal geometric symbol.
        const geometric = geometricSymbol(
            category,
            primary,
            secondary,
            accent
        );

        artwork = `
            <g transform="translate(384 272) scale(1.42)">
                ${geometric}
            </g>

            <path d="M359 449 H409"
                fill="none"
                stroke="${accent}"
                stroke-width="5"
                stroke-linecap="round"/>

            ${textElement({
                y: 532,
                value: name,
                size: Math.min(nameSize, 53),
                color: secondary,
                weight: 800
            })}

            ${textElement({
                y: 583,
                value: type,
                size: typeSize,
                color: primary,
                weight: 500
            })}`;

    } else {
        // DESIGN 4: Luxury Persian typography.
        const ornament = wordmarkAccent(
            category,
            primary,
            accent
        );

        const wordmarkSize =
            letters.length > 36 ? 32 :
            letters.length > 28 ? 39 :
            letters.length > 20 ? 47 :
            letters.length > 13 ? 59 : 76;

        const smallTypeSize =
            [...type].length > 34 ? 18 :
            [...type].length > 22 ? 21 : 25;

        artwork = `
            <g transform="translate(384 236) scale(1.18)">
                ${ornament}
            </g>

            <path d="M286 306 H344
                M424 306 H482"
                fill="none"
                stroke="${primary}"
                stroke-width="2.5"
                stroke-linecap="round"/>

            <path d="M384 299 L391 306
                L384 313 L377 306Z"
                fill="${accent}"/>

            ${textElement({
                y: 419,
                value: name,
                size: wordmarkSize,
                color: '#FFFFFF',
                weight: 900
            })}

            <path d="M229 458 H539"
                fill="none"
                stroke="${primary}"
                stroke-width="2.5"
                stroke-linecap="round"/>

            <path d="M369 458 H399"
                stroke="${accent}"
                stroke-width="6"
                stroke-linecap="round"/>

            ${textElement({
                y: 515,
                value: type,
                size: smallTypeSize,
                color: primary,
                weight: 600
            })}

            <path d="M331 558 H437"
                fill="none"
                stroke="${accent}"
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

/*
 * Existing authentication, subscription and quota rules.
 */
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
