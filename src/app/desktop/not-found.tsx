"use client";

import Link from "next/link";

export default function DesktopNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-gray-400 mb-6">This feature isn&apos;t built yet or the link is broken.</p>
      <Link
        href="/desktop/dashboard"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
