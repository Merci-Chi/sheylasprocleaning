const CACHE_NAME = 'dashboard-shell-v4';
const SHELL = [
  './admin.html',
  './admin-fix.js?v=4',
  './dashboard.webmanifest',
  './Images/logo-icon.png',
  './Images/logo-wordmark.png'
];

const LIVE_REFRESH_SCRIPT = `\n<script src="./admin-fix.js?v=4"></script>`;

function withLiveAdminRefresh(response) {
  if (!response || !response.ok) return Promise.resolve(response);
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return Promise.resolve(response);

  return response.text().then(html => {
    html = html.replace(/<script src="\.\/admin-fix\.js\?v=\d+"><\/script>/g, '');
    html = html.replace('</body>', `${LIVE_REFRESH_SCRIPT}\n</body>`);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control','no-store');
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  });
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request, {cache:'no-store'});
        return await withLiveAdminRefresh(networkResponse);
      } catch (_error) {
        const cached = await caches.match('./admin.html');
        return cached ? withLiveAdminRefresh(cached) : Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      return await fetch(request,{cache:'no-store'});
    } catch (_error) {
      return (await caches.match(request)) || Response.error();
    }
  })());
});
