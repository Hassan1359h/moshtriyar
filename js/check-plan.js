// 🎯 چک‌کننده انقضای پلن — برای همه صفحات محافظت‌شده
import { supabase } from './supabase.js';

export async function checkPlanGuard() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // اگه لاگین نیست → برو لاگین
        if (!session) {
            window.location.replace('login.html');
            return false;
        }
        
        // پروفایل کاربر رو بگیر
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan, subscription_end_date')
            .eq('id', session.user.id)
            .maybeSingle();
        
        if (!profile) {
            console.warn('Profile not found');
            return true; // اجازه ادامه بده (تا کار خراب نشه)
        }
        
        // ادمین همیشه دسترسی داره
        if (profile.plan === 'admin') {
            return true;
        }
        
        // چک تاریخ انقضا
        const expiresAt = profile.subscription_end_date;
        if (expiresAt && new Date(expiresAt) < new Date()) {
            window.location.replace('locked.html');
            return false;
        }
        
        return true;
        
    } catch (err) {
        console.error('Plan check error:', err);
        return true; // در صورت خطا، اجازه ادامه بده
    }
}
