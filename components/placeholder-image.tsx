import { ImageIcon } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

type PlaceholderImageProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "card" | "compact";
};

const PlaceholderImage: React.FC<PlaceholderImageProps> = ({
  className,
  size = "md",
  variant = "default",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const variantClasses = {
    default:
      "bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800",
    card: "bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-700",
    compact: "bg-neutral-100 dark:bg-neutral-800",
  };

  // Circular grid pattern using SVG
  const CircularGrid = () => (
    <svg
      className="absolute inset-0 h-full w-full opacity-30"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Concentric circles */}
      <circle
        cx="50"
        cy="50"
        fill="none"
        r="10"
        stroke="currentColor"
        strokeWidth="0.5"
      />
      <circle
        cx="50"
        cy="50"
        fill="none"
        r="20"
        stroke="currentColor"
        strokeWidth="0.5"
      />
      <circle
        cx="50"
        cy="50"
        fill="none"
        r="30"
        stroke="currentColor"
        strokeWidth="0.5"
      />
      <circle
        cx="50"
        cy="50"
        fill="none"
        r="40"
        stroke="currentColor"
        strokeWidth="0.3"
      />

      {/* Radial lines */}
      <line
        stroke="currentColor"
        strokeWidth="0.3"
        x1="50"
        x2="50"
        y1="10"
        y2="90"
      />
      <line
        stroke="currentColor"
        strokeWidth="0.3"
        x1="10"
        x2="90"
        y1="50"
        y2="50"
      />
      <line
        stroke="currentColor"
        strokeWidth="0.3"
        x1="22.9"
        x2="77.1"
        y1="22.9"
        y2="77.1"
      />
      <line
        stroke="currentColor"
        strokeWidth="0.3"
        x1="77.1"
        x2="22.9"
        y1="22.9"
        y2="77.1"
      />

      {/* Smaller dots at intersections */}
      <circle cx="50" cy="30" fill="currentColor" r="0.8" />
      <circle cx="50" cy="70" fill="currentColor" r="0.8" />
      <circle cx="30" cy="50" fill="currentColor" r="0.8" />
      <circle cx="70" cy="50" fill="currentColor" r="0.8" />
      <circle cx="35.8" cy="35.8" fill="currentColor" r="0.6" />
      <circle cx="64.2" cy="35.8" fill="currentColor" r="0.6" />
      <circle cx="35.8" cy="64.2" fill="currentColor" r="0.6" />
      <circle cx="64.2" cy="64.2" fill="currentColor" r="0.6" />
    </svg>
  );

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-md transition-colors",
        variantClasses[variant],
        className
      )}
    >
      {/* Circular grid background */}
      <div className="absolute inset-0 text-neutral-300 dark:text-neutral-700">
        <CircularGrid />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-2">
        <div className="rounded-full bg-neutral-200 p-2 transition-colors dark:bg-neutral-800">
          <ImageIcon
            className={cn(
              "text-neutral-500 transition-colors dark:text-neutral-400",
              sizeClasses[size]
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default PlaceholderImage;
