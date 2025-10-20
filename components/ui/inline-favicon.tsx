"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const DEFAULT_FAVICON_FALLBACK =
  "https://www.google.com/s2/favicons?sz=64&domain=example.com";

export type InlineFaviconProps = {
  alt: string;
  className?: string;
  fallbackSrc?: string | null;
  size?: number;
  src?: string | null;
};

export function InlineFavicon({
  alt,
  className,
  fallbackSrc = DEFAULT_FAVICON_FALLBACK,
  size = 16,
  src,
}: InlineFaviconProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(
    src ?? fallbackSrc ?? null
  );

  useEffect(() => {
    setCurrentSrc(src ?? fallbackSrc ?? null);
  }, [fallbackSrc, src]);

  if (!currentSrc) {
    const initial = alt.trim().charAt(0).toUpperCase() || "?";
    return (
      <div
        aria-label={alt}
        className={cn(
          "flex items-center justify-center rounded-full bg-neutral-200 font-semibold text-[10px] text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200",
          className
        )}
        role="img"
        style={{ height: size, width: size }}
      >
        <span aria-hidden>{initial}</span>
      </div>
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      height={size}
      onError={() => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
          return;
        }
        setCurrentSrc(null);
      }}
      src={currentSrc}
      width={size}
    />
  );
}
