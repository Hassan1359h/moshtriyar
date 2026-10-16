import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

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

function createDynamicPriceToken({
    price,
    productId,
    nonce,
    secret
}) {
    const encode = value =>
        Buffer.from(JSON.stringify(value)).toString('base64url');

    const header = encode({
        alg: 'HS256',
        typ: 'JWT'
    });

    const payload = encode({
        price,
        package_name: 'ir.moshtriyar.app',
        sku: productId,
        nonce,
        exp: Math.floor(Date.now() / 1000) + 300
    });

    const signature = createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');

    return `${header}.${payload}.${signature}`;
}

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
            return res.status(500).json({
                success: false,
                error: 'Supabase server settings are missing.'
            });
        }

        const authHeader = req.headers.authorization || '';

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const accessToken = authHeader.slice(7).trim();

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

        const {
            data: { user },
            error: userError
        } = await supabaseAdmin.auth.getUser(accessToken);

        if (userError || !user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid session'
            });
        }

        // ساخت توکن قیمت تخفیفی کافه‌بازار
        if (req.query.mode === 'discount') {
            const secret = process.env.BAZAAR_DYNAMIC_PRICE_SECRET;

            if (!secret) {
                return res.status(500).json({
                    success: false,
                    error: 'Discount service settings are missing'
                });
            }

            const { code, productId } = req.body || {};
            const product = PRODUCTS[productId];

            if (
                !product ||
                typeof code !== 'string' ||
                !code.trim() ||
                code.trim().length > 64
            ) {
                return res.status(400).json({
                    success: false,
                    error: 'کد تخفیف یا محصول نامعتبر است.'
                });
            }

            const normalizedCode = code.trim();

            const {
                data: discount,
                error: discountError
            } = await supabaseAdmin
                .from('discount_codes')
                .select(
                    'id, code, percent, max_uses, used_count, expires_at, is_active, assigned_user_id, allowed_products'
                )
                .eq('code', normalizedCode)
                .maybeSingle();

            if (discountError) throw discountError;

            const now = new Date();

            if (
                !discount ||
                !discount.is_active ||
                !discount.expires_at ||
                new Date(discount.expires_at) <= now ||
                discount.used_count >= discount.max_uses ||
                (
                    discount.assigned_user_id &&
                    discount.assigned_user_id !== user.id
                ) ||
                !Array.isArray(discount.allowed_products) ||
                !discount.allowed_products.includes(productId) ||
                !Number.isInteger(discount.percent) ||
                discount.percent < 1 ||
                discount.percent > 99
            ) {
                return res.status(400).json({
                    success: false,
                    error: 'کد تخفیف نامعتبر، منقضی یا غیرقابل استفاده است.'
                });
            }

            const expiresAt = new Date(
                now.getTime() + 5 * 60 * 1000
            ).toISOString();

            const {
                data: intent,
                error: intentError
            } = await supabaseAdmin
                .from('discount_intents')
                .insert({
                    discount_id: discount.id,
                    user_id: user.id,
                    product_id: productId,
                    expires_at: expiresAt,
                    status: 'pending'
                })
                .select('id, nonce')
                .single();

            if (intentError) throw intentError;

            const basePriceRial = product.amount * 10;

            const discountedPriceRial = Math.round(
                basePriceRial * (100 - discount.percent) / 100
            );

            const dynamicPriceToken = createDynamicPriceToken({
                price: discountedPriceRial,
                productId,
                nonce: intent.nonce,
                secret
            });

            return res.status(200).json({
                success: true,
                intentId: intent.id,
                productId,
                price: discountedPriceRial,
                dynamicPriceToken
            });
        }

        // تأیید خرید کافه‌بازار
        if (req.query.mode === 'bazaar') {
            const bazaarToken = process.env.BAZAAR_PISHKHAN_TOKEN;

            if (!bazaarToken) {
                return res.status(500).json({
                    success: false,
                    error: 'Bazaar server settings are missing'
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

            const {
                data: existing,
                error: existingError
            } = await supabaseAdmin
                .from('bazaar_purchases')
                .select('user_id, product_id, status')
                .eq('purchase_token', purchaseToken)
                .maybeSingle();

            if (existingError) throw existingError;

            if (existing) {
                if (
                    existing.user_id === user.id &&
                    existing.product_id === productId &&
                    existing.status === 'verified'
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

            let discountedAmount = product.amount;
            let discountId = null;

            if (discountIntentId) {
                if (
                    typeof discountIntentId !== 'string' ||
                    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                        discountIntentId
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid discount intent'
                    });
                }

                const {
                    data: intent,
                    error: intentError
                } = await supabaseAdmin
                    .from('discount_intents')
                    .select(
                        'id, user_id, product_id, discount_id, expires_at, purchase_token, status'
                    )
                    .eq('id', discountIntentId)
                    .eq('user_id', user.id)
                    .eq('product_id', productId)
                    .maybeSingle();

                if (intentError) throw intentError;

                if (
                    !intent ||
                    intent.status !== 'pending' ||
                    intent.purchase_token !== null ||
                    new Date(intent.expires_at) <= new Date()
                ) {
                    return res.status(400).json({
                        success: false,
                        error: 'کد تخفیف منقضی شده است؛ دوباره امتحان کنید.'
                    });
                }

                const {
                    data: discount,
                    error: discountError
                } = await supabaseAdmin
                    .from('discount_codes')
                    .select(
                        'id, percent, max_uses, used_count, expires_at, is_active, assigned_user_id, allowed_products'
                    )
                    .eq('id', intent.discount_id)
                    .maybeSingle();

                if (discountError) throw discountError;

                if (
                    !discount ||
                    !discount.is_active ||
                    !discount.expires_at ||
                    new Date(discount.expires_at) <= new Date() ||
                    discount.used_count >= discount.max_uses ||
                    (
                        discount.assigned_user_id &&
                        discount.assigned_user_id !== user.id
                    ) ||
                    !Array.isArray(discount.allowed_products) ||
                    !discount.allowed_products.includes(productId)
                ) {
                    return res.status(400).json({
                        success: false,
                        error: 'کد تخفیف دیگر قابل استفاده نیست.'
                    });
                }

                discountedAmount = Math.round(
                    product.amount * (100 - discount.percent) / 100
                );

                discountId = intent.id;
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

            if (
                !bazaarData ||
                !Array.isArray(bazaarData.subscriptions)
            ) {
                return res.status(502).json({
                    success: false,
                    error: 'Invalid verification response from Bazaar'
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

            const rpcParams = {
                p_user_id: user.id,
                p_product_id: productId,
                p_purchase_token: purchaseToken,
                p_order_id: typeof orderId === 'string'
                    ? orderId.slice(0, 255)
                    : null,
                p_plan: product.plan,
                p_amount: discountedAmount,
                p_days: product.days,
                p_expires_at: expiresAt
            };

            let rpcResult;

            if (discountIntentId) {
                rpcResult = await supabaseAdmin.rpc(
                    'verify_bazaar_purchase',
                    {
                        ...rpcParams,
                        p_discount_intent_id: discountId
                    }
                );
            } else {
                rpcResult = await supabaseAdmin.rpc(
                    'verify_bazaar_purchase',
                    rpcParams
                );
            }

            const { data: result, error: rpcError } = rpcResult;

            if (rpcError) {
                console.error(
                    'Bazaar activation error:',
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
        }

        // جلوگیری از اجرای عملیات با mode ناشناخته
        if (req.query.mode) {
            return res.status(400).json({
                success: false,
                error: 'Invalid operation'
            });
        }

        // تمدید دستی اشتراک: فقط مدیر سیستم
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

        if (
            !Number.isInteger(addDays) ||
            addDays <= 0 ||
            addDays > 3650
        ) {
            return res.status(400).json({
                success: false,
                error: 'مدت اشتراک نامعتبر است.'
            });
        }

        const {
            data: profile,
            error: profileError
        } = await supabaseAdmin
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

        const {
            error: updateError
        } = await supabaseAdmin
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
