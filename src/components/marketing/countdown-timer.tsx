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

  if (!time) {
    return (
      <div className="mt-6 flex items-center justify-center gap-3">
        {["Days", "Hours", "Min", "Sec"].map((label) => (
          <div key={label} className="text-center">
            <div className="rounded-lg bg-primary/10 px-3 py-2 text-2xl font-bold tabular-nums sm:px-4 sm:text-3xl">
              --
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    );
  }

  const units = [
    { label: "Days", value: time.days },
    { label: "Hours", value: time.hours },
    { label: "Min", value: time.minutes },
    { label: "Sec", value: time.seconds },
  ];

  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      {units.map((u) => (
        <div key={u.label} className="text-center">
          <div className="rounded-lg bg-primary/10 px-3 py-2 text-2xl font-bold tabular-nums sm:px-4 sm:text-3xl">
            {String(u.value).padStart(2, "0")}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{u.label}</p>
        </div>
      ))}
    </div>
  );
}
