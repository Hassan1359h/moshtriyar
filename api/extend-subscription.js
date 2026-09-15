import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase server settings are missing.');
        }

        const authHeader = req.headers.authorization || '';

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'ورود مدیر لازم است.'
            });
        }

        const accessToken = authHeader.replace('Bearer ', '').trim();

        const supabaseAdmin = createClient(
            supabaseUrl,
            serviceRoleKey
        );

        const {
            data: { user },
            error: userError
        } = await supabaseAdmin.auth.getUser(accessToken);

        if (userError || !user) {
            return res.status(401).json({
                success: false,
                error: 'جلسه ورود معتبر نیست.'
            });
        }

        const isAdmin =
            user.user_metadata?.role === 'admin' ||
            (process.env.ADMIN_EMAILS || '')
                .split(',')
                .map(x => x.trim().toLowerCase())
                .includes((user.email || '').toLowerCase());

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'دسترسی فقط برای مدیر سیستم مجاز است.'
            });
        }

        const { userId, days } = req.body || {};

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'شناسه مشتری ارسال نشده است.'
            });
        }

        const addDays = Number(days);

        if (!Number.isInteger(addDays) || addDays <= 0 || addDays > 3650) {
            return res.status(400).json({
                success: false,
                error: 'مدت اشتراک نامعتبر است.'
            });
        }

        const { data: profile, error: profileError } =
            await supabaseAdmin
                .from('profiles')
                .select('id,subscription_end_date')
                .eq('id', userId)
                .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'مشتری ویژه پیدا نشد.'
            });
        }

        const now = new Date();

        let baseDate = now;

        if (profile.subscription_end_date) {
            const existingEnd =
                new Date(profile.subscription_end_date);

            if (
                !Number.isNaN(existingEnd.getTime()) &&
                existingEnd > now
            ) {
                baseDate = existingEnd;
            }
        }

        const newEnd = new Date(baseDate);
        newEnd.setDate(newEnd.getDate() + addDays);

        const { error: updateError } =
            await supabaseAdmin
                .from('profiles')
                .update({
                    subscription_end_date: newEnd.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

        if (updateError) {
            throw updateError;
        }

        return res.status(200).json({
            success: true,
            message: `اشتراک ${addDays} روز تمدید شد.`,
            days: addDays,
            endDate: newEnd.toISOString()
        });

    } catch (error) {
        console.error('Extend subscription error:', error);

        return res.status(500).json({
            success: false,
            error: error.message || 'خطای سرور'
        });
    }
          }
