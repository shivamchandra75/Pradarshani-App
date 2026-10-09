self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // A simple pass-through fetch handler is required by Chrome to trigger the "Add to Home Screen" prompt
  e.respondWith(fetch(e.request));
});
