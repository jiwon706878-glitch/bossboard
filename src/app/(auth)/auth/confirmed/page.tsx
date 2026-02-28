"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  drift: number;
}

function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const colors = [
      "#4F46E5", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6",
      "#EC4899", "#06B6D4", "#F97316",
    ];
    const generated: Particle[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.8,
      size: Math.random() * 6 + 4,
      drift: (Math.random() - 0.5) * 40,
    }));
    setParticles(generated);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            "--drift": `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(var(--drift)) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti-fall 2.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default function ConfirmedPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  const goToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          goToDashboard();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [goToDashboard]);

  return (
    <>
      <Confetti />
      <Card className="text-center">
        <CardContent className="pt-10 pb-8 space-y-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Email verified!</h1>
            <p className="text-lg text-muted-foreground">
              Welcome to BossBoard
            </p>
          </div>
          <Button size="lg" onClick={goToDashboard} className="gap-2">
            Go to Dashboard
          </Button>
          <p className="text-sm text-muted-foreground">
            Redirecting in {countdown}s...
          </p>
        </CardContent>
      </Card>
    </>
  );
}
