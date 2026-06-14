"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { format, type Locale } from "date-fns"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  variant?: "default" | "fiori"
}

const fioriCalendarClassNames: CalendarProps["classNames"] = {
  months: "fiori-calendar-months",
  month: "fiori-calendar-month",
  month_caption: "fiori-calendar-caption",
  caption_label: "fiori-calendar-caption-label",
  nav: "fiori-calendar-nav",
  button_previous: "fiori-calendar-nav-btn",
  button_next: "fiori-calendar-nav-btn",
  month_grid: "fiori-calendar-grid",
  weekdays: "fiori-calendar-weekdays",
  weekday: "fiori-calendar-weekday",
  week: "fiori-calendar-week",
  day: "fiori-calendar-day",
  day_button: "fiori-calendar-day-btn",
  selected: "fiori-calendar-day-selected",
  today: "fiori-calendar-day-today",
  outside: "fiori-calendar-day-outside",
  disabled: "fiori-calendar-day-disabled",
  hidden: "fiori-calendar-day-hidden",
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = ptBR,
  formatters: formattersProp,
  labels: labelsProp,
  variant = "default",
  ...props
}: CalendarProps) {
  /** `DayPicker` expõe `locale` como parcial; `date-fns/format` exige `Locale` completo. */
  const dateFnsLocale = locale as Locale
  const isFiori = variant === "fiori"

  return (
    <DayPicker
      locale={locale}
      showOutsideDays={showOutsideDays}
      navLayout={isFiori ? "around" : undefined}
      className={cn(isFiori ? "fiori-calendar" : "p-3", className)}
      classNames={isFiori ? {
        ...fioriCalendarClassNames,
        ...classNames,
      } : {
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "w-9 text-center text-muted-foreground font-normal text-[0.8rem]",
        weekdays: "flex",
        weekday: "w-9 text-center text-muted-foreground font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) => {
          if (props.orientation === 'left') {
            return <ChevronLeft className="h-4 w-4" {...props} />
          }
          return <ChevronRight className="h-4 w-4" {...props} />
        }
      }}
      formatters={{
        formatWeekdayName: (date) =>
          format(date, "EEEEEE", { locale: dateFnsLocale }).replace(".", "").slice(0, 3).toLowerCase(),
        /** Legenda do mês em português (react-day-picker v9 usa inglês nos labels ARIA por padrão). */
        formatCaption: (month) => {
          const s = format(month, "LLLL yyyy", { locale: dateFnsLocale });
          return s.replace(/^./, (ch) => ch.toUpperCase());
        },
        ...formattersProp,
      }}
      labels={{
        labelNext: () => "Ir para o próximo mês",
        labelPrevious: () => "Ir para o mês anterior",
        ...labelsProp,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
