const { createClient } = require('@supabase/supabase-js');

function normalizeSiteUrl(value) {
  try {
    const url = new URL(
      /^https?:\/\//i.test(String(value || ''))
        ? value
        : `https://${value}`
    );

    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
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
        error: 'Server configuration missing'
      });
    }

    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization required'
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

    const token = authHeader.slice(7).trim();

    const {
      data: { user },
      error: authError
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean);

    const userEmail = (user.email || '').toLowerCase();

    const isAdmin =
      profile?.role === 'admin' ||
      adminEmails.includes(userEmail);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const [
      { data: sites, error: sitesError },
      { data: keys, error: keysError }
    ] = await Promise.all([
      supabaseAdmin
        .from('websites')
        .select('id,user_id,domain,active')
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('site_api_keys')
        .select('user_id,site_url,is_active,last_used_at')
    ]);

    if (sitesError) throw sitesError;
    if (keysError) throw keysError;

    const result = (sites || []).map(site => {
      const domain = normalizeSiteUrl(site.domain);

      const key = (keys || []).find(item =>
        item.user_id === site.user_id &&
        normalizeSiteUrl(item.site_url) === domain &&
        item.is_active === true
      );

      return {
        id: site.id,
        user_id: site.user_id,
        domain: site.domain,
        website_active: site.active === true,
        api_key_active: Boolean(key),
        last_used_at: key?.last_used_at || null
      };
    });

    return res.status(200).json({
      success: true,
      sites: result
    });
  } catch (error) {
    console.error('Admin site status error:', error);

    return res.status(500).json({
      success: false,
      error: 'Could not load site statuses'
    });
  }
};
