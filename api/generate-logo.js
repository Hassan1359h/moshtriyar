import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'لطفاً وارد حساب خود شوید.' });
        }

        const supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // ۱. احراز هویت کاربر
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.slice(7).trim());
        if (userError || !user) {
            return res.status(401).json({ success: false, error: 'نشست شما منقضی شده است.' });
        }

        // ۲. بررسی وضعیت اشتراک و تعداد لوگوهای ساخته‌شده
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('plan, logo_count, subscription_end_date')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({ success: false, error: 'پروفایل کاربری یافت نشد.' });
        }

        const now = new Date();
        const isSubscriptionActive = profile.subscription_end_date && new Date(profile.subscription_end_date) > now;
        const plan = profile.plan || 'free'; 
        const logoCount = profile.logo_count || 0;

        // 👇👇 دور زدن محدودیت برای ادمین (ایمیل اصلاح شد) 👇👇
        const isAdminEmail = user.email === 'hahs12na@gmail.com';

        if (!isAdminEmail) {
            if (!isSubscriptionActive || plan === 'test' || plan === 'free' || plan === 'trial') {
                return res.status(403).json({ success: false, error: 'جهت ساخت لوگو، لطفاً اشتراک کسب‌وکار یا اشتراک سالیانه تهیه کنید.' });
            }

            if (plan === 'pro' && logoCount >= 5) {
                return res.status(403).json({ success: false, error: 'شما به سقف ۵ لوگوی مجاز در پلن حرفه‌ای رسیده‌اید. برای ساخت نامحدود، به پلن کسب‌وکار ارتقا دهید.' });
            }
        }

        // ۴. پردازش درخواست و ساخت لوگو
        const { businessType, businessName, shape, color, style } = req.body;
        if (!businessType || !businessName) {
            return res.status(400).json({ success: false, error: 'نام و نوع کسب و کار الزامی است.' });
        }
         
       // پرامپت ساده‌تر
      const prompt = `A professional minimal logo for a ${businessType} named "${businessName}". Flat vector design, clean lines, modern, ${shape} shape, ${color} color theme, solid white background.`;
      const encodedPrompt = encodeURIComponent(prompt);

      // 👇 حذف seed برای استفاده از کش (سرعت بالا) و اضافه کردن مدل استاندارد
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux`;

       const imageResponse = await fetch(imageUrl);

  // 👇 اگر سرویس اصلی جواب نداد، ارور بده
    if (!imageResponse.ok) {
    console.error('Pollinations API error:', imageResponse.status);
    throw new Error('سرور هوش مصنوعی موقتاً شلوغ است. لطفاً ۱۰ ثانیه دیگر دوباره تلاش کنید.');
}

const arrayBuffer = await imageResponse.arrayBuffer();

if (arrayBuffer.byteLength === 0) {
    throw new Error('تصویر دریافتی خالی است. دوباره تلاش کنید.');
}

const base64Image = Buffer.from(arrayBuffer).toString('base64');
const dataUrl = `data:image/jpeg;base64,${base64Image}`;
        // ۵. افزایش تعداد لوگو (فقط پلن حرفه‌ای و غیر ادمین)
        if (!isAdminEmail && plan === 'pro') {
            await supabaseAdmin
                .from('profiles')
                .update({ logo_count: logoCount + 1 })
                .eq('id', user.id);
        }

        return res.status(200).json({
            success: true,
            imageUrl: dataUrl,
            promptUsed: prompt
        });

    } catch (error) {
        console.error('Logo generation error:', error);
        return res.status(500).json({ success: false, error: error.message || 'خطا در تولید لوگو' });
    }
}
