"use client";

import confetti from "canvas-confetti";
import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Initial burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Side cannons
    const end = Date.now() + 3 * 1000; // 3 seconds
    const colors = [
      "hsl(var(--foreground))",
      "hsl(var(--muted-foreground))",
      "hsl(var(--border))",
    ];

    const frame = () => {
      if (Date.now() > end) return;

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors,
      });

      requestAnimationFrame(frame);
    };

    // Delay the side cannons slightly
    setTimeout(() => {
      frame();
    }, 500);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        {/* Success Icon */}
        <div className="mx-auto mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Check className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Content */}
        <h1 className="mb-4 font-light text-2xl text-foreground tracking-tight">
          Welcome to Draftpen Pro
        </h1>
        <p className="mb-8 text-muted-foreground">
          Your subscription is active. Start writing.
        </p>

        {/* Action */}
        <Button
          className="h-9 bg-primary px-6 font-normal text-primary-foreground text-sm hover:bg-primary/90"
          onClick={() => router.push("/")}
        >
          Start writing
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
