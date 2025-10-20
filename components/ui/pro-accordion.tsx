"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { PlusIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

const ProAccordion = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> & {
  ref?: React.RefObject<React.ComponentRef<
    typeof AccordionPrimitive.Root
  > | null>;
}) => (
  <AccordionPrimitive.Root
    className={cn("w-full", className)}
    ref={ref}
    {...props}
  />
);
ProAccordion.displayName = "ProAccordion";

const ProAccordionItem = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> & {
  ref?: React.RefObject<React.ComponentRef<
    typeof AccordionPrimitive.Item
  > | null>;
}) => (
  <AccordionPrimitive.Item
    className={cn("border-border border-b transition-all", className)}
    ref={ref}
    {...props}
  />
);
ProAccordionItem.displayName = "ProAccordionItem";

const ProAccordionTrigger = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
  ref?: React.RefObject<React.ComponentRef<
    typeof AccordionPrimitive.Trigger
  > | null>;
}) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      className={cn(
        "flex flex-1 items-center justify-between py-6 text-left font-medium text-base text-foreground outline-none transition-all hover:text-foreground/80",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background/80 transition-transform duration-200 group-data-[state=open]:rotate-45 group-data-[state=open]:border-primary">
        <PlusIcon className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-45" />
      </div>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
);
ProAccordionTrigger.displayName = "ProAccordionTrigger";

const ProAccordionContent = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> & {
  ref?: React.RefObject<React.ComponentRef<
    typeof AccordionPrimitive.Content
  > | null>;
}) => (
  <AccordionPrimitive.Content
    className="overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    ref={ref}
    {...props}
  >
    <div className={cn("pt-0 pb-6 text-muted-foreground", className)}>
      {children}
    </div>
  </AccordionPrimitive.Content>
);
ProAccordionContent.displayName = "ProAccordionContent";

export {
  ProAccordion,
  ProAccordionItem,
  ProAccordionTrigger,
  ProAccordionContent,
};
