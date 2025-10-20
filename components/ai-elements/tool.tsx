"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

export type ToolProps = React.ComponentProps<typeof Collapsible> & {
  defaultOpen?: boolean;
};

export const Tool = ({ className, defaultOpen, ...props }: ToolProps) => (
  <Collapsible
    className={cn("my-3 w-full", className)}
    defaultOpen={defaultOpen}
    {...props}
  />
);

export type ToolHeaderProps = React.ComponentProps<
  typeof CollapsibleTrigger
> & {
  type: string; // e.g. "tool-keyword_research"
  state: ToolState;
  title?: string;
};

function stateBadge(state: ToolState) {
  const map: Record<
    ToolState,
    {
      label: string;
      variant: "default" | "secondary" | "outline" | "destructive";
    }
  > = {
    "input-streaming": { label: "pending", variant: "secondary" },
    "input-available": { label: "running", variant: "outline" },
    "output-available": { label: "completed", variant: "default" },
    "output-error": { label: "error", variant: "destructive" },
  } as const;
  return <Badge variant={map[state].variant}>{map[state].label}</Badge>;
}

export const ToolHeader = ({
  type,
  state,
  title,
  className,
  ...props
}: ToolHeaderProps) => {
  const name = title || type.replace(/^tool-/, "").replace(/_/g, " ");
  return (
    <CollapsibleTrigger asChild {...props}>
      <div
        className={cn(
          "flex w-full cursor-pointer select-none items-center justify-between",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs uppercase tracking-wide">
            Tool
          </span>
          <span className="font-medium text-sm">{name}</span>
          <span className="ml-2">{stateBadge(state)}</span>
        </div>
        <ChevronDown className="size-4 opacity-70 transition-transform group-data-[state=open]:rotate-180" />
      </div>
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = React.ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({
  className,
  children,
  ...props
}: ToolContentProps) => (
  <CollapsibleContent {...props}>
    <Card className={cn("mt-2 overflow-hidden", className)}>
      <CardContent className="space-y-3 pt-4">{children}</CardContent>
    </Card>
  </CollapsibleContent>
);

export type ToolInputProps = React.ComponentProps<"div"> & {
  input: unknown;
};

export const ToolInput = ({ input, className, ...props }: ToolInputProps) => (
  <div className={cn("text-xs", className)} {...props}>
    <div className="mb-1 text-[10px] text-muted-foreground uppercase tracking-wide">
      Input
    </div>
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-2">
      {safeJSONStringify(input)}
    </pre>
  </div>
);

export type ToolOutputProps = React.ComponentProps<"div"> & {
  output?: React.ReactNode | unknown;
  errorText?: string | null;
};

export const ToolOutput = ({
  output,
  errorText,
  className,
  ...props
}: ToolOutputProps) => (
  <div className={cn("text-xs", className)} {...props}>
    <div className="mb-1 text-[10px] text-muted-foreground uppercase tracking-wide">
      Output
    </div>
    {errorText ? (
      <div className="rounded-md border border-red-200 bg-red-50 p-2 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        {errorText}
      </div>
    ) : typeof output === "string" || typeof output === "number" ? (
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-2">
        {String(output)}
      </pre>
    ) : React.isValidElement(output) ? (
      output
    ) : (
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-2">
        {safeJSONStringify(output)}
      </pre>
    )}
  </div>
);

function safeJSONStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (_e) {
    return String(value);
  }
}
