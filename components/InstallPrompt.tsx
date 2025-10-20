"use client";

import { Share } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { SciraLogo } from "@/components/logos/scira-logo";
import { useLocalStorage } from "@/hooks/use-local-storage";

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useLocalStorage(
    "installPromptDismissed",
    false
  );

  useEffect(() => {
    if (isDismissed) {
      return;
    }

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(navigator as any).standalone &&
      !("MSStream" in window);

    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;

    if (isIOS && !isStandalone) {
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isDismissed]);

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
  };

  return (
    <AnimatePresence>
      {showPrompt && !isDismissed && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="md:-translate-x-1/2 fixed top-4 right-4 left-4 z-100 overflow-hidden rounded-lg border border-border bg-card p-3 text-card-foreground shadow-xl md:left-1/2 md:w-auto md:max-w-sm"
          exit={{ opacity: 0, y: -30, transition: { duration: 0.2 } }}
          initial={{ opacity: 0, y: -30 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-start justify-between gap-3">
            {/* App Icon */}
            <SciraLogo className="size-9" />
            <div className="flex-grow">
              <p className="font-semibold text-foreground text-sm">
                Install Scira on your device
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-muted-foreground text-xs">
                Tap <Share className="h-3 w-3 text-primary" /> then &quot;Add to
                Home Screen&quot;{" "}
                <span
                  aria-label="plus icon"
                  className="font-medium text-primary"
                  role="img"
                >
                  ➕
                </span>
              </p>
            </div>

            {/* Close Button */}
            <motion.button
              aria-label="Close install prompt"
              className="-mr-1 -mt-1 flex-shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
              onClick={handleDismiss}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg
                fill="currentColor"
                height="16"
                viewBox="0 0 16 16"
                width="16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
              </svg>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
