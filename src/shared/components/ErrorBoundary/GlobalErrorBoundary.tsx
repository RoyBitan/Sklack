import React from "react";
import * as Sentry from "@sentry/react";
import { Button, Card, SklackLogo } from "@/src/shared/components/ui";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";

const ErrorFallback = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <Card
        variant="premium"
        padding="lg"
        className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500"
      >
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-red-100 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-white p-6 rounded-full shadow-xl border border-red-50 border-gray-100">
              <AlertTriangle className="text-red-500 w-12 h-12" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            אופס! משהו השתבש
          </h1>
          <p className="text-gray-500 font-medium leading-relaxed">
            נתקלנו בשגיאה בלתי צפויה. המערכת דיווחה על התקלה לצוות הפיתוח שלנו
            באופן אוטומטי.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-4">
          <Button
            variant="primary"
            size="lg"
            className="w-full gap-3 shadow-lg shadow-black/10"
            onClick={() => window.location.reload()}
          >
            <RefreshCcw size={20} />
            נסה שוב
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="w-full gap-3"
            onClick={() => window.location.href = "/"}
          >
            <Home size={20} />
            חזרה לדף הבית
          </Button>
        </div>

        <div className="pt-6 flex justify-center opacity-20 grayscale">
          <SklackLogo size={32} />
        </div>
      </Card>
    </div>
  );
};

interface Props {
  children: React.ReactNode;
}

export class GlobalErrorBoundary extends React.Component<Props> {
  render() {
    return (
      <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
        {this.props.children}
      </Sentry.ErrorBoundary>
    );
  }
}
