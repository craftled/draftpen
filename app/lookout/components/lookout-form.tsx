"use client";

import { AlarmClockIcon, Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  dayOfWeekOptions,
  frequencyOptions,
  LOOKOUT_LIMITS,
} from "../constants";
import type { LookoutFormHookReturn } from "../hooks/use-lookout-form";
import { TimePicker } from "./time-picker";
import { TimezoneSelector } from "./timezone-selector";

interface LookoutFormProps {
  formHook: LookoutFormHookReturn;
  isMutating: boolean;
  activeDailyLookouts: number;
  totalLookouts: number;
  canCreateMore: boolean;
  canCreateDailyMore: boolean;
  createLookout: any;
  updateLookout: any;
}

export function LookoutForm({
  formHook,
  isMutating,
  activeDailyLookouts,
  totalLookouts,
  canCreateMore,
  canCreateDailyMore,
  createLookout,
  updateLookout,
}: LookoutFormProps) {
  const {
    selectedFrequency,
    selectedTime,
    selectedTimezone,
    selectedDate,
    selectedDayOfWeek,
    selectedExample,
    editingLookout,
    setSelectedFrequency,
    setSelectedTime,
    setSelectedTimezone,
    setSelectedDate,
    setSelectedDayOfWeek,
    createLookoutFromForm,
    updateLookoutFromForm,
  } = formHook;

  const handleSubmit = (formData: FormData) => {
    if (editingLookout) {
      updateLookoutFromForm(formData, updateLookout);
    } else {
      createLookoutFromForm(formData, createLookout);
    }
  };

  const isSubmitDisabled =
    isMutating ||
    (!editingLookout && selectedFrequency === "daily" && !canCreateDailyMore) ||
    !(editingLookout || canCreateMore);

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <Input
          className="h-9"
          defaultValue={editingLookout?.title || selectedExample?.title || ""}
          name="title"
          placeholder="Enter lookout name"
          required
        />
      </div>

      {/* Instructions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
        <Label className="font-medium text-sm sm:w-20 sm:flex-shrink-0 sm:pt-2">
          Instructions
        </Label>
        <div className="flex-1">
          <Textarea
            className="h-40 resize-none text-sm"
            defaultValue={
              editingLookout?.prompt || selectedExample?.prompt || ""
            }
            name="prompt"
            placeholder="Enter detailed instructions for what you want the lookout to search for and analyze..."
            required
            rows={6}
          />
        </div>
      </div>

      {/* Frequency Selection */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
        <Label className="font-medium text-sm sm:w-20 sm:flex-shrink-0 sm:pt-2">
          Frequency
        </Label>
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {frequencyOptions.map((option) => (
              <div className="relative" key={option.value}>
                <input
                  checked={selectedFrequency === option.value}
                  className="peer sr-only"
                  id={`frequency-${option.value}`}
                  name="frequency"
                  onChange={(e) => setSelectedFrequency(e.target.value)}
                  type="radio"
                  value={option.value}
                />
                <label
                  className="block cursor-pointer rounded-md border px-2 py-2 text-center text-xs transition-colors hover:bg-accent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground hover:peer-checked:bg-primary/90"
                  htmlFor={`frequency-${option.value}`}
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scheduling Section */}
      <div className="space-y-4">
        {/* On/Time/Date row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
          <Label className="font-medium text-sm sm:w-20 sm:flex-shrink-0 sm:pt-2">
            On
          </Label>
          <div className="flex-1">
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Time Picker */}
              <div className="min-w-0 flex-1">
                <TimePicker
                  filterPastTimes={selectedFrequency === "once"}
                  name="time"
                  onChange={setSelectedTime}
                  selectedDate={
                    selectedFrequency === "once" ? selectedDate : undefined
                  }
                  value={selectedTime}
                />
              </div>

              {/* Date selection for 'once' frequency */}
              {selectedFrequency === "once" && (
                <div className="min-w-0 flex-1">
                  <input
                    name="date"
                    type="hidden"
                    value={
                      selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""
                    }
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        className={cn(
                          "h-9 w-full text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                        size="sm"
                        variant="outline"
                      >
                        {selectedDate ? (
                          format(selectedDate, "MMM d, yyyy")
                        ) : (
                          <span>Pick date</span>
                        )}
                        <HugeiconsIcon
                          className="ml-auto opacity-50"
                          color="currentColor"
                          icon={Calendar01Icon}
                          size={12}
                          strokeWidth={1.5}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        autoFocus
                        className="rounded-md"
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        mode="single"
                        onSelect={setSelectedDate}
                        selected={selectedDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Day selection for 'weekly' frequency */}
              {selectedFrequency === "weekly" && (
                <div className="min-w-0 flex-1">
                  <input
                    name="dayOfWeek"
                    type="hidden"
                    value={selectedDayOfWeek}
                  />
                  <Select
                    onValueChange={setSelectedDayOfWeek}
                    value={selectedDayOfWeek}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOfWeekOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timezone row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Label className="font-medium text-sm sm:w-20 sm:flex-shrink-0">
            Timezone
          </Label>
          <div className="flex-1">
            <TimezoneSelector
              onChange={setSelectedTimezone}
              value={selectedTimezone}
            />
          </div>
        </div>

        {/* Single hidden input for timezone form submission */}
        <input name="timezone" type="hidden" value={selectedTimezone} />
      </div>

      <div className="flex items-center gap-2 rounded-md bg-muted/20 p-2 text-muted-foreground text-xs">
        <HugeiconsIcon
          color="currentColor"
          icon={AlarmClockIcon}
          size={12}
          strokeWidth={1.5}
        />
        <span>Email notifications enabled</span>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center gap-3 sm:justify-start">
          {!editingLookout &&
            activeDailyLookouts !== undefined &&
            totalLookouts !== undefined && (
              <div className="flex items-center gap-2">
                {selectedFrequency === "daily" ? (
                  <ProgressRing
                    color={
                      activeDailyLookouts >= LOOKOUT_LIMITS.DAILY_LOOKOUTS
                        ? "danger"
                        : activeDailyLookouts >= 4
                          ? "warning"
                          : "success"
                    }
                    max={LOOKOUT_LIMITS.DAILY_LOOKOUTS}
                    showLabel={false}
                    size={24}
                    strokeWidth={2}
                    value={activeDailyLookouts}
                  />
                ) : (
                  <ProgressRing
                    color={
                      totalLookouts >= LOOKOUT_LIMITS.TOTAL_LOOKOUTS
                        ? "danger"
                        : totalLookouts >= 8
                          ? "warning"
                          : "primary"
                    }
                    max={LOOKOUT_LIMITS.TOTAL_LOOKOUTS}
                    showLabel={false}
                    size={24}
                    strokeWidth={2}
                    value={totalLookouts}
                  />
                )}
                <div className="text-muted-foreground text-xs">
                  {selectedFrequency === "daily"
                    ? `${Math.max(0, LOOKOUT_LIMITS.DAILY_LOOKOUTS - activeDailyLookouts)} daily remaining`
                    : `${LOOKOUT_LIMITS.TOTAL_LOOKOUTS - totalLookouts} remaining`}
                </div>
              </div>
            )}
        </div>

        <Button
          className="w-full sm:w-auto"
          disabled={isSubmitDisabled}
          size="sm"
          type="submit"
        >
          {editingLookout
            ? isMutating
              ? "Updating..."
              : "Update"
            : selectedFrequency === "once"
              ? "Create Task"
              : "Create"}
        </Button>
      </div>
    </form>
  );
}
