import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Auth from './Auth';
import Layout from './Layout';
import OrganizationView from './OrganizationView';
import PendingApprovalView from './PendingApprovalView';
import LoadingSpinner from './LoadingSpinner';
import { MembershipStatus } from '../types';

export const AuthGuard: React.FC = () => {
    const { user, profile, loading: authLoading } = useAuth();

    if (authLoading) {
        return <LoadingSpinner message="מאמת פרטי משתמש..." />;
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

    // Render the matching child route from App.tsx
    return <Outlet />;
};

