"use client";

import { AnimatePresence, motion, useAnimation } from "motion/react";
import type { HTMLAttributes, RefObject } from "react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export type GripIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

interface GripIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const CIRCLES = [
  { cx: 19, cy: 5 }, // Top right
  { cx: 12, cy: 5 }, // Top middle
  { cx: 19, cy: 12 }, // Middle right
  { cx: 5, cy: 5 }, // Top left
  { cx: 12, cy: 12 }, // Center
  { cx: 19, cy: 19 }, // Bottom right
  { cx: 5, cy: 12 }, // Middle left
  { cx: 12, cy: 19 }, // Bottom middle
  { cx: 5, cy: 19 }, // Bottom left
];

const GripIcon = ({
  onMouseEnter,
  onMouseLeave,
  className,
  size = 28,
  ref,
  ...props
}: GripIconProps & { ref?: RefObject<GripIconHandle | null> }) => {
  const [isHovered, setIsHovered] = useState(false);
  const controls = useAnimation();
  const isControlledRef = useRef(false);
  const animationRef = useRef<boolean>(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;

    return {
      startAnimation: async () => setIsHovered(true),
      stopAnimation: () => setIsHovered(false),
    };
  });

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e);
      } else {
        setIsHovered(true);
      }
    },
    [onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e);
      } else {
        setIsHovered(false);
      }
    },
    [onMouseLeave]
  );

  useEffect(() => {
    const animateCircles = async () => {
      if (isHovered && !animationRef.current) {
        animationRef.current = true;

        // Continuous loop animation
        while (animationRef.current) {
          if (!animationRef.current) {
            break;
          }

          await controls.start((i) => ({
            opacity: 0.3,
            transition: {
              delay: i * 0.1,
              duration: 0.2,
            },
          }));

          if (!animationRef.current) {
            break;
          }

          await controls.start((i) => ({
            opacity: 1,
            transition: {
              delay: i * 0.1,
              duration: 0.2,
            },
          }));

          // Small pause before next cycle
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } else if (!isHovered && animationRef.current) {
        animationRef.current = false;
        // Reset to normal state when stopped
        controls.start({
          opacity: 1,
          transition: { duration: 0.1 },
        });
      }
    };

    animateCircles();
  }, [isHovered, controls]);

  return (
    <div
      className={cn(className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <AnimatePresence>
          {CIRCLES.map((circle, index) => (
            <motion.circle
              animate={controls}
              custom={index}
              cx={circle.cx}
              cy={circle.cy}
              exit="initial"
              initial="initial"
              key={`${circle.cx}-${circle.cy}`}
              r="1"
              variants={{
                initial: {
                  opacity: 1,
                },
              }}
            />
          ))}
        </AnimatePresence>
      </svg>
    </div>
  );
};

GripIcon.displayName = "GripIcon";

export { GripIcon };
