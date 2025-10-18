"use client";

import { CircleArrowUpDownIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { timezoneOptions } from "../constants";

interface TimezoneSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimezoneSelector({ value, onChange }: TimezoneSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const selectedTimezone = timezoneOptions.find(
    (option) => option.value === value
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="h-9 w-full justify-between text-left font-normal"
          role="combobox"
          variant="outline"
        >
          {selectedTimezone
            ? selectedTimezone.label.length > 30
              ? `${selectedTimezone.label.substring(0, 30)}...`
              : selectedTimezone.label
            : "Select timezone"}
          <HugeiconsIcon
            className="shrink-0 opacity-50"
            color="currentColor"
            icon={CircleArrowUpDownIcon}
            size={16}
            strokeWidth={1.5}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        avoidCollisions={true}
        className="w-[calc(100vw-2rem)] p-0 sm:w-[380px]"
        collisionPadding={8}
        side="bottom"
        sideOffset={4}
      >
        <Command>
          <CommandInput className="h-9" placeholder="Search timezone..." />
          <CommandEmpty>No timezone found.</CommandEmpty>
          <CommandList
            className="!overflow-y-scroll max-h-[200px]"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const target = e.currentTarget;
                target.scrollTop += e.key === "ArrowDown" ? 40 : -40;
              }
            }}
            onWheel={(e) => {
              e.stopPropagation();
              const target = e.currentTarget;
              target.scrollTop += e.deltaY;
            }}
            style={{ overflowY: "scroll", pointerEvents: "auto" }}
            tabIndex={0}
          >
            <CommandGroup>
              {timezoneOptions.map((option) => (
                <CommandItem
                  className="text-sm"
                  key={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  value={`${option.value} ${option.label}`}
                >
                  <HugeiconsIcon
                    className={cn(
                      "mr-2",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                    color="currentColor"
                    icon={Tick01Icon}
                    size={16}
                    strokeWidth={1.5}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
