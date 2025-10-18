import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

function Spinner({
  className,
  ...props
}: Omit<React.ComponentProps<"svg">, "size" | "strokeWidth">) {
  return (
    <HugeiconsIcon
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      icon={Loading03Icon}
      role="status"
      strokeWidth={1.5}
      {...props}
    />
  );
}

export { Spinner };
