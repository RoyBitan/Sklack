const CACHE_NAME = 'sklack-static-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/pwa-192x192.png',
    '/pwa-512x512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.claim();
});

// Fetch with Stale-While-Revalidate Strategy
self.addEventListener('fetch', event => {
    // Only cache GET requests and non-API requests
    if (event.request.method !== 'GET' || event.request.url.includes('/supabase.co/')) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                }).catch(() => {
                    // Fallback to cache if network fails
                    return response;
                });
                return response || fetchPromise;
            });
        })
    );
});

// 1. Listen for Push Events
self.addEventListener('push', event => {
    if (!event.data) return;
    try {
        const payload = event.data.json();
        const title = payload.title || 'Sklack Update';
        const options = {
            body: payload.body || 'יש לך הודעה חדשה',
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            vibrate: [200, 100, 200],
            data: {
                url: payload.url || '/',
                taskId: payload.taskId
            },
            tag: payload.tag || 'sklack-notification',
            renotify: true,
            actions: [
                { action: 'open', title: 'פתח אפליקציה' }
            ]
        };
        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    } catch (err) {
        console.error('Push payload error:', err);
    }
});

// 2. Handle Notification Clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (const client of windowClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});