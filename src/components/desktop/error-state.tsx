"use client";

import { AlertCircle, RotateCw } from "lucide-react";

export function ErrorState({ error, retry }: { error: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
      <p className="text-gray-400 mb-6 max-w-md font-mono text-sm">{error}</p>
      {retry && (
        <button
          onClick={retry}
          className="flex items-center gap-2 px-4 py-2 bg-bb-card border border-bb-border hover:border-bb-primary rounded-md text-sm"
        >
          <RotateCw className="w-4 h-4" /> Try again
        </button>
      )}
    </div>
  );
}
