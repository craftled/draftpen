"use client";

// Icons
import {
  ChevronDown,
  Copy,
  Loader2,
  type LucideIcon,
  XCircle,
} from "lucide-react";
import { memo, useEffect, useState } from "react";

// UI Components
import { BorderTrail } from "@/components/core/border-trail";
import { TextShimmer } from "@/components/core/text-shimmer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const SearchLoadingState = ({
  icon: Icon,
  text,
  color,
}: {
  icon: LucideIcon;
  text: string;
  color: "red" | "green" | "orange" | "violet" | "gray" | "blue";
}) => {
  const colorVariants = {
    red: {
      background: "bg-red-50 dark:bg-red-950",
      border:
        "from-red-200 via-red-500 to-red-200 dark:from-red-400 dark:via-red-500 dark:to-red-700",
      text: "text-red-500",
      icon: "text-red-500",
    },
    green: {
      background: "bg-green-50 dark:bg-green-950",
      border:
        "from-green-200 via-green-500 to-green-200 dark:from-green-400 dark:via-green-500 dark:to-green-700",
      text: "text-green-500",
      icon: "text-green-500",
    },
    orange: {
      background: "bg-orange-50 dark:bg-orange-950",
      border:
        "from-orange-200 via-orange-500 to-orange-200 dark:from-orange-400 dark:via-orange-500 dark:to-orange-700",
      text: "text-orange-500",
      icon: "text-orange-500",
    },
    violet: {
      background: "bg-violet-50 dark:bg-violet-950",
      border:
        "from-violet-200 via-violet-500 to-violet-200 dark:from-violet-400 dark:via-violet-500 dark:to-violet-700",
      text: "text-violet-500",
      icon: "text-violet-500",
    },
    gray: {
      background: "bg-neutral-50 dark:bg-neutral-950",
      border:
        "from-neutral-200 via-neutral-500 to-neutral-200 dark:from-neutral-400 dark:via-neutral-500 dark:to-neutral-700",
      text: "text-neutral-500",
      icon: "text-neutral-500",
    },
    blue: {
      background: "bg-blue-50 dark:bg-blue-950",
      border:
        "from-blue-200 via-blue-500 to-blue-200 dark:from-blue-400 dark:via-blue-500 dark:to-blue-700",
      text: "text-blue-500",
      icon: "text-blue-500",
    },
  };

  const variant = colorVariants[color];

  return (
    <Card className="relative my-4 h-[100px] w-full overflow-hidden shadow-none">
      <BorderTrail className={cn("bg-linear-to-l", variant.border)} size={80} />
      <CardContent className="px-6!">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-full",
                variant.background
              )}
            >
              <BorderTrail
                className={cn("bg-linear-to-l", variant.border)}
                size={40}
              />
              <Icon className={cn("h-5 w-5", variant.icon)} />
            </div>
            <div className="space-y-2">
              <TextShimmer className="font-medium text-base" duration={2}>
                {text}
              </TextShimmer>
              <div className="flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    className="h-1.5 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700"
                    key={i}
                    style={{
                      width: `${Math.random() * 40 + 20}px`,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Modern code interpreter components
const LineNumbers = memo(({ count }: { count: number }) => (
  <div className="hidden w-8 flex-shrink-0 select-none border-neutral-200 border-r bg-neutral-100 py-0 sm:block sm:w-10 dark:border-neutral-800 dark:bg-neutral-800/30">
    {Array.from({ length: count }, (_, i) => (
      <div
        className="flex h-[20px] items-center justify-end pr-2 font-mono text-[10px] text-neutral-500 dark:text-neutral-400"
        key={i}
      >
        {i + 1}
      </div>
    ))}
  </div>
));
LineNumbers.displayName = "LineNumbers";

const StatusBadge = memo(
  ({ status }: { status: "running" | "completed" | "error" }) => {
    if (status === "completed") return null;

    if (status === "error") {
      return (
        <div className="flex items-center gap-1 rounded-md bg-red-100 px-1.5 py-0.5 font-medium text-[9px] text-red-600 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="h-2.5 w-2.5" />
          <span className="hidden sm:inline">Error</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 rounded-md bg-blue-100 px-1.5 py-0.5 dark:bg-blue-500/20">
        <Loader2 className="h-2.5 w-2.5 animate-spin text-blue-500" />
        <span className="hidden font-medium text-[9px] text-blue-600 sm:inline dark:text-blue-400">
          Running
        </span>
      </div>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

const CodeBlock = memo(({ code }: { code: string; language: string }) => {
  const lines = code.split("\n");
  return (
    <div className="flex bg-neutral-50 dark:bg-neutral-900/70">
      <LineNumbers count={lines.length} />
      <div className="w-full overflow-x-auto">
        <pre className="m-0 px-2 py-0 font-mono text-[11px] text-neutral-800 leading-[20px] sm:px-3 sm:text-xs dark:text-neutral-300">
          {code}
        </pre>
      </div>
    </div>
  );
});
CodeBlock.displayName = "CodeBlock";

const OutputBlock = memo(
  ({ output, error }: { output?: string; error?: string }) => {
    if (!(output || error)) return null;

    return (
      <div
        className={cn(
          "px-2 py-0 font-mono text-[11px] leading-[20px] sm:px-3 sm:text-xs",
          error
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-300"
        )}
      >
        <pre className="overflow-x-auto whitespace-pre-wrap">
          {error || output}
        </pre>
      </div>
    );
  }
);

OutputBlock.displayName = "OutputBlock";

export function CodeInterpreterView({
  code,
  output,
  language = "python",
  title,
  status,
  error,
}: {
  code: string;
  output?: string;
  language?: string;
  title?: string;
  status?: "running" | "completed" | "error";
  error?: string;
}) {
  // Set initial state based on status - expanded while running, collapsed when complete
  const [isExpanded, setIsExpanded] = useState(status !== "completed");

  // Update expanded state when status changes
  useEffect(() => {
    // If status changes to completed, collapse the code section
    if (status === "completed" && (output || error)) {
      setIsExpanded(false);
    }
    // Keep expanded during running or error states
    else if (status === "running" || status === "error") {
      setIsExpanded(true);
    }
  }, [status, output, error]);

  return (
    <div className="group overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-all duration-200 hover:shadow dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-neutral-200 border-b bg-neutral-50 px-2.5 py-2 sm:px-3 dark:border-neutral-800 dark:bg-neutral-800/30">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 sm:gap-1.5 dark:bg-neutral-700/50">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <div className="font-medium font-mono text-[9px] text-neutral-500 uppercase dark:text-neutral-400">
              {language}
            </div>
          </div>
          <h3 className="max-w-[160px] truncate font-medium text-neutral-700 text-xs sm:max-w-xs dark:text-neutral-200">
            {title || "Code Execution"}
          </h3>
          <StatusBadge status={status || "completed"} />
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <CopyButton text={code} />
          <Button
            className="h-6 w-6 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            onClick={() => setIsExpanded(!isExpanded)}
            size="icon"
            variant="ghost"
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                isExpanded ? "rotate-180" : ""
              )}
            />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div>
          <div className="scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent max-h-60 max-w-full overflow-x-auto">
            <CodeBlock code={code} language={language} />
          </div>
          {(output || error) && (
            <>
              <div className="border-neutral-200 border-t bg-neutral-50 px-2.5 py-1.5 sm:px-3 dark:border-neutral-800 dark:bg-neutral-800/30">
                <div className="font-medium text-[10px] text-neutral-500 uppercase tracking-wide dark:text-neutral-400">
                  {error ? "Error Output" : "Execution Result"}
                </div>
              </div>
              <div className="scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent max-h-60 max-w-full overflow-x-auto">
                <OutputBlock error={error} output={output} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Missing icon reference in CollapsibleSection

// Missing icon reference in CollapsibleSection
const Check = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    height="24"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CopyButton = memo(({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      className={cn(
        "h-7 w-7 transition-colors duration-150",
        copied
          ? "text-green-500"
          : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      )}
      onClick={handleCopy}
      size="icon"
      variant="ghost"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
});
CopyButton.displayName = "CopyButton";
