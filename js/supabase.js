import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://ocxlarkkpowlztgtcuyf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2UrLE2rdsB-GIrK6u_Pa0g_qeURaDDm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
