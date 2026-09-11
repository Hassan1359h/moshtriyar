import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { paymentId, userId } = req.body;

    const supabaseAdmin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const { data: payment, error: fetchError } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (fetchError) throw fetchError;

        let days = payment.days;
        if (!days) {
            const { data: setting } = await supabaseAdmin
                .from('settings')
                .select('value')
                .eq('key', 'pro_days')
                .single();
            days = parseInt(setting?.value || '30');
        }

        const { error: paymentError } = await supabaseAdmin
            .from('payments')
            .update({ status: 'approved' })
            .eq('id', paymentId);

        if (paymentError) throw paymentError;

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ subscription_end_date: endDate.toISOString() })
            .eq('id', userId);

        if (profileError) throw profileError;

        return res.status(200).json({ 
            success: true, 
            message: `اشتراک برای ${days} روز فعال شد.`,
            endDate: endDate.toISOString()
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
