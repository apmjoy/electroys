import type { APIRoute } from 'astro';

// The service worker that makes Electroys installable and fast on repeat visits.
// Generated at build time so every deploy gets a new version (old caches are
// cleaned up on activate). Rules, in order of importance:
//  - Pages are ALWAYS fetched from the network first, so visitors never see a
//    stale site after a deploy; the cached copy / offline page is only a fallback.
//  - /_astro/ files are content-hashed, so they're cached forever.
//  - Images are served from cache and refreshed in the background (capped).
//  - Anything cross-origin (Amazon, analytics, fonts CDNs) is never touched.
const VERSION = new Date().toISOString();

const SW = `
const VERSION = ${JSON.stringify(VERSION)};
const PAGES = 'electroys-pages-v1';
const ASSETS = 'electroys-assets-v1';
const IMAGES = 'electroys-images-v1';
const CORE = 'electroys-core-' + VERSION;
const OFFLINE = '/offline/';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CORE).then((c) => c.addAll([OFFLINE, '/icon-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([PAGES, ASSETS, IMAGES, CORE]);
    for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network first, fall back to the last copy, then the offline page.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(req, copy)).then(() => trim(PAGES, 40)); }
        return res;
      } catch {
        return (await caches.match(req)) || (await caches.match(OFFLINE)) || Response.error();
      }
    })());
    return;
  }

  // Hashed build assets: cache first, forever.
  if (url.pathname.startsWith('/_astro/')) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) { const copy = res.clone(); caches.open(ASSETS).then((c) => c.put(req, copy)); }
      return res;
    })());
    return;
  }

  // Images: instant from cache, refreshed in the background.
  if (/^\\/(products|art|og)\\//.test(url.pathname) || /\\.(png|webp|jpg|svg)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGES);
      const hit = await cache.match(req);
      const refresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()).then(() => trim(IMAGES, 150)); return res; }).catch(() => hit);
      return hit || refresh;
    })());
    return;
  }

  // Small data files: network first, cached copy when offline.
  if (url.pathname.endsWith('.json')) {
    event.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req)));
  }
});
`;

export const GET: APIRoute = () =>
  new Response(SW, { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
