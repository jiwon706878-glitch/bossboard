"use client";

import React from "react";
import { captureError } from "@/lib/error-tracking";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("BB ErrorBoundary:", error, info);
    // Mirror to Sentry + Supabase error_logs so render-time errors land
    // in the /admin/launch dashboard alongside JS runtime errors.
    captureError(error, { type: "js_error" });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto mt-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Something went wrong.</h1>
          <p className="text-gray-400 text-sm mb-4">
            BossBoard hit an unexpected error. Your local files are untouched.
          </p>
          {this.state.error && (
            <pre className="text-left text-xs text-red-300 bg-red-900/20 border border-red-800 rounded-md p-3 mb-4 overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
