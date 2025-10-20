import type React from "react";
import { cn } from "@/lib/utils";

type ProgressRingProps = {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  label?: string;
  color?: "primary" | "warning" | "success" | "danger";
};

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max,
  size = 48,
  strokeWidth = 4,
  className,
  showLabel = true,
  label,
  color = "primary",
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const strokeDasharray = `${progress * circumference}, ${circumference}`;

  const colorClasses = {
    primary: "stroke-primary",
    warning: "stroke-orange-500",
    success: "stroke-green-500",
    danger: "stroke-red-500",
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        className="-rotate-90 transform"
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        width={size}
      >
        {/* Background circle */}
        <circle
          className="stroke-muted"
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          className={cn(colorClasses[color], "transition-all duration-300")}
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          style={{
            transition: "stroke-dasharray 0.3s ease-in-out",
          }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-semibold text-foreground text-xs">
            {value}/{max}
          </span>
          {label && (
            <span className="text-[10px] text-muted-foreground leading-none">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
