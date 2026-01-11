import React, { useEffect, useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { DataProvider } from './contexts/DataContext';
import { AuthGuard } from './components/AuthGuard';
import PublicOrderStatus from './components/PublicOrderStatus';

const App: React.FC = () => {
    const [publicTaskId, setPublicTaskId] = useState<string | null>(null);

    useEffect(() => {
        // Simple hash-based routing for public status view
        const checkRoute = () => {
            const hash = window.location.hash;
            const statusMatch = hash.match(/#\/status\/(.+)/);
            const newId = statusMatch ? statusMatch[1] : null;

            setPublicTaskId(prev => prev === newId ? prev : newId);
        };

        checkRoute();
        window.addEventListener('hashchange', checkRoute);

        // Listen for messages from Service Worker (Deep Linking)
        const handleMessage = (event: MessageEvent) => {
            try {
                if (event.data && event.data.type === 'NAVIGATE') {
                    const url = event.data.url;
                    if (url.startsWith('/')) {
                        window.location.hash = url.replace('/#', '#');
                    }
                }
            } catch (err) {
                console.warn('[SW Message] Failed to handle navigation message:', err);
            }
        };
        navigator.serviceWorker?.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('hashchange', checkRoute);
            navigator.serviceWorker?.removeEventListener('message', handleMessage);
        };
    }, []);

    // Public route - no authentication required
    if (publicTaskId) {
        return <PublicOrderStatus taskId={publicTaskId} />;
    }

    // Normal authenticated routes
    return (
        <AuthProvider>
            <DataProvider>
                <AppProvider>
                    <AuthGuard />
                </AppProvider>
            </DataProvider>
        </AuthProvider>
    );
};

export default App;