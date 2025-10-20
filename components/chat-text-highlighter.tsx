"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ChatTextHighlighterProps = {
  children: React.ReactNode;
  onHighlight?: (text: string) => void;
  className?: string;
  removeHighlightOnClick?: boolean;
};

type PopupPosition = {
  x: number;
  y: number;
  text: string;
};

export const ChatTextHighlighter: React.FC<ChatTextHighlighterProps> = ({
  children,
  onHighlight,
  className,
}) => {
  const [popup, setPopup] = useState<PopupPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_err) {
      // Fallback method
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
      } catch (_fallbackErr) {}
      document.body.removeChild(textArea);
    }
  }, []);

  const handleQuote = useCallback(
    (text: string) => {
      if (onHighlight) {
        onHighlight(text);
      }
    },
    [onHighlight]
  );

  const handlePointerUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setPopup(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();

    if (!text || text.length < 2) {
      setPopup(null);
      return;
    }

    if (
      containerRef.current &&
      !containerRef.current.contains(range.commonAncestorContainer)
    ) {
      setPopup(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (containerRect) {
      setPopup({
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top - containerRect.top - 8,
        text,
      });
    }
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as Node;
      if (popupRef.current?.contains(target)) {
        return;
      }
      setPopup(null);
    },
    []
  );

  const closePopup = useCallback(() => {
    setPopup(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    const handleScrollOrResize = () => setPopup(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPopup(null);
      }
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      className={cn("relative", className)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      ref={containerRef}
    >
      {children}

      {popup && (
        <div
          className="selection-popup pointer-events-auto absolute z-50 rounded-md border border-border bg-background p-1.5 shadow-lg"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          ref={popupRef}
          style={{
            left: popup.x,
            top: popup.y,
            transform: "translateX(-50%) translateY(-100%)",
          }}
        >
          <div className="flex gap-1">
            <button
              className="rounded bg-primary px-2 py-1 font-medium text-primary-foreground text-xs transition-colors hover:bg-primary/90"
              onClick={async () => {
                await handleCopy(popup.text);
                closePopup();
              }}
            >
              Copy
            </button>

            <button
              className="rounded bg-secondary px-2 py-1 font-medium text-secondary-foreground text-xs transition-colors hover:bg-secondary/90"
              onClick={() => {
                handleQuote(popup.text);
                closePopup();
              }}
            >
              Quote
            </button>

            <button
              className="px-1.5 py-1 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
              onClick={closePopup}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatTextHighlighter;
