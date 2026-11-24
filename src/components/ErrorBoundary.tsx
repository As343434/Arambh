import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  details: string | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '', details: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let parsedDetails: string | null = null;
    let message = error.message || 'An unexpected error occurred.';

    try {
      const parsed = JSON.parse(error.message);
      if (parsed && parsed.operationType && parsed.error) {
        message = `Database ${parsed.operationType} failed on "${parsed.path || 'unknown'}"`;
        parsedDetails = parsed.error;
      }
    } catch {
      // Plain error message
    }

    return { hasError: true, errorMessage: message, details: parsedDetails };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFFFFF] dark:bg-zinc-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-semibold text-[#111111] dark:text-zinc-100">Application Error</h2>
            </div>
            <p className="text-sm text-[#3F3F46] dark:text-slate-300 mb-3">{this.state.errorMessage}</p>
            {this.state.details && (
              <pre className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-[#3F3F46] dark:text-slate-300 p-3 rounded-lg overflow-x-auto mb-6">
                {this.state.details}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
