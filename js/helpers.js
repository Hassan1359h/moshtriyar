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

