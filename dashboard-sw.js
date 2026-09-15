const CACHE_NAME = 'dashboard-shell-v2';
const SHELL = [
  './admin.html',
  './dashboard.webmanifest',
  './Images/logo-icon.png',
  './Images/logo-wordmark.png'
];

const LIVE_REFRESH_SCRIPT = `
<script>
(() => {
  const refreshLiveAdmin = () => {
    if (typeof loadSheylasData === 'function') {
      Promise.resolve(loadSheylasData()).catch(error => console.warn('Could not refresh admin data.', error));
    }
  };

  document.addEventListener('click', event => {
    const target = event.target.closest('.nav-item[data-page], [data-go]');
    if (!target) return;
    setTimeout(refreshLiveAdmin, 0);
  });

  window.addEventListener('pageshow', refreshLiveAdmin);
})();
</script>`;

function withLiveAdminRefresh(response) {
  if (!response || !response.ok) return Promise.resolve(response);
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return Promise.resolve(response);

  return response.text().then(html => {
    if (!html.includes('loadSheylasData')) return response;
    if (!html.includes('refreshLiveAdmin')) {
      html = html.replace('</body>', `${LIVE_REFRESH_SCRIPT}\n</body>`);
    }
    const headers = new Headers(response.headers);
    headers.delete('content-length');
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
        const networkResponse = await fetch(request, {cache: 'no-store'});
        const response = await withLiveAdminRefresh(networkResponse);
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('./admin.html', copy)).catch(() => {});
        return response;
      } catch (_error) {
        const cached = await caches.match('./admin.html');
        return cached ? withLiveAdminRefresh(cached) : Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const networkResponse = await fetch(request, {cache: 'no-store'});
      if (networkResponse && networkResponse.ok) {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return networkResponse;
    } catch (_error) {
      return (await caches.match(request)) || Response.error();
    }
  })());
});
