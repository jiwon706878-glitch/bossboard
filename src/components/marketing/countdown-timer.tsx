"use client";

import { useEffect, useState } from "react";

const LAUNCH_DATE = new Date("2026-03-15T00:00:00");

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(): TimeLeft {
  const diff = LAUNCH_DATE.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function CountdownTimer() {
  const [time, setTime] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setTime(getTimeLeft());
    const interval = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  const units = [
    { label: "Days", value: time?.days },
    { label: "Hours", value: time?.hours },
    { label: "Minutes", value: time?.minutes },
    { label: "Seconds", value: time?.seconds },
  ];

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      {units.map((u, i) => (
        <div key={u.label} className="flex items-center gap-3 sm:gap-4">
          <div className="text-center">
            <div className="rounded-xl bg-primary/10 px-4 py-3 text-3xl font-bold tabular-nums sm:px-6 sm:py-4 sm:text-5xl">
              {u.value != null ? String(u.value).padStart(2, "0") : "--"}
            </div>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
              {u.label}
            </p>
          </div>
          {i < units.length - 1 && (
            <span className="text-2xl font-bold text-muted-foreground/50 sm:text-4xl">
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
