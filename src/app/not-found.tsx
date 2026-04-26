"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window);
  }, []);

  const homeUrl = isTauri ? "/desktop/dashboard" : "/";
  const homeLabel = isTauri ? "Go to Dashboard" : "Go Home";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-4 animate-fade-in">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="mt-4 text-xl font-semibold">Page not found</p>
      <p className="mt-2 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href={homeUrl} className="mt-6">
        <Button>{homeLabel}</Button>
      </Link>
    </div>
  );
}
