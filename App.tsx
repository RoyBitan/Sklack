import React, { lazy, Suspense, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { AuthGuard, AuthProvider, useAuth } from "@/src/features/auth";
import { AppProvider } from "@/src/shared/context/AppContext";
import { DataProvider } from "@/src/shared/context/DataContext";
import {
  NotificationBell,
  NotificationsProvider,
} from "@/src/features/notifications";
import { UsersProvider } from "@/src/features/users";
import { ChatProvider } from "@/src/features/chat";
import { ProposalsProvider } from "@/src/features/proposals";
import { VehiclesProvider } from "@/src/features/vehicles";
import { AppointmentsProvider } from "@/src/features/appointments";
import { TasksProvider } from "@/src/features/tasks";
import { Toaster } from "sonner";
import ErrorBoundary, {
  AppointmentsErrorFallback,
  DashboardErrorFallback,
  DetailViewErrorFallback,
  FeatureErrorBoundary,
  TasksErrorFallback,
  VehiclesErrorFallback,
} from "./components/ErrorBoundary";
import LoadingSpinner from "@/src/shared/components/ui/LoadingSpinner";
import Layout from "@/src/shared/components/layout/Layout";

// Lazy Load Views
const NotificationsView = lazy(() =>
  import("@/src/features/notifications").then((module) => ({
    default: module.NotificationsView,
  }))
);
const SettingsView = lazy(() =>
  import("@/src/features/users").then((module) => ({
    default: module.SettingsView,
  }))
);
const VehiclesView = lazy(() =>
  import("@/src/features/vehicles").then((module) => ({
    default: module.VehiclesView,
  }))
);
const AppointmentsView = lazy(() =>
  import("@/src/features/appointments").then((module) => ({
    default: module.AppointmentsView,
  }))
);
const RequestDetailsView = lazy(() =>
  import("@/src/features/appointments").then((module) => ({
    default: module.RequestDetailsView,
  }))
);
const CustomerDashboard = lazy(() =>
  import("@/src/features/tasks").then((module) => ({
    default: module.CustomerDashboard,
  }))
);
const ManagerDashboard = lazy(() =>
  import("@/src/features/tasks").then((module) => ({
    default: module.ManagerDashboard,
  }))
);
const PublicOrderStatus = lazy(() =>
  import("@/src/features/tasks").then((module) => ({
    default: module.PublicOrderStatus,
  }))
);
const TaskDetailsView = lazy(() =>
  import("@/src/features/tasks").then((module) => ({
    default: module.TaskDetailsView,
  }))
);
const TasksList = lazy(() =>
  import("@/src/features/tasks").then((module) => ({
    default: module.TasksList,
  }))
);
const TeamDashboard = lazy(() =>
  import("@/src/features/tasks").then((module) => ({
    default: module.TeamDashboard,
  }))
);
const GarageView = lazy(() =>
  import("@/src/features/organizations").then((module) => ({
    default: module.GarageView,
  }))
);
const OrganizationView = lazy(() =>
  import("@/src/features/organizations").then((module) => ({
    default: module.OrganizationView,
  }))
);
import { UserRole } from "./types";

const DashboardRouter: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (!profile) return null;

  // Wrap each dashboard in its own error boundary
  const handleGoHome = () => navigate("/dashboard");

  if (profile.role === UserRole.SUPER_MANAGER) {
    return (
      <FeatureErrorBoundary
        featureName="דשבורד מנהל"
        fallback={(error, resetError) => (
          <DashboardErrorFallback error={error} onRetry={resetError} />
        )}
      >
        <ManagerDashboard />
      </FeatureErrorBoundary>
    );
  }
  if (profile.role === UserRole.STAFF) {
    return (
      <FeatureErrorBoundary
        featureName="דשבורד צוות"
        fallback={(error, resetError) => (
          <DashboardErrorFallback error={error} onRetry={resetError} />
        )}
      >
        <TeamDashboard />
      </FeatureErrorBoundary>
    );
  }
  if (profile.role === UserRole.CUSTOMER) {
    return (
      <FeatureErrorBoundary
        featureName="דשבורד לקוח"
        fallback={(error, resetError) => (
          <DashboardErrorFallback error={error} onRetry={resetError} />
        )}
      >
        <CustomerDashboard />
      </FeatureErrorBoundary>
    );
  }
  return null;
};

const RoleGate: React.FC<
  { children: React.ReactNode; allowedRoles: UserRole[] }
> = ({ children, allowedRoles }) => {
  const { profile, loading } = useAuth();

  if (loading) return <LoadingSpinner message="בודק הרשאות..." />;
  if (!profile) return <Navigate to="/dashboard" replace />;

  if (!allowedRoles.includes(profile.role)) {
    console.warn(`[RoleGate] Access denied for role: ${profile.role}`);
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for messages from Service Worker (Deep Linking)
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data && event.data.type === "NAVIGATE") {
          const url = event.data.url;
          if (url.startsWith("/")) {
            navigate(url);
          }
        }
      } catch (err) {
        console.warn("[SW Message] Failed to handle navigation message:", err);
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleMessage);
    return () =>
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
  }, [navigate]);

  // Helper for detail view error fallback with navigation
  const DetailViewWithErrorBoundary: React.FC<{
    children: React.ReactNode;
    featureName: string;
  }> = ({ children, featureName }) => (
    <FeatureErrorBoundary
      featureName={featureName}
      fallback={(error, resetError) => (
        <DetailViewErrorFallback
          error={error}
          onRetry={resetError}
          onGoBack={() => navigate(-1)}
        />
      )}
    >
      {children}
    </FeatureErrorBoundary>
  );

  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Public Route */}
        <Route path="/status/:taskId" element={<PublicOrderStatus />} />

        {/* Authenticated Routes wrapped in AuthGuard */}
        <Route element={<AuthGuard />}>
          {/* Views WITH Layout */}
          <Route
            element={
              <Layout>
                <Outlet />
              </Layout>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardRouter />} />

            {/* Admin/Manager Only Routes - Each with its own Error Boundary */}
            <Route
              path="/tasks"
              element={
                <RoleGate allowedRoles={[UserRole.SUPER_MANAGER]}>
                  <FeatureErrorBoundary
                    featureName="משימות"
                    fallback={(error, resetError) => (
                      <TasksErrorFallback
                        error={error}
                        onRetry={resetError}
                        onGoHome={() => navigate("/dashboard")}
                      />
                    )}
                  >
                    <TasksList />
                  </FeatureErrorBoundary>
                </RoleGate>
              }
            />
            <Route
              path="/appointments"
              element={
                <RoleGate allowedRoles={[UserRole.SUPER_MANAGER]}>
                  <FeatureErrorBoundary
                    featureName="תורים"
                    fallback={(error, resetError) => (
                      <AppointmentsErrorFallback
                        error={error}
                        onRetry={resetError}
                      />
                    )}
                  >
                    <AppointmentsView />
                  </FeatureErrorBoundary>
                </RoleGate>
              }
            />
            <Route
              path="/vehicles"
              element={
                <RoleGate allowedRoles={[UserRole.SUPER_MANAGER]}>
                  <FeatureErrorBoundary
                    featureName="רכבים"
                    fallback={(error, resetError) => (
                      <VehiclesErrorFallback
                        error={error}
                        onRetry={resetError}
                      />
                    )}
                  >
                    <VehiclesView />
                  </FeatureErrorBoundary>
                </RoleGate>
              }
            />
            <Route
              path="/garage"
              element={
                <RoleGate allowedRoles={[UserRole.SUPER_MANAGER]}>
                  <FeatureErrorBoundary featureName="מוסך">
                    <GarageView />
                  </FeatureErrorBoundary>
                </RoleGate>
              }
            />
            <Route
              path="/team"
              element={
                <RoleGate allowedRoles={[UserRole.SUPER_MANAGER]}>
                  <FeatureErrorBoundary featureName="צוות">
                    <OrganizationView />
                  </FeatureErrorBoundary>
                </RoleGate>
              }
            />

            {/* Common Routes */}
            <Route
              path="/settings"
              element={
                <FeatureErrorBoundary featureName="הגדרות">
                  <SettingsView />
                </FeatureErrorBoundary>
              }
            />
            <Route
              path="/notifications"
              element={
                <FeatureErrorBoundary featureName="התראות">
                  <NotificationsView />
                </FeatureErrorBoundary>
              }
            />
          </Route>

          {/* Views WITHOUT Layout (Directly inside AuthGuard) - with Detail Error Boundaries */}
          <Route
            path="/tasks/:id"
            element={
              <DetailViewWithErrorBoundary featureName="פרטי משימה">
                <TaskDetailsView />
              </DetailViewWithErrorBoundary>
            }
          />
          <Route
            path="/appointments/:id"
            element={
              <DetailViewWithErrorBoundary featureName="פרטי תור">
                <RequestDetailsView />
              </DetailViewWithErrorBoundary>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <NotificationsProvider>
              <UsersProvider>
                <ChatProvider>
                  <ProposalsProvider>
                    <VehiclesProvider>
                      <AppointmentsProvider>
                        <TasksProvider>
                          <DataProvider>
                            <AppRoutes />
                            <Toaster
                              position="top-center"
                              expand={true}
                              richColors
                              dir="rtl"
                            />
                            <Analytics />
                          </DataProvider>
                        </TasksProvider>
                      </AppointmentsProvider>
                    </VehiclesProvider>
                  </ProposalsProvider>
                </ChatProvider>
              </UsersProvider>
            </NotificationsProvider>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
