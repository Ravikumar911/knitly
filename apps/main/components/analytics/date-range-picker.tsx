"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { useTransactionFilters } from "@/store/transaction-filters";

// Define DateRange type for range mode
interface DateRange {
  from?: Date;
  to?: Date;
}

const presetRanges = [
  {
    label: "Last 7 days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return { start, end };
    },
  },
  {
    label: "Last 30 days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { start, end };
    },
  },
  {
    label: "Last 3 months",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 3);
      return { start, end };
    },
  },
  {
    label: "Last 6 months",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 6);
      return { start, end };
    },
  },
  {
    label: "This year",
    getValue: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), 0, 1);
      return { start, end };
    },
  },
];

export function DateRangePicker({ className }: { className?: string }) {
  const { startDate, endDate, setStartDate, setEndDate } = useTransactionFilters();
  const [isOpen, setIsOpen] = React.useState(false);

  // Initialize with last 30 days if no dates are set (only once)
  React.useEffect(() => {
    if (!startDate && !endDate) {
      const preset = presetRanges[1]; // Last 30 days
      if (preset) {
        const { start, end } = preset.getValue();
        setStartDate(start);
        setEndDate(end);
      }
    }
  }, [startDate, endDate, setStartDate, setEndDate]);

  const dateRange: DateRange | undefined = React.useMemo(() => {
    if (!startDate || !endDate) return undefined;
    return {
      from: startDate,
      to: endDate,
    };
  }, [startDate, endDate]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range && range.from) {
      setStartDate(range.from);
      if (range.to) {
        setEndDate(range.to);
      } else {
        // If only start date is selected, set end date to same day
        setEndDate(range.from);
      }
    } else {
      setStartDate(null);
      setEndDate(null);
    }
  };

  const handlePresetSelect = (presetLabel: string) => {
    const preset = presetRanges.find((p) => p.label === presetLabel);
    if (preset) {
      const { start, end } = preset.getValue();
      setStartDate(start);
      setEndDate(end);
      setIsOpen(false);
    }
  };

  const formatDateRange = () => {
    if (!startDate || !endDate) {
      return "Select date range";
    }

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(startDate);
    }

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  // Check if current selection matches a preset
  const getSelectedPreset = () => {
    if (!startDate || !endDate) return "";

    for (const preset of presetRanges) {
      const { start, end } = preset.getValue();
      if (
        startDate.toDateString() === start.toDateString() &&
        endDate.toDateString() === end.toDateString()
      ) {
        return preset.label;
      }
    }
    return "Custom";
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium mb-2">Quick Select</p>
                <Select
                  value={getSelectedPreset()}
                  onValueChange={handlePresetSelect}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {presetRanges.map((preset) => (
                      <SelectItem key={preset.label} value={preset.label}>
                        {preset.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange as any}
              onSelect={handleDateRangeChange as any}
              numberOfMonths={2}
              disabled={(date) => 
                date > new Date() || date < new Date("1900-01-01")
              }
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 