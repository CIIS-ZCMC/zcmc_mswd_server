import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface DatePickerProps {
  date?: Date
  setDate?: (date?: Date) => void
  placeholder?: string
  className?: string
}

export function DatePicker({
  date,
  setDate,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)

  const handleSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate)
    setDate?.(newDate)
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex w-[240px] items-center justify-start rounded-md border border-input bg-background px-3 py-2 text-left text-xs font-normal text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground",
          !selectedDate && "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="mr-2 size-4" />
        {selectedDate ? selectedDate.toLocaleDateString() : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  )
}
