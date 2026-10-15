
const { createClient } = require('@supabase/supabase-js');

const PRODUCTS = {
    moshtriyar_pro_30: {
        plan: 'pro',
        days: 30,
        amount: 490000
    },
    moshtriyar_business_30: {
        plan: 'business',
        days: 30,
        amount: 990000
    },
    moshtriyar_vip_yearly: {
        plan: 'vip_yearly',
        days: 365,
        amount: 9000000
    }
};

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceRoleKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY;
        const bazaarToken =
            process.env.BAZAAR_PISHKHAN_TOKEN;

        if (!supabaseUrl || !serviceRoleKey || !bazaarToken) {
            return res.status(500).json({
                success: false,
                error: 'Server configuration is incomplete'
            });
        }

        const authHeader = req.headers.authorization || '';
        const accessToken = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : '';

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const supabase = createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            }
        );

        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser(accessToken);

        if (authError || !user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid session'
            });
        }

        const { productId, purchaseToken, orderId } =
            req.body || {};

        const product = PRODUCTS[productId];

        if (
            !product ||
            typeof purchaseToken !== 'string' ||
            !purchaseToken.trim() ||
            purchaseToken.length > 4096
        ) {
            return res.status(400).json({
                success: false,
                error: 'Invalid purchase information'
            });
        }

        const existing = await supabase
            .from('bazaar_purchases')
            .select('user_id, product_id, status')
            .eq('purchase_token', purchaseToken)
            .maybeSingle();

        if (existing.error) {
            throw existing.error;
        }

        if (existing.data) {
            if (
                existing.data.user_id === user.id &&
                existing.data.product_id === productId &&
                existing.data.status === 'verified'
            ) {
                return res.status(200).json({
                    success: true,
                    alreadyVerified: true
                });
            }

            return res.status(409).json({
                success: false,
                error: 'Purchase token already registered'
            });
        }

        const bazaarUrl =
            'https://pardakht.cafebazaar.ir/devapi/v2/api/' +
            'applications/ir.moshtriyar.app/active-subscriptions/' +
            encodeURIComponent(purchaseToken) + '/';

        const bazaarResponse = await fetch(bazaarUrl, {
            method: 'GET',
            headers: {
                'CAFEBAZAAR-PISHKHAN-API-SECRET': bazaarToken,
                Accept: 'application/json'
            }
        });

        if (!bazaarResponse.ok) {
            console.error(
                'Bazaar verification failed:',
                bazaarResponse.status
            );

            return res.status(400).json({
                success: false,
                error: 'Bazaar could not verify this purchase'
            });
        }

        const bazaarData = await bazaarResponse.json();

        const verifiedPurchase = (
            bazaarData.subscriptions || []
        ).find(item =>
            item.sku === productId &&
            Number(item.validUntilTimestampMsec) > Date.now()
        );

        if (!verifiedPurchase) {
            return res.status(400).json({
                success: false,
                error: 'No valid matching subscription found'
            });
        }

        const expiresAt = new Date(
            Number(verifiedPurchase.validUntilTimestampMsec)
        ).toISOString();

        const { data: result, error: rpcError } =
            await supabase.rpc('verify_bazaar_purchase', {
                p_user_id: user.id,
                p_product_id: productId,
                p_purchase_token: purchaseToken,
                p_order_id: typeof orderId === 'string'
                    ? orderId.slice(0, 255)
                    : null,
                p_plan: product.plan,
                p_amount: product.amount,
                p_days: product.days,
                p_expires_at: expiresAt
            });

        if (rpcError) {
            console.error(
                'Purchase activation failed:',
                rpcError.message
            );

            return res.status(500).json({
                success: false,
                error: 'Purchase verified but activation failed'
            });
        }

        return res.status(200).json({
            success: true,
            result
        });
    } catch (error) {
        console.error(
            'Bazaar purchase verification error:',
            error.message
        );

        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
