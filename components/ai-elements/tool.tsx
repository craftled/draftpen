"use client";

import * as React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error";

export type ToolProps = React.ComponentProps<typeof Collapsible> & {
  defaultOpen?: boolean;
};

export const Tool = ({ className, defaultOpen, ...props }: ToolProps) => {
  return <Collapsible className={cn("w-full my-3", className)} defaultOpen={defaultOpen} {...props} />;
};

export type ToolHeaderProps = React.ComponentProps<typeof CollapsibleTrigger> & {
  type: string; // e.g. "tool-keyword_research"
  state: ToolState;
  title?: string;
};

function stateBadge(state: ToolState) {
  const map: Record<ToolState, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }>
    = {
      "input-streaming": { label: "pending", variant: "secondary" },
      "input-available": { label: "running", variant: "outline" },
      "output-available": { label: "completed", variant: "default" },
      "output-error": { label: "error", variant: "destructive" },
    } as const;
  return <Badge variant={map[state].variant}>{map[state].label}</Badge>;
}

export const ToolHeader = ({ type, state, title, className, ...props }: ToolHeaderProps) => {
  const name = title || type.replace(/^tool-/, "").replace(/_/g, " ");
  return (
    <CollapsibleTrigger asChild {...props}>
      <div className={cn("flex items-center justify-between w-full cursor-pointer select-none", className)}>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Tool</span>
          <span className="text-sm font-medium">{name}</span>
          <span className="ml-2">{stateBadge(state)}</span>
        </div>
        <ChevronDown className="size-4 opacity-70 group-data-[state=open]:rotate-180 transition-transform" />
      </div>
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = React.ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, children, ...props }: ToolContentProps) => (
  <CollapsibleContent {...props}>
    <Card className={cn("mt-2 overflow-hidden", className)}>
      <CardContent className="pt-4 space-y-3">{children}</CardContent>
    </Card>
  </CollapsibleContent>
);

export type ToolInputProps = React.ComponentProps<"div"> & {
  input: unknown;
};

export const ToolInput = ({ input, className, ...props }: ToolInputProps) => (
  <div className={cn("text-xs", className)} {...props}>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Input</div>
    <pre className="bg-muted rounded-md p-2 overflow-x-auto whitespace-pre-wrap">
      {safeJSONStringify(input)}
    </pre>
  </div>
);

export type ToolOutputProps = React.ComponentProps<"div"> & {
  output?: React.ReactNode | unknown;
  errorText?: string | null;
};

export const ToolOutput = ({ output, errorText, className, ...props }: ToolOutputProps) => (
  <div className={cn("text-xs", className)} {...props}>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Output</div>
    {errorText ? (
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 rounded-md p-2">
        {errorText}
      </div>
    ) : typeof output === "string" || typeof output === "number" ? (
      <pre className="bg-muted rounded-md p-2 overflow-x-auto whitespace-pre-wrap">{String(output)}</pre>
    ) : React.isValidElement(output) ? (
      output
    ) : (
      <pre className="bg-muted rounded-md p-2 overflow-x-auto whitespace-pre-wrap">
        {safeJSONStringify(output)}
      </pre>
    )}
  </div>
);

function safeJSONStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (e) {
    return String(value);
  }
}

