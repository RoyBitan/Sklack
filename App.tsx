import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { DataProvider } from './contexts/DataContext';
import { AuthGuard } from './components/AuthGuard';
import PublicOrderStatus from './components/PublicOrderStatus';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';

// View Components for Routing
import ManagerDashboard from './components/ManagerDashboard';
import TeamDashboard from './components/TeamDashboard';
import CustomerDashboard from './components/CustomerDashboard';
import SettingsView from './components/SettingsView';
import OrganizationView from './components/OrganizationView';
import NotificationsView from './components/NotificationsView';
import AppointmentsView from './components/AppointmentsView';
import VehiclesView from './components/VehiclesView';
import GarageView from './components/GarageView';
import TaskDetailsView from './components/TaskDetailsView';
import RequestDetailsView from './components/RequestDetailsView';
import TasksListView from './components/TasksListView';
import { UserRole } from './types';

const DashboardRouter: React.FC = () => {
    const { profile } = useAuth();

    if (!profile) return null;

    if (profile.role === UserRole.SUPER_MANAGER || profile.role === UserRole.STAFF) {
        return <ManagerDashboard />;
    }
    if (profile.role === UserRole.CUSTOMER) {
        return <CustomerDashboard />;
    }
    return null;
};

import Layout from './components/Layout';

const AppRoutes: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Listen for messages from Service Worker (Deep Linking)
        const handleMessage = (event: MessageEvent) => {
            try {
                if (event.data && event.data.type === 'NAVIGATE') {
                    const url = event.data.url;
                    if (url.startsWith('/')) {
                        navigate(url);
                    }
                }
            } catch (err) {
                console.warn('[SW Message] Failed to handle navigation message:', err);
            }
        };
        navigator.serviceWorker?.addEventListener('message', handleMessage);
        return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
    }, []);

    return (
        <Routes>
            {/* Public Route */}
            <Route path="/status/:taskId" element={<PublicOrderStatus />} />

            {/* Authenticated Routes wrapped in AuthGuard */}
            <Route element={<AuthGuard />}>
                {/* Views WITH Layout */}
                <Route element={<Layout><Outlet /></Layout>}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardRouter />} />
                    <Route path="/tasks" element={<TasksListView />} />
                    <Route path="/appointments" element={<AppointmentsView />} />
                    <Route path="/vehicles" element={<VehiclesView />} />
                    <Route path="/garage" element={<GarageView />} />
                    <Route path="/team" element={<OrganizationView />} />
                    <Route path="/settings" element={<SettingsView />} />
                    <Route path="/notifications" element={<NotificationsView />} />
                </Route>

                {/* Views WITHOUT Layout (Directly inside AuthGuard) */}
                <Route path="/tasks/:id" element={<TaskDetailsView />} />
                <Route path="/appointments/:id" element={<RequestDetailsView />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
};


const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <AuthProvider>
                    <AppProvider>
                        <DataProvider>
                            <AppRoutes />
                            <Toaster position="top-center" expand={true} richColors dir="rtl" />
                        </DataProvider>
                    </AppProvider>
                </AuthProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
};


export default App;