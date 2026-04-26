"use client";

import { APIKeyManager } from "@/components/desktop/api-key-manager";

export default function AIProvidersPage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">AI Providers</h1>
      <p className="text-sm text-gray-400 mb-6">
        Bring your own API keys for any AI model you want to use. BossBoard charges $0
        for AI usage — your provider bills you directly.
      </p>
      <div className="p-6 bg-bb-card rounded-md border border-bb-border">
        <APIKeyManager />
      </div>
    </div>
  );
}
