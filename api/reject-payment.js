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

        // Find payment
        const {
            data: payment,
            error: paymentFetchError
        } = await supabaseAdmin
            .from('payments')
            .select('id, status')
            .eq('id', paymentId)
            .single();

        if (paymentFetchError || !payment) {
            return res.status(404).json({
                success: false,
                error: 'Payment not found'
            });
        }

        // Only pending payments can be rejected
        if (payment.status !== 'pending') {
            return res.status(409).json({
                success: false,
                error: `Payment is already ${payment.status}`
            });
        }

        // Reject payment
        const {
            data: rejectedPayment,
            error: rejectError
        } = await supabaseAdmin
            .from('payments')
            .update({
                status: 'rejected'
            })
            .eq('id', paymentId)
            .eq('status', 'pending')
            .select('id, status')
            .maybeSingle();

        if (rejectError) {
            return res.status(500).json({
                success: false,
                error: rejectError.message
            });
        }

        if (!rejectedPayment) {
            return res.status(409).json({
                success: false,
                error: 'Payment was already processed'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'پرداخت رد شد.'
        });

    } catch (error) {
        console.error('Reject payment error:', error);

        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};
