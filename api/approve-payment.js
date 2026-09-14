const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        // Server configuration
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return res.status(500).json({
                success: false,
                error: 'Supabase server configuration is missing'
            });
        }

        // Authorization
        const authHeader = req.headers.authorization || '';

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authorization required'
            });
        }

        const accessToken = authHeader
            .replace('Bearer ', '')
            .trim();

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'Invalid authorization token'
            });
        }

        const supabaseAdmin = createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Verify current user
        const {
            data: {
                user
            },
            error: userError
        } = await supabaseAdmin.auth.getUser(accessToken);

        if (userError || !user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        // Check admin permission
        const adminEmails = (process.env.ADMIN_EMAILS || '')
            .split(',')
            .map(email => email.trim().toLowerCase())
            .filter(Boolean);

        const userEmail = (user.email || '').toLowerCase();

        const isAdminByEmail =
            adminEmails.length > 0 &&
            adminEmails.includes(userEmail);

        const isAdminByRole =
            user.user_metadata?.role === 'admin';

        if (!isAdminByEmail && !isAdminByRole) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        // Read payment ID
        const { paymentId } = req.body || {};

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                error: 'Payment ID is required'
            });
        }

        // Get payment
        const {
            data: payment,
            error: paymentError
        } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (paymentError || !payment) {
            return res.status(404).json({
                success: false,
                error: 'Payment not found'
            });
        }

        // Payment must still be pending
        if (payment.status !== 'pending') {
            return res.status(409).json({
                success: false,
                error: `Payment is already ${payment.status}`
            });
        }

        // Always use the user attached to the payment
        const userId = payment.user_id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'Payment has no user ID'
            });
        }

        // Determine subscription duration
        let days = Number(payment.days);

        if (!Number.isFinite(days) || days <= 0) {
            const planName = String(
                payment.plan_name || ''
            ).toLowerCase();

            let settingKey = 'pro_days';

            if (
                planName.includes('business') ||
                planName.includes('کسب') ||
                planName.includes('بیزنس')
            ) {
                settingKey = 'business_days';
            }

            const {
                data: setting,
                error: settingError
            } = await supabaseAdmin
                .from('settings')
                .select('value')
                .eq('key', settingKey)
                .maybeSingle();

            if (settingError) {
                return res.status(500).json({
                    success: false,
                    error: settingError.message
                });
            }

            days = Number(setting?.value);

            if (!Number.isFinite(days) || days <= 0) {
                days = 30;
            }
        }

        // Get user profile
        const {
            data: profile,
            error: profileError
        } = await supabaseAdmin
            .from('profiles')
            .select('subscription_end_date')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({
                success: false,
                error: 'User profile not found'
            });
        }

        // Extend existing subscription if still active
        const now = new Date();
        let startDate = now;

        if (profile.subscription_end_date) {
            const currentEnd = new Date(
                profile.subscription_end_date
            );

            if (
                !Number.isNaN(currentEnd.getTime()) &&
                currentEnd > now
            ) {
                startDate = currentEnd;
            }
        }

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days);

        // Update subscription
        const {
            error: updateProfileError
        } = await supabaseAdmin
            .from('profiles')
            .update({
                subscription_end_date: endDate.toISOString()
            })
            .eq('id', userId);

        if (updateProfileError) {
            return res.status(500).json({
                success: false,
                error: updateProfileError.message
            });
        }

        // Approve payment only if it is still pending
        const {
            data: approvedPayment,
            error: approveError
        } = await supabaseAdmin
            .from('payments')
            .update({
                status: 'approved'
            })
            .eq('id', paymentId)
            .eq('status', 'pending')
            .select('id, status')
            .maybeSingle();

        if (approveError) {
            return res.status(500).json({
                success: false,
                error: approveError.message
            });
        }

        if (!approvedPayment) {
            return res.status(409).json({
                success: false,
                error: 'Payment was already processed'
            });
        }

        return res.status(200).json({
            success: true,
            message: `اشتراک برای ${days} روز فعال شد.`,
            days: days,
            endDate: endDate.toISOString()
        });

    } catch (error) {
        console.error('Approve payment error:', error);

        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};
