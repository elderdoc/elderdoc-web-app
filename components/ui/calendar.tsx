"use client"

import { DayPicker } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months:           "flex flex-col sm:flex-row gap-2",
        month:            "flex flex-col gap-4",
        month_caption:    "relative flex items-center justify-center px-1 py-1",
        caption_label:    "text-sm font-medium",
        nav:              "absolute inset-0 flex items-center justify-between px-1 pointer-events-none",
        button_previous:  cn(
          "h-7 w-7 rounded-md border border-input bg-transparent p-0 opacity-50 hover:opacity-100 pointer-events-auto",
          "flex items-center justify-center"
        ),
        button_next:      cn(
          "h-7 w-7 rounded-md border border-input bg-transparent p-0 opacity-50 hover:opacity-100 pointer-events-auto",
          "flex items-center justify-center"
        ),
        month_grid:       "w-full border-collapse",
        weekdays:         "flex",
        weekday:          "text-muted-foreground rounded-md w-9 text-center text-xs font-normal",
        week:             "flex w-full mt-2",
        day:              "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
        day_button:       cn(
          "h-9 w-9 p-0 font-normal rounded-md",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
        ),
        selected:         "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
        today:            "bg-accent text-accent-foreground rounded-md",
        outside:          "text-muted-foreground opacity-50",
        disabled:         "text-muted-foreground opacity-50",
        hidden:           "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left"
            ? <ChevronLeft className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
