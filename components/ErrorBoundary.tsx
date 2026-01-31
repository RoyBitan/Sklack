/**
 * Error Boundary Components
 *
 * This module provides granular error boundaries for different parts of the app.
 * Prevents one feature crash from taking down the entire application.
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Home,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI to render on error */
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Feature name for error reporting */
  featureName?: string;
  /** Allow retry without full page reload */
  allowRetry?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ============================================================================
// Main Error Boundary Component
// ============================================================================

export class FeatureErrorBoundary
  extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, featureName } = this.props;

    // Log with feature context
    console.error(
      `[ErrorBoundary${featureName ? `: ${featureName}` : ""}]`,
      error,
      errorInfo,
    );

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // TODO: Send to error tracking service (Sentry, etc.)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, allowRetry = true } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        if (typeof fallback === "function") {
          return fallback(error, this.resetError);
        }
        return fallback;
      }

      // Default inline fallback
      return (
        <DefaultFeatureError
          error={error}
          onRetry={allowRetry ? this.resetError : undefined}
          featureName={this.props.featureName}
        />
      );
    }

    return children;
  }
}

// ============================================================================
// Default Feature Error Fallback
// ============================================================================

interface DefaultFeatureErrorProps {
  error: Error;
  onRetry?: () => void;
  featureName?: string;
}

const DefaultFeatureError: React.FC<DefaultFeatureErrorProps> = ({
  error,
  onRetry,
  featureName,
}) => (
  <div className="bg-red-50/50 border-2 border-red-100 rounded-2xl p-8 text-center animate-fade-in">
    <div className="w-14 h-14 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
      <AlertCircle size={28} />
    </div>
    <h3 className="text-lg font-black text-gray-900 mb-2">
      {featureName ? `שגיאה ב${featureName}` : "אירעה שגיאה"}
    </h3>
    <p className="text-sm text-gray-500 mb-4">
      לא הצלחנו לטעון את התוכן. נסה שוב או חזור מאוחר יותר.
    </p>
    <div className="bg-white/50 p-3 rounded-xl mb-4 border border-red-100">
      <code className="text-[10px] text-red-400 font-mono break-all">
        {error.message}
      </code>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-all active:scale-95"
      >
        <RefreshCw size={16} />
        נסה שוב
      </button>
    )}
  </div>
);

// ============================================================================
// Pre-built Feature Fallbacks
// ============================================================================

interface FeatureFallbackProps {
  error: Error;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
}

/** Fallback for Tasks list/view errors */
export const TasksErrorFallback: React.FC<FeatureFallbackProps> = ({
  error,
  onRetry,
  onGoHome,
}) => (
  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-2 border-purple-200 rounded-3xl p-10 text-center max-w-lg mx-auto my-8 shadow-lg">
    <div className="w-20 h-20 bg-purple-100 text-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
      <AlertCircle size={40} />
    </div>
    <h3 className="text-2xl font-black text-gray-900 mb-3">
      שגיאה בטעינת המשימות
    </h3>
    <p className="text-gray-500 font-medium mb-6">
      לא הצלחנו לטעון את רשימת המשימות. ייתכן שמדובר בבעיה זמנית.
    </p>
    <div className="bg-white/70 p-4 rounded-2xl mb-6 border border-purple-100">
      <code className="text-xs text-purple-400 font-mono">{error.message}</code>
    </div>
    <div className="flex gap-3 justify-center">
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-all active:scale-95"
        >
          <RefreshCw size={18} />
          טען מחדש
        </button>
      )}
      {onGoHome && (
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95"
        >
          <Home size={18} />
          לדף הבית
        </button>
      )}
    </div>
  </div>
);

/** Fallback for Appointments errors */
export const AppointmentsErrorFallback: React.FC<FeatureFallbackProps> = ({
  error,
  onRetry,
}) => (
  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200 rounded-3xl p-10 text-center max-w-lg mx-auto my-8 shadow-lg">
    <div className="w-20 h-20 bg-blue-100 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
      <AlertCircle size={40} />
    </div>
    <h3 className="text-2xl font-black text-gray-900 mb-3">
      שגיאה בטעינת התורים
    </h3>
    <p className="text-gray-500 font-medium mb-6">
      לא הצלחנו לטעון את התורים. נסה לרענן את הדף.
    </p>
    <div className="bg-white/70 p-4 rounded-2xl mb-6 border border-blue-100">
      <code className="text-xs text-blue-400 font-mono">{error.message}</code>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all active:scale-95"
      >
        <RefreshCw size={18} />
        טען מחדש
      </button>
    )}
  </div>
);

/** Fallback for Vehicles errors */
export const VehiclesErrorFallback: React.FC<FeatureFallbackProps> = ({
  error,
  onRetry,
}) => (
  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-2 border-amber-200 rounded-3xl p-10 text-center max-w-lg mx-auto my-8 shadow-lg">
    <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
      <AlertCircle size={40} />
    </div>
    <h3 className="text-2xl font-black text-gray-900 mb-3">
      שגיאה בטעינת הרכבים
    </h3>
    <p className="text-gray-500 font-medium mb-6">
      לא הצלחנו לטעון את רשימת הרכבים.
    </p>
    <div className="bg-white/70 p-4 rounded-2xl mb-6 border border-amber-100">
      <code className="text-xs text-amber-400 font-mono">{error.message}</code>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all active:scale-95"
      >
        <RefreshCw size={18} />
        טען מחדש
      </button>
    )}
  </div>
);

/** Fallback for Dashboard errors */
export const DashboardErrorFallback: React.FC<FeatureFallbackProps> = ({
  error,
  onRetry,
}) => (
  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-200 rounded-3xl p-10 text-center max-w-lg mx-auto my-8 shadow-lg">
    <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
      <AlertCircle size={40} />
    </div>
    <h3 className="text-2xl font-black text-gray-900 mb-3">
      שגיאה בטעינת הדשבורד
    </h3>
    <p className="text-gray-500 font-medium mb-6">
      לא הצלחנו לטעון את לוח הבקרה. נסה לרענן.
    </p>
    <div className="bg-white/70 p-4 rounded-2xl mb-6 border border-emerald-100">
      <code className="text-xs text-emerald-400 font-mono">
        {error.message}
      </code>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all active:scale-95"
      >
        <RefreshCw size={18} />
        טען מחדש
      </button>
    )}
  </div>
);

/** Fallback for Card/Widget level errors (compact) */
export const CardErrorFallback: React.FC<
  { error: Error; onRetry?: () => void }
> = ({
  error,
  onRetry,
}) => (
  <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
    <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
    <p className="text-xs text-red-500 font-bold mb-2">שגיאה בטעינה</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-[10px] text-red-600 underline hover:no-underline"
      >
        נסה שוב
      </button>
    )}
  </div>
);

/** Fallback for Detail View errors (with back button) */
export const DetailViewErrorFallback: React.FC<FeatureFallbackProps> = ({
  error,
  onRetry,
  onGoBack,
}) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md w-full border-t-8 border-red-500">
      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <AlertCircle size={40} />
      </div>
      <h3 className="text-2xl font-black text-gray-900 mb-3">
        לא הצלחנו לטעון את הפרטים
      </h3>
      <p className="text-gray-500 font-medium mb-6">
        ייתכן שהפריט לא קיים או שאין לך הרשאה לצפות בו.
      </p>
      <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
        <code className="text-xs text-gray-400 font-mono">{error.message}</code>
      </div>
      <div className="flex gap-3 justify-center">
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95"
          >
            <ArrowLeft size={18} />
            חזור
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all active:scale-95"
          >
            <RefreshCw size={18} />
            נסה שוב
          </button>
        )}
      </div>
    </div>
  </div>
);

// ============================================================================
// HOC for Easy Wrapping
// ============================================================================

/**
 * Higher-Order Component to wrap any component with an error boundary
 *
 * Usage:
 *   const SafeTasksList = withErrorBoundary(TasksListView, {
 *     featureName: 'משימות',
 *     fallback: TasksErrorFallback
 *   });
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<ErrorBoundaryProps, "children">,
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name ||
    "Component";

  const WithErrorBoundary: React.FC<P> = (props) => (
    <FeatureErrorBoundary {...options}>
      <WrappedComponent {...props} />
    </FeatureErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return WithErrorBoundary;
}

// ============================================================================
// Legacy Export (for backward compatibility)
// ============================================================================

/**
 * Full-page error boundary (legacy global error boundary)
 * Use FeatureErrorBoundary for granular error handling
 */
class GlobalErrorBoundary
  extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[GlobalErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center font-heebo"
          dir="rtl"
        >
          <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border-t-[12px] border-red-500 animate-bounce-in">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <AlertCircle size={40} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">
              אופס! משהו השתבש
            </h1>
            <p className="text-gray-500 font-bold mb-8 leading-relaxed">
              נתקלנו בשגיאה בלתי צפויה במערכת. אל דאגה, המידע שלך שמור בבטחה.
            </p>
            <div className="bg-gray-50 p-4 rounded-2xl mb-8 border border-gray-100">
              <code className="text-[10px] text-red-400 font-mono break-all">
                {this.state.error?.message || "Unknown error"}
              </code>
            </div>
            <button
              onClick={this.handleReset}
              className="btn-primary w-full flex items-center justify-center gap-3 active:scale-95 transition-all py-5 text-lg"
            >
              <RotateCcw size={20} />
              <span>חזור לדף הבית</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
