"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { PlusIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const ProAccordion = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Root
    className={cn("w-full", className)}
    ref={ref}
    {...props}
  />
));
ProAccordion.displayName = "ProAccordion";

const ProAccordionItem = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    className={cn("border-border border-b transition-all", className)}
    ref={ref}
    {...props}
  />
));
ProAccordionItem.displayName = "ProAccordionItem";

const ProAccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
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
));
ProAccordionTrigger.displayName = "ProAccordionTrigger";

const ProAccordionContent = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    className="overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    ref={ref}
    {...props}
  >
    <div className={cn("pt-0 pb-6 text-muted-foreground", className)}>
      {children}
    </div>
  </AccordionPrimitive.Content>
));
ProAccordionContent.displayName = "ProAccordionContent";

export {
  ProAccordion,
  ProAccordionItem,
  ProAccordionTrigger,
  ProAccordionContent,
};
