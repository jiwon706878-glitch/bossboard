"use client";

import { useEffect } from "react";
import { initializePaddle } from "@paddle/paddle-js";

let paddleInitialized = false;

export function PaddleProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (paddleInitialized) return;
    paddleInitialized = true;

    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;

    initializePaddle({
      token,
      environment:
        process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
          ? "production"
          : "sandbox",
    });
  }, []);

  return <>{children}</>;
}
