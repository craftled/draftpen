"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Home,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { Baumans, Be_Vietnam_Pro, Inter } from "next/font/google";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: "variable",
  display: "swap",
  preload: true,
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  variable: "--font-be-vietnam-pro",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
});

const baumans = Baumans({
  subsets: ["latin"],
  variable: "--font-baumans",
  weight: "400",
  display: "swap",
  preload: true,
});

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Central place to hook real error reporting (Sentry, PostHog, etc.)
    // e.g. reportError(error);
    // eslint-disable-next-line no-console
    console.error("[GlobalErrorBoundary]", error);
  }, [error]);

  const details = [
    error.message && `Message: ${error.message}`,
    error.name && `Name: ${error.name}`,
    error.digest && `Digest: ${error.digest}`,
    error.stack && `Stack:\n${error.stack}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // swallow
    }
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${beVietnamPro.variable} ${baumans.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
        suppressHydrationWarning
      >
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg"
            initial={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="relative overflow-hidden rounded-2xl border bg-card/60 p-8 shadow-lg backdrop-blur-sm">
              {/* Subtle background decoration */}
              <div className="pointer-events-none absolute inset-0">
                <div className="-top-24 -right-20 absolute size-56 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />
                <div className="-bottom-28 -left-20 absolute size-72 rounded-full bg-secondary/10 blur-3xl dark:bg-secondary/20" />
              </div>

              <div className="relative flex flex-col items-center gap-5 text-center">
                <div className="inline-flex size-16 items-center justify-center rounded-full border bg-accent/30 shadow-sm dark:bg-accent/20">
                  <TriangleAlert className="size-8 text-destructive" />
                </div>

                <h1 className="font-be-vietnam-pro font-semibold text-3xl tracking-tight md:text-4xl">
                  Something broke
                </h1>

                <p className="text-muted-foreground leading-relaxed">
                  A global application error occurred. You can try to recover,
                  or head back to the home page. If this keeps happening, feel
                  free to report it.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button className="rounded-full" onClick={reset}>
                    <RefreshCw className="size-4" />
                    Try again
                  </Button>

                  <Link href="/" prefetch>
                    <Button className="rounded-full" variant="outline">
                      <Home className="size-4" />
                      Home
                    </Button>
                  </Link>

                  <Button
                    className="rounded-full"
                    onClick={() => setShowDetails((s) => !s)}
                    type="button"
                    variant="ghost"
                  >
                    {showDetails ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                    {showDetails ? "Hide details" : "Show details"}
                  </Button>
                </div>

                <AnimatePresence initial={false}>
                  {showDetails && (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      className="w-full overflow-hidden"
                      exit={{ height: 0, opacity: 0 }}
                      initial={{ height: 0, opacity: 0 }}
                      key="details"
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="relative mt-2 rounded-lg border bg-muted/40 text-left dark:bg-muted/30">
                        <pre className="scrollbar-thin max-h-72 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed">
                          {details ||
                            "No additional diagnostic information available."}
                        </pre>

                        {details && (
                          <div className="-mt-1 flex justify-end gap-2 px-4 pb-4">
                            <Button
                              className="h-7 gap-1.5 px-2 text-xs"
                              onClick={handleCopy}
                              size="sm"
                              variant="outline"
                            >
                              <Copy className="size-3.5" />
                              {copied ? "Copied" : "Copy"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="pt-4 text-muted-foreground text-xs">
                  Error boundary: global / Root. Runtime may have partial state
                  loss.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </body>
    </html>
  );
}
