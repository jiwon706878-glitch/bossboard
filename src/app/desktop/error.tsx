"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function DesktopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
      <p className="text-gray-400 mb-6 max-w-md text-center">{error.message}</p>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
        >
          Try again
        </button>
        <button
          onClick={() => (window.location.href = "/desktop/dashboard")}
          className="px-4 py-2 border border-bb-border hover:bg-bb-card rounded-md text-sm"
        >
          Back to Dashboard
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-6">
        Error reported automatically. Email jay@mybossboard.com if it persists.
      </p>
    </div>
  );
}
