
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
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
            throw new Error('Supabase server configuration is missing');
        }

        const authHeader = req.headers.authorization || '';

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authorization required'
            });
        }

        const token = authHeader.slice(7).trim();

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

        const { data: { user }, error: authError } =
            await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid session'
            });
        }

        // بررسی دسترسی ادمین از سمت سرور
        const adminEmails = (process.env.ADMIN_EMAILS || '')
            .split(',')
            .map(email => email.trim().toLowerCase())
            .filter(Boolean);

        const isAdmin = adminEmails.includes(
            (user.email || '').toLowerCase()
        );

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const { paymentId } = req.body || {};

        if (
            typeof paymentId !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId)
        ) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment ID'
            });
        }

        // تأیید پرداخت و فعال‌سازی اشتراک در یک تراکنش
        const { data, error } = await supabaseAdmin.rpc(
            'approve_subscription_payment',
            { p_payment_id: paymentId }
        );

        if (error) {
            console.error('Approval RPC error:', error);

            return res.status(409).json({
                success: false,
                error: error.message
            });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('Approve payment error:', error);

        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};
