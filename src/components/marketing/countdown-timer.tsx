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
    { label: "Min", value: time?.minutes },
    { label: "Sec", value: time?.seconds },
  ];

  return (
    <div className="flex items-center justify-start gap-3 sm:gap-4">
      {units.map((u, i) => (
        <div key={u.label} className="flex items-center gap-3 sm:gap-4">
          <div className="text-center">
            <div
              className="rounded-md px-3 py-2 sm:px-5 sm:py-3"
              style={{
                backgroundColor: "#141824",
                border: "1px solid #2A3050",
                fontFamily: "'JetBrains Mono', monospace",
                color: "#E8ECF4",
                fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {u.value != null ? String(u.value).padStart(2, "0") : "--"}
            </div>
            <p
              className="mt-1.5 text-xs font-medium"
              style={{ color: "#5A6480" }}
            >
              {u.label}
            </p>
          </div>
          {i < units.length - 1 && (
            <span
              className="text-xl sm:text-2xl font-medium"
              style={{ color: "#2A3050" }}
            >
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
