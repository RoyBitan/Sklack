const CACHE_NAME = 'sklack-push-cache-v1';
self.addEventListener('install', event => {
    self.skipWaiting();
});
self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
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
            // If window is already open, focus it and navigate
            for (const client of windowClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});