
'use client';

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/modules/shared/utils/utils"
import { Button } from "@/modules/shared/components/ui/ui/button"
import { Calendar } from "@/modules/shared/components/ui/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/modules/shared/components/ui/ui/popover"

interface DatePickerProps {
    date?: Date;
    setDate: (date?: Date) => void;
}

export function DatePicker({ date, setDate }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}



