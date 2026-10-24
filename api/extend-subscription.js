
import { createClient } from '@supabase/supabase-js';
import { createHmac, randomUUID } from 'node:crypto';

const PACKAGE_NAME = 'ir.moshtriyar.app';

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

function createDynamicPriceToken(productId, price, nonce) {
    const secret = process.env.BAZAAR_DYNAMIC_PRICE_SECRET;

    if (!secret) {
        throw new Error('Dynamic pricing secret is missing');
    }

    const encode = value =>
        Buffer.from(JSON.stringify(value)).toString('base64url');

    const header = encode({
        alg: 'HS256',
        typ: 'JWT'
    });

    const payload = encode({
        price: price * 10,
        package_name: PACKAGE_NAME,
        sku: productId,
        nonce,
        exp: Math.floor(Date.now() / 1000) + 300
    });

    const content = `${header}.${payload}`;

    const signature = createHmac('sha256', secret)
        .update(content)
        .digest('base64url');

    return `${content}.${signature}`;
}

export default async function handler(req, res) {
    console.log('[Bazaar diagnostic] API reached', {
  method: req.method,
  mode: req.query?.mode || null,
  time: new Date().toISOString()
});
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
            return res.status(500).json({
                success: false,
                error: 'Supabase settings are missing'
            });
        }

        const authHeader = req.headers.authorization || '';

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const supabaseAdmin = createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            }
        );

        const { data: { user }, error: userError } =
            await supabaseAdmin.auth.getUser(
                authHeader.slice(7).trim()
            );

        if (userError || !user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid session'
            });
        }

        const mode = req.query.mode;

        // صدور توکن تخفیف
        if (mode === 'discount') {
            const { productId, code } = req.body || {};
            const product = PRODUCTS[productId];

            if (
                !product ||
                typeof code !== 'string' ||
                !code.trim() ||
                code.length > 100
            ) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid discount request'
                });
            }

            const { data: discount, error: discountError } =
                await supabaseAdmin
                    .from('discount_codes')
                    .select('*')
                    .ilike('code', code.trim())
                    .maybeSingle();

            if (discountError) throw discountError;

            const now = Date.now();

            if (
                !discount ||
                discount.is_active !== true ||
                !discount.expires_at ||
                new Date(discount.expires_at).getTime() <= now ||
                !Number.isInteger(discount.max_uses) ||
                discount.used_count >= discount.max_uses ||
                (
                    discount.assigned_user_id &&
                    discount.assigned_user_id !== user.id
                ) ||
                !Array.isArray(discount.allowed_products) ||
                !discount.allowed_products.includes(productId) ||
                !Number.isInteger(discount.percent) ||
                discount.percent <= 0 ||
                discount.percent > 100
            ) {
                return res.status(400).json({
                    success: false,
                    error: 'Discount code is unavailable'
                });
            }

            const price = Math.round(
                product.amount * (100 - discount.percent) / 100
            );

            const nonce = randomUUID();
            const expiresAt = new Date(now + 300000).toISOString();

            const dynamicPriceToken = createDynamicPriceToken(
                productId,
                price,
                nonce
            );

            const { data: intent, error: intentError } =
                await supabaseAdmin
                    .from('discount_intents')
                    .insert({
                        discount_id: discount.id,
                        user_id: user.id,
                        product_id: productId,
                        nonce,
                        expires_at: expiresAt,
                        status: 'pending'
                    })
                    .select('id')
                    .single();

            if (intentError) throw intentError;

            return res.status(200).json({
                success: true,
                intentId: intent.id,
                productId,
                price,
                dynamicPriceToken
            });
        }

        // تأیید خرید کافه‌بازار
        if (mode === 'bazaar') {
            const bazaarToken = process.env.BAZAAR_PISHKHAN_TOKEN;

            if (!bazaarToken) {
                return res.status(500).json({
                    success: false,
                    error: 'Bazaar settings are missing'
                });
            }

            const {
                productId,
                purchaseToken,
                orderId,
                discountIntentId
            } = req.body || {};

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

            if (
                discountIntentId !== undefined &&
                (
                    typeof discountIntentId !== 'string' ||
                    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(discountIntentId)
                )
            ) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid discount intent'
                });
            }

            const existing = await supabaseAdmin
                .from('bazaar_purchases')
                .select('user_id,product_id,status,discount_id')
                .eq('purchase_token', purchaseToken)
                .maybeSingle();

            if (existing.error) throw existing.error;

            if (existing.data) {
                if (
                    existing.data.user_id === user.id &&
                    existing.data.product_id === productId &&
                    existing.data.status === 'verified'
                ) {
                   return res.status(200).json({
          success: true,
          alreadyVerified: true,
        result: {
          success: true,
          alreadyVerified: true
      }
  }); 
                
                return res.status(409).json({
                    success: false,
                    error: 'Purchase token already registered'
                });
            }

            let amount = product.amount;

            if (discountIntentId) {
                const { data: intent, error: intentError } =
                    await supabaseAdmin
                        .from('discount_intents')
                        .select('*')
                        .eq('id', discountIntentId)
                        .eq('user_id', user.id)
                        .eq('product_id', productId)
                        .maybeSingle();

                if (intentError) throw intentError;

                if (
                    !intent ||
                    intent.status !== 'pending' ||
                    intent.purchase_token !== null ||
                    new Date(intent.expires_at).getTime() <= Date.now()
                ) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid or expired discount intent'
                    });
                }

                const { data: discount, error: discountError } =
                    await supabaseAdmin
                        .from('discount_codes')
                        .select('percent')
                        .eq('id', intent.discount_id)
                        .single();

                if (discountError) throw discountError;

                amount = Math.round(
                    product.amount * (100 - discount.percent) / 100
                );
            }

            const bazaarUrl =
                'https://pardakht.cafebazaar.ir/devapi/v2/api/' +
                `applications/${PACKAGE_NAME}/active-subscriptions/` +
                encodeURIComponent(purchaseToken) + '/';

            const bazaarResponse = await fetch(bazaarUrl, {
                method: 'GET',
                headers: {
                    'CAFEBAZAAR-PISHKHAN-API-SECRET': bazaarToken,
                    Accept: 'application/json'
                },
                signal: AbortSignal.timeout(12000)
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

            if (!Array.isArray(bazaarData?.subscriptions)) {
                return res.status(502).json({
                    success: false,
                    error: 'Invalid Bazaar response'
                });
            }

            const verifiedPurchase = bazaarData.subscriptions.find(
                item =>
                    item &&
                    item.kind === 'androidpublisher#subscriptionPurchase' &&
                    item.sku === productId &&
                    Number.isSafeInteger(
                        Number(item.validUntilTimestampMsec)
                    ) &&
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

            const rpcArgs = {
                p_user_id: user.id,
                p_product_id: productId,
                p_purchase_token: purchaseToken,
                p_order_id: typeof orderId === 'string'
                    ? orderId.slice(0, 255)
                    : null,
                p_plan: product.plan,
                p_amount: amount,
                p_days: product.days,
                p_expires_at: expiresAt
            };

            const { data: result, error: rpcError } =
                await supabaseAdmin.rpc(
                    'verify_bazaar_purchase',
                    rpcArgs
                );    

    if (rpcError) {
        console.error('Bazaar activation error:', {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint
     });

    return res.status(500).json({
        success: false,
        error: 'Purchase verified but activation failed'
    });
}

if (!result || result.success !== true) {
    console.error('Bazaar activation returned unexpected result:', result);

    return res.status(500).json({
        success: false,
        error: 'Purchase activation was not confirmed'
    });
}

            return res.status(200).json({
                success: true,
                result
            });
        }

        if (mode) {
            return res.status(400).json({
                success: false,
                error: 'Invalid operation'
            });
        }

        // تمدید دستی مدیر
        const isAdmin =
            user.app_metadata?.role === 'admin' ||
            (process.env.ADMIN_EMAILS || '')
                .split(',')
                .map(x => x.trim().toLowerCase())
                .filter(Boolean)
                .includes((user.email || '').toLowerCase());

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'دسترسی فقط برای مدیر سیستم مجاز است.'
            });
        }

        const { userId, days } = req.body || {};
        const addDays = Number(days);

        if (
            !userId ||
            !Number.isInteger(addDays) ||
            addDays <= 0 ||
            addDays > 3650
        ) {
            return res.status(400).json({
                success: false,
                error: 'اطلاعات تمدید نامعتبر است.'
            });
        }

        const { data: profile, error: profileError } =
            await supabaseAdmin
                .from('profiles')
                .select('id,subscription_end_date')
                .eq('id', userId)
                .maybeSingle();

        if (profileError) throw profileError;

        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'مشتری ویژه پیدا نشد.'
            });
        }

        const now = new Date();
        let baseDate = now;

        if (profile.subscription_end_date) {
            const existingEnd = new Date(
                profile.subscription_end_date
            );

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

        if (updateError) throw updateError;

        return res.status(200).json({
            success: true,
            message: `اشتراک ${addDays} روز تمدید شد.`,
            days: addDays,
            endDate: newEnd.toISOString()
        });

    } catch (error) {
        console.error('Subscription API error:', error);

        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}
