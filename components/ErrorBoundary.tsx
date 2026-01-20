import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center font-heebo" dir="rtl">
                    <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border-t-[12px] border-red-500 animate-bounce-in">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <AlertCircle size={40} />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">אופס! משהו השתבש</h1>
                        <p className="text-gray-500 font-bold mb-8 leading-relaxed">
                            נתקלנו בשגיאה בלתי צפויה במערכת. אל דאגה, המידע שלך שמור בבטחה.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-2xl mb-8 border border-gray-100">
                            <code className="text-[10px] text-red-400 font-mono break-all">
                                {this.state.error?.message || 'Unknown error'}
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

export default ErrorBoundary;
