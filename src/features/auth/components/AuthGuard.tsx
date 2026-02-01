import React from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthForm from "./AuthForm";
import Layout from "@/src/shared/components/layout/Layout";
import OrganizationView from "@/components/OrganizationView";
import PendingApprovalView from "./PendingApprovalView";
import LoadingSpinner from "@/src/shared/components/ui/LoadingSpinner";
import { MembershipStatus } from "@/types";

export const AuthGuard: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingSpinner message="מאמת פרטי משתמש..." />;
  }

  if (!user) {
    return <AuthForm />;
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
