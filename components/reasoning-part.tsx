import type { ReasoningUIPart } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";
import Marked from "marked-react";
import React, { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ReasoningPartViewProps {
  part: ReasoningUIPart;
  sectionKey: string;
  isComplete: boolean;
  duration: string | null;
  parallelTool: string | null;
  isExpanded: boolean;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  setIsExpanded: (v: boolean) => void;
}

// Type definition for table flags
interface TableFlags {
  header?: boolean;
  align?: "center" | "left" | "right" | null;
}

const SpinnerIcon = React.memo(() => (
  <svg
    className="animate-spin"
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      fill="currentColor"
    />
  </svg>
));
SpinnerIcon.displayName = "SpinnerIcon";

// Custom renderer for Marked
const MarkdownRenderer = React.memo(({ content }: { content: string }) => {
  // Define custom renderer with proper types
  const renderer = {
    code(code: string, language?: string) {
      return (
        <pre
          className="my-2 overflow-x-auto rounded border border-border/60 bg-muted/70 px-2 py-1.5 text-xs dark:bg-muted/50"
          key={Math.random()}
        >
          <code className="text-foreground/90">{code}</code>
        </pre>
      );
    },
    codespan(code: string) {
      return (
        <code
          className="rounded border border-border/50 bg-muted/70 px-1 py-0.5 text-[11px] text-foreground dark:bg-muted/50"
          key={Math.random()}
        >
          {code}
        </code>
      );
    },
    paragraph(text: ReactNode) {
      return (
        <p className="mb-2 text-muted-foreground last:mb-0" key={Math.random()}>
          {text}
        </p>
      );
    },
    strong(text: ReactNode) {
      return (
        <strong className="font-semibold text-foreground" key={Math.random()}>
          {text}
        </strong>
      );
    },
    heading(text: ReactNode, level: number) {
      const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
      const classes = {
        h1: "text-lg font-semibold mb-2 mt-3 text-foreground",
        h2: "text-base font-semibold mb-1.5 mt-2.5 text-foreground",
        h3: "text-base font-medium mb-1.5 mt-2 text-foreground",
        h4: "text-base font-medium mb-1 mt-1.5 text-foreground",
        h5: "text-base font-normal mb-1 mt-1.5 text-foreground",
        h6: "text-base font-normal mb-1 mt-1.5 text-foreground",
      };

      const className = classes[`h${level}` as keyof typeof classes] || "";
      return (
        <Tag className={className} key={Math.random()}>
          {text}
        </Tag>
      );
    },
    link(href: string, text: ReactNode) {
      return (
        <a
          className="text-primary underline-offset-2 hover:text-primary hover:underline"
          href={href}
          key={Math.random()}
          target="_blank"
        >
          {text}
        </a>
      );
    },
    list(body: ReactNode, ordered: boolean) {
      const Type = ordered ? "ol" : "ul";
      return (
        <Type
          className={`${ordered ? "list-decimal" : "list-disc"} mb-2 pl-4 text-muted-foreground marker:text-muted-foreground/60 last:mb-1`}
          key={Math.random()}
        >
          {body}
        </Type>
      );
    },
    listItem(text: ReactNode) {
      return (
        <li className="mb-0.5 text-muted-foreground" key={Math.random()}>
          {text}
        </li>
      );
    },
    blockquote(text: ReactNode) {
      return (
        <blockquote
          className="my-2 rounded border-border border-l-2 bg-muted/30 py-1 pl-2 text-muted-foreground italic"
          key={Math.random()}
        >
          {text}
        </blockquote>
      );
    },
    hr() {
      return (
        <hr className="my-3 border-border/80 border-t" key={Math.random()} />
      );
    },
    table(children: ReactNode[]) {
      return (
        <div className="mb-2 overflow-x-auto" key={Math.random()}>
          <table className="min-w-full rounded border border-border/60 text-xs">
            {children}
          </table>
        </div>
      );
    },
    tableRow(content: ReactNode) {
      return (
        <tr className="border-border/80 border-b" key={Math.random()}>
          {content}
        </tr>
      );
    },
    tableCell(children: ReactNode[], flags: TableFlags) {
      const align = flags.align ? `text-${flags.align}` : "";

      return flags.header ? (
        <th
          className={`border border-border/60 bg-muted/60 px-1.5 py-1 font-medium text-foreground ${align}`}
          key={Math.random()}
        >
          {children}
        </th>
      ) : (
        <td
          className={`border border-border/60 px-1.5 py-1 text-muted-foreground ${align}`}
          key={Math.random()}
        >
          {children}
        </td>
      );
    },
  };

  return (
    <div className="markdown-content space-y-1">
      <Marked renderer={renderer} value={content} />
    </div>
  );
});
MarkdownRenderer.displayName = "MarkdownRenderer";

// Helper function to check if content is empty (just newlines)
const isEmptyContent = (content: string): boolean =>
  !content || content.trim() === "" || /^\n+$/.test(content);

export const ReasoningPartView: React.FC<ReasoningPartViewProps> = React.memo(
  ({
    part,
    sectionKey,
    isComplete,
    parallelTool,
    isExpanded,
    isFullscreen,
    setIsFullscreen,
    setIsExpanded,
  }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new content is added during reasoning
    useEffect(() => {
      if (!isComplete && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [isComplete, part.text]);

    // Also scroll when details change, even if isComplete doesn't change
    useEffect(() => {
      if (
        !isComplete &&
        scrollRef.current &&
        part.text &&
        part.text.length > 0
      ) {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 10);
      }
    }, [part.text, isComplete]);

    const hasNonEmptyReasoning = part.text && !isEmptyContent(part.text);

    // If all content is empty, don't render the reasoning section
    if (!hasNonEmptyReasoning) {
      return null;
    }

    return (
      <div className="my-2" key={sectionKey}>
        <div
          className={cn(
            "bg-accent",
            "overflow-hidden rounded-lg border border-border/80"
          )}
        >
          {/* Header - Always visible */}
          <div
            className={cn(
              "flex items-center justify-between px-2.5 py-2",
              isComplete &&
                "cursor-pointer transition-colors hover:bg-muted/50",
              "bg-background/80"
            )}
            onClick={() => isComplete && setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              {isComplete ? (
                <div className="flex items-center gap-1.5">
                  <Sparkles
                    className="size-3 text-muted-foreground"
                    strokeWidth={2}
                  />
                  <div className="font-normal text-muted-foreground text-xs">
                    Reasoning
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "rounded-md px-1.5 py-0.5",
                      "border border-border/80",
                      "bg-muted/50",
                      "text-muted-foreground",
                      "flex items-center gap-1.5",
                      "animate-pulse"
                    )}
                  >
                    <div className="size-2.5 text-muted-foreground">
                      <SpinnerIcon />
                    </div>
                    <span className="font-normal text-xs">Thinking</span>
                    {parallelTool && (
                      <span className="font-normal text-xs opacity-60">
                        ({parallelTool})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isComplete && (
                <div className="text-muted-foreground">
                  {isExpanded ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                </div>
              )}

              {(!isComplete || isExpanded) && (
                <button
                  aria-label={isFullscreen ? "Minimize" : "Maximize"}
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullscreen(!isFullscreen);
                  }}
                >
                  {isFullscreen ? (
                    <Minimize2
                      className="size-3 text-muted-foreground"
                      strokeWidth={2}
                    />
                  ) : (
                    <Maximize2
                      className="size-3 text-muted-foreground"
                      strokeWidth={2}
                    />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Content - Shown when in progress or when expanded */}
          <AnimatePresence initial={false}>
            {(!isComplete || isExpanded) && (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden"
                exit={{ height: 0, opacity: 0 }}
                initial={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              >
                <div>
                  <div className="h-px w-full bg-border/80" />
                  <div
                    className={cn(
                      "overflow-y-auto bg-muted/20",
                      "scrollbar-thin scrollbar-thumb-rounded-full scrollbar-thumb-border",
                      "scrollbar-track-transparent",
                      {
                        "max-h-[180px] rounded-b-lg": !isFullscreen,
                        "max-h-[60vh] rounded-b-lg": isFullscreen,
                      }
                    )}
                    ref={scrollRef}
                  >
                    <div className="px-2.5 py-2 text-xs leading-relaxed">
                      <div className="prose prose-sm max-w-none text-muted-foreground">
                        <MarkdownRenderer content={part.text} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);

ReasoningPartView.displayName = "ReasoningPartView";
