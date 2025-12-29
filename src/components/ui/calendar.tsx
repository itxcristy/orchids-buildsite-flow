import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-1 sm:p-2 md:p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-2 sm:space-x-3 sm:space-y-0",
        month: "space-y-2 sm:space-y-3",
        caption: "flex justify-center pt-1 sm:pt-2 relative items-center mb-1 sm:mb-2",
        caption_label: "text-sm sm:text-base md:text-lg font-semibold text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 bg-transparent p-0 opacity-70 hover:opacity-100 transition-opacity rounded-full border-2 hover:border-primary/50"
        ),
        nav_button_previous: "absolute left-0 sm:left-1",
        nav_button_next: "absolute right-0 sm:right-1",
        table: "w-full border-collapse space-y-0.5 sm:space-y-1",
        head_row: "flex justify-between",
        head_cell:
          "text-muted-foreground rounded-md font-semibold text-[10px] sm:text-xs md:text-sm w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center",
        row: "flex w-full mt-0.5 sm:mt-1 justify-between",
        cell: "h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-center text-xs sm:text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 flex items-center justify-center",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 font-medium aria-selected:opacity-100 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 text-xs sm:text-sm md:text-base"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-md shadow-primary/20 scale-105",
        day_today: "bg-accent text-accent-foreground font-bold border-2 border-primary/30",
        day_outside:
          "day-outside text-muted-foreground opacity-40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
