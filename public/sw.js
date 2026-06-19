const CACHE = 'sobra-v1';
const OFFLINE = '/offline.html';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never intercept: non-GET, auth callbacks, API routes, Supabase
  if (
    e.request.method !== 'GET' ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co')
  ) {
    return;
  }

  // Next.js hashed static assets + public images: cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|ico|svg|webp|jpg|jpeg|woff2?)$/)
  ) {
    e.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(e.request).then(
          (hit) =>
            hit ??
            fetch(e.request).then((res) => {
              if (res.ok) cache.put(e.request, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  // Navigation (HTML pages): network-first, offline fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches
          .match(OFFLINE)
          .then((page) => page ?? new Response('Offline', { status: 503 }))
      )
    );
  }
});
