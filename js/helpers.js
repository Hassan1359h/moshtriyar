// 🎯 کش برای سرعت
const BT_CACHE_KEY = 'moshtriyar_business_type';
const BT_TIME_KEY = 'moshtriyar_bt_time';
const BT_CACHE_DURATION = 5 * 60 * 1000; // 5 دقیقه

export function getCachedBusinessType() {
    try {
        const cached = localStorage.getItem(BT_CACHE_KEY);
        const cachedTime = parseInt(localStorage.getItem(BT_TIME_KEY) || '0');
        
        if (cached && (Date.now() - cachedTime) < BT_CACHE_DURATION) {
            return cached;
        }
        return null;
    } catch (e) {
        return null;
    }
}

export function setCachedBusinessType(type) {
    try {
        localStorage.setItem(BT_CACHE_KEY, type);
        localStorage.setItem(BT_TIME_KEY, Date.now().toString());
    } catch (e) {}
}

export function clearCachedBusinessType() {
    try {
        localStorage.removeItem(BT_CACHE_KEY);
        localStorage.removeItem(BT_TIME_KEY);
    } catch (e) {}
}

export async function loadBusinessType(supabase, userId) {
    // ۱. cache
    const cached = getCachedBusinessType();
    if (cached) return cached;
    
    // ۲. Supabase
    try {
        const { data } = await supabase
            .from('profiles')
            .select('business_type')
            .eq('id', userId)
            .maybeSingle();
        
        const type = data?.business_type || 'shop';
        setCachedBusinessType(type);
        return type;
    } catch (e) {
        return 'shop';
    }
}

// 🎯 تبدیل شمسی به میلادی
export function shamsiToGregorian(jy, jm, jd) {
    jy += 1595;
    let days = -355668 + (365 * jy) + (~~(jy / 33) * 8) + ~~(((jy % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    let gy = 400 * ~~(days / 146097);
    days %= 146097;
    if (days > 36524) {
        gy += 100 * ~~(--days / 36524);
        days %= 36524;
        if (days >= 365) days++;
    }
    gy += 4 * ~~(days / 1461);
    days %= 1461;
    if (days > 365) {
        gy += ~~((days - 1) / 365);
        days = (days - 1) % 365;
    }
    let gd = days + 1;
    const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm;
    for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
    return { gy, gm, gd };
}

// 🎯 چک کن که تاریخ شمسی گذشته یا نه
export function isShamsiPast(shamsiStr) {
    if (!shamsiStr) return false;
    try {
        const parts = shamsiStr.split('/').map(x => parseInt(x));
        if (parts.length !== 3) return false;
        const g = shamsiToGregorian(parts[0], parts[1], parts[2]);
        const due = new Date(g.gy, g.gm - 1, g.gd);
        return due < new Date();
    } catch (e) {
        return false;
    }
}
