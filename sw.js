/* ============================================
   Service Worker - مشتری‌یار
   ============================================ */

// 🎯 نسخه کش — با هر دیپلوی جدید این عدد رو زیاد کن
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `moshtriyar-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `moshtriyar-runtime-${CACHE_VERSION}`;

// 🎯 فایل‌هایی که همیشه باید کش بشن (shell اصلی)
const PRECACHE_URLS = [
    '/',
    '/dashboard.html',
    '/checks.html',
    '/installments.html',
    '/financial-reports.html',
    '/login.html',
    '/icon-192.png',
    '/icon-512.png'
];

// 🎯 دامنه‌هایی که نباید کش بشن (API ها)
const NO_CACHE_DOMAINS = [
    'supabase.co',
    'ocxlarkkpowlztgtcuyf.supabase.co'
];

// ============================================
// INSTALL - پیش‌کش کردن فایل‌های اصلی
// ============================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing version:', CACHE_VERSION);
   console.log('[SW] ✅ Service Worker installed successfully');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(PRECACHE_URLS).catch(err => {
                console.warn('[SW] Precache partial fail:', err);
            }))
            .then(() => self.skipWaiting()) // فعال‌سازی فوری
    );
});

// ============================================
// ACTIVATE - پاک کردن کش‌های قدیمی
// ============================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating version:', CACHE_VERSION);
    event.waitUntil(
        caches.keys()
            .then(cacheNames => Promise.all(
                cacheNames
                    .filter(name => 
                        name.startsWith('moshtriyar-') && 
                        name !== STATIC_CACHE && 
                        name !== RUNTIME_CACHE
                    )
                    .map(name => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            ))
            .then(() => self.clients.claim()) // کنترل همه تب‌های باز
    );
});

// ============================================
// FETCH - استراتژی بر اساس نوع درخواست
// ============================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // ⛔ فقط GET رو کش کن
    if (request.method !== 'GET') return;

    // ⛔ درخواست‌های Supabase و API ها رو کش نکن
    if (NO_CACHE_DOMAINS.some(d => url.hostname.includes(d))) {
        return; // به شبکه میره، بدون کش
    }

    // ⛔ درخواست‌های Chrome Extension یا غیر http رو نادیده بگیر
    if (!url.protocol.startsWith('http')) return;

    // 🎯 استراتژی بر اساس نوع فایل
    const isHTML = request.headers.get('accept')?.includes('text/html') ||
                   url.pathname.endsWith('.html') ||
                   url.pathname === '/' ||
                   !url.pathname.includes('.');

    const isJS = url.pathname.endsWith('.js');
    const isStatic = /\.(css|png|jpg|jpeg|svg|webp|woff2?|ttf|eot|ico)$/i.test(url.pathname);
    const isCDN = url.hostname.includes('cdn.jsdelivr.net') ||
                  url.hostname.includes('cdnjs.cloudflare.com') ||
                  url.hostname.includes('fonts.googleapis.com') ||
                  url.hostname.includes('fonts.gstatic.com');

    if (isHTML) {
        // 🔄 Network-First برای HTML — همیشه نسخه تازه
        event.respondWith(networkFirst(request, STATIC_CACHE));
    } else if (isJS) {
        // 🔄 Network-First برای JS — همیشه نسخه تازه (چون ممکنه تغییر کنن)
        event.respondWith(networkFirst(request, STATIC_CACHE));
    } else if (isStatic || isCDN) {
        // 📦 Cache-First برای فایل‌های استاتیک و CDN
        event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    } else {
        // 🔄 پیش‌فرض: Network-First با fallback به کش
        event.respondWith(networkFirst(request, RUNTIME_CACHE));
    }
});

// ============================================
// استراتژی‌ها
// ============================================

// 🌐 Network-First: اول از شبکه، اگه قطع بود از کش
async function networkFirst(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        
        // اگه پاسخ معتبر بود، در کش ذخیره کن
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (err) {
        // شبکه قطع بود → از کش بخون
        const cached = await caches.match(request);
        if (cached) return cached;
        
        // اگه HTML بود و کش نبود، صفحه آفلاین
        if (request.headers.get('accept')?.includes('text/html')) {
            return new Response(
                '<html dir="rtl"><body style="font-family:Tahoma;text-align:center;padding:50px;">' +
                '<h2>🌐 اتصال اینترنت قطع است</h2>' +
                '<p>لطفاً اتصال خود را بررسی کنید.</p>' +
                '</body></html>',
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
        }
        throw err;
    }
}

// 📦 Cache-First: اول از کش، اگه نبود از شبکه
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (err) {
        throw err;
    }
}

// ============================================
// MESSAGE - دریافت پیام از صفحه (برای force update)
// ============================================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then(keys => 
            Promise.all(keys.map(k => caches.delete(k)))
        );
    }
});
