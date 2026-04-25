"use client";

import { User } from "lucide-react";

interface AvatarProps {
  email?: string;
  displayName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "w-6 h-6 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-16 h-16 text-2xl",
};

const ICON_CLASSES = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-8 h-8",
};

export function Avatar({ email, displayName, size = "md", className = "" }: AvatarProps) {
  const initial = (displayName?.[0] || email?.[0] || "").toUpperCase();

  if (initial) {
    return (
      <div
        className={`${SIZE_CLASSES[size]} bg-gradient-to-br from-bb-primary to-blue-700 rounded-full flex items-center justify-center text-white font-semibold ${className}`}
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      className={`${SIZE_CLASSES[size]} bg-bb-card rounded-full flex items-center justify-center text-gray-500 ${className}`}
    >
      <User className={ICON_CLASSES[size]} />
    </div>
  );
}
