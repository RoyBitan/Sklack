import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import Auth from './Auth';
import Layout from './Layout';
import OrganizationView from './OrganizationView';
import PendingApprovalView from './PendingApprovalView';
import ManagerDashboard from './ManagerDashboard';
import TeamDashboard from './TeamDashboard';
import CustomerDashboard from './CustomerDashboard';
import SettingsView from './SettingsView';
import VehiclesView from './VehiclesView';
import NotificationsView from './NotificationsView';
import AppointmentsView from './AppointmentsView';
import { UserRole, MembershipStatus } from '../types';

export const AuthGuard: React.FC = () => {
    const { user, profile, loading: authLoading } = useAuth();
    const { activeView } = useApp();

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
                <div className="animate-pulse-slow text-2xl font-bold">טוען...</div>
            </div>
        );
    }

    if (!user) {
        return <Auth />;
    }

    // Handle Logged in but MISSING Profile or MISSING Org
    if (!profile || !profile.org_id) {
        return (
            <Layout>
                <OrganizationView onboarding />
            </Layout>
        );
    }

    // Handle users waiting for admin approval
    if (profile.membership_status === MembershipStatus.PENDING) {
        return (
            <Layout>
                <PendingApprovalView />
            </Layout>
        );
    }

    // View Routing
    const renderView = () => {
        switch (activeView) {
            case 'SETTINGS': return <SettingsView />;
            case 'ORGANIZATION': return <OrganizationView />;
            case 'NOTIFICATIONS': return <NotificationsView />;
            case 'APPOINTMENTS': return <AppointmentsView />;
            case 'VEHICLES': return <VehiclesView />;
            case 'DASHBOARD':
            default:
                if (profile.role === UserRole.SUPER_MANAGER || profile.role === UserRole.DEPUTY_MANAGER) {
                    return <ManagerDashboard />;
                }
                if (profile.role === UserRole.TEAM) {
                    return <TeamDashboard />;
                }
                return <CustomerDashboard />;
        }
    };

    return <Layout>{renderView()}</Layout>;
};
