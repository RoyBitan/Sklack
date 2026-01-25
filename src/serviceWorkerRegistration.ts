

const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function register(config?: { onUpdate?: (registration: ServiceWorkerRegistration) => void; onSuccess?: (registration: ServiceWorkerRegistration) => void }) {
    if (import.meta.env.PROD || isLocalhost) { // Allow in Dev if localhost 
        if ('serviceWorker' in navigator) {
            const publicUrl = new URL(import.meta.env.BASE_URL, window.location.href);
            if (publicUrl.origin !== window.location.origin) {
                return;
            }

            window.addEventListener('load', () => {
                const swUrl = `${import.meta.env.BASE_URL}sw.js`;

                if (isLocalhost) {
                    checkValidServiceWorker(swUrl, config);
                    navigator.serviceWorker.ready.then(() => {
                        console.log(
                            'This web app is being served cache-first by a service ' +
                            'worker. To learn more, visit https://cra.link/PWA'
                        );
                    });
                } else {
                    registerValidSW(swUrl, config);
                }
            });
        }
    }
}

function registerValidSW(swUrl: string, config?: { onUpdate?: (registration: ServiceWorkerRegistration) => void; onSuccess?: (registration: ServiceWorkerRegistration) => void }) {
    navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
            registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (installingWorker == null) {
                    return;
                }
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            console.log(
                                'New content is available and will be used when all ' +
                                'tabs for this page are closed. See https://cra.link/PWA.'
                            );
                            if (config && config.onUpdate) {
                                config.onUpdate(registration);
                            }
                        } else {
                            console.log('Content is cached for offline use.');
                            if (config && config.onSuccess) {
                                config.onSuccess(registration);
                            }
                        }
                    }
                };
            };

            // Subscribe to Push Notifications
            subscribeUserToPush(registration);
        })
        .catch((error) => {
            console.error('Error during service worker registration:', error);
        });
}

function checkValidServiceWorker(swUrl: string, config?: { onUpdate?: (registration: ServiceWorkerRegistration) => void; onSuccess?: (registration: ServiceWorkerRegistration) => void }) {
    fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
        .then((response) => {
            const contentType = response.headers.get('content-type');
            if (
                response.status === 404 ||
                (contentType != null && contentType.indexOf('javascript') === -1)
            ) {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.unregister().then(() => {
                        window.location.reload();
                    });
                });
            } else {
                registerValidSW(swUrl, config);
            }
        })
        .catch(() => {
            console.log('No internet connection found. App is running in offline mode.');
        });
}

export function unregister() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
            .then((registration) => {
                registration.unregister();
            })
            .catch((error) => {
                console.error(error.message);
            });
    }
}

async function subscribeUserToPush(registration: ServiceWorkerRegistration) {
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
        console.warn("VAPID Key missing in environment variables. Push notifications will not work.");
        return;
    }

    try {
        const subscribeOptions = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey)
        };

        const pushSubscription = await registration.pushManager.subscribe(subscribeOptions);
        console.log('Push Subscribed Success:', JSON.stringify(pushSubscription));

        // TODO: Send pushSubscription to backend
    } catch (err) {
        console.error('Failed to subscribe the user: ', err);
    }
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
