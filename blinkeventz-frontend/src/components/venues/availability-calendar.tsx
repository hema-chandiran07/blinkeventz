"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

export type TimeSlotType = "morning" | "evening" | "full_day" | "night";

export interface TimeSlot {
  id: string;
  type: TimeSlotType;
  label: string;
  time: string;
  multiplier: number;
  available: boolean;
}

export interface AvailabilityCalendarProps {
  venueId: string;
  basePrice: number;
  onDateSelect?: (date: Date, slot: TimeSlot) => void;
  selectedDate?: Date | null;
  selectedSlot?: TimeSlotType | null;
  className?: string;
}

const TIME_SLOTS_CONFIG: Omit<TimeSlot, "available" | "id">[] = [
  { type: "morning", label: "Morning", time: "6:00 AM - 12:00 PM", multiplier: 0.6 },
  { type: "evening", label: "Evening", time: "4:00 PM - 10:00 PM", multiplier: 0.8 },
  { type: "full_day", label: "Full Day", time: "6:00 AM - 12:00 AM", multiplier: 1.0 },
  { type: "night", label: "Night", time: "8:00 PM - 2:00 AM", multiplier: 0.7 },
];

const generateMockAvailability = (venueId: string, month: number, year: number): Map<string, TimeSlot[]> => {
  const availability = new Map<string, TimeSlot[]>();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const seed = venueId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const daySeed = (seed + day) % 100;
    const slots: TimeSlot[] = TIME_SLOTS_CONFIG.map((slot, index) => ({
      ...slot,
      id: `${dateKey}-${slot.type}`,
      available: daySeed > (index * 15 + 10),
    }));
    availability.set(dateKey, slots);
  }
  return availability;
};

const isPastDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function AvailabilityCalendar({
  venueId,
  basePrice,
  onDateSelect,
  selectedDate,
  selectedSlot,
  className,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const availabilityData = useMemo(() => {
    return generateMockAvailability(
      venueId,
      currentMonth.getMonth(),
      currentMonth.getFullYear()
    );
  }, [venueId, currentMonth]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const today = new Date();
    
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false, isToday: false });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
      days.push({ date, isCurrentMonth: true, isToday });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, isToday: false });
    }
    
    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    if (isPastDate(date)) return;
    if (onDateSelect) {
      const slotConfig = selectedSlot ? TIME_SLOTS_CONFIG.find(s => s.type === selectedSlot) : TIME_SLOTS_CONFIG[1];
      if (slotConfig) {
        onDateSelect(date, {
          ...slotConfig,
          id: `${formatDateKey(date)}-${slotConfig.type}`,
          available: true,
        });
      }
    }
  };

  const handleSlotSelect = (date: Date, slot: TimeSlot) => {
    if (!slot.available || isPastDate(date)) return;
    if (onDateSelect) {
      onDateSelect(date, slot);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <Card className={cn("border-purple-100 shadow-lg", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg font-semibold text-purple-900">
              Check Availability
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 hover:bg-purple-50">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 hover:bg-purple-50">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span className="text-xs text-gray-600">Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-xs text-gray-600">Limited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-purple-500 ring-2 ring-purple-200" />
            <span className="text-xs text-gray-600">Selected</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}

          {calendarDays.map(({ date, isCurrentMonth, isToday }) => {
            const dateKey = formatDateKey(date);
            const daySlots = availabilityData.get(dateKey);
            const isPast = isPastDate(date);
            const isSelected = selectedDate && formatDateKey(selectedDate) === dateKey;
            
            let dayStatus: "available" | "limited" | "booked" | "none" = "none";
            if (daySlots) {
              const availableCount = daySlots.filter(s => s.available).length;
              if (availableCount === 0) dayStatus = "booked";
              else if (availableCount < daySlots.length) dayStatus = "limited";
              else dayStatus = "available";
            }

            return (
              <button
                key={dateKey}
                onClick={() => handleDateClick(date)}
                disabled={isPast}
                className={cn(
                  "relative h-14 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
                  !isCurrentMonth && "bg-gray-50 text-gray-400",
                  isCurrentMonth && !isPast && "hover:border-purple-300 hover:shadow-md cursor-pointer",
                  isPast && "opacity-40 cursor-not-allowed bg-gray-50",
                  isSelected && "ring-2 ring-purple-500 border-purple-500 bg-purple-50",
                  isToday && !isSelected && "border-purple-300 bg-purple-50/50",
                  dayStatus === "available" && isCurrentMonth && !isSelected && "border-green-200 bg-green-50/30",
                  dayStatus === "limited" && isCurrentMonth && !isSelected && "border-amber-200 bg-amber-50/30",
                  dayStatus === "booked" && isCurrentMonth && "border-red-200 bg-red-50/30"
                )}
              >
                <span className={cn(
                  "text-sm font-medium",
                  isToday && "text-purple-700",
                  !isToday && isCurrentMonth && "text-gray-700"
                )}>
                  {date.getDate()}
                </span>
                
                {!isPast && dayStatus !== "none" && (
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full mt-0.5",
                    dayStatus === "available" && "bg-green-500",
                    dayStatus === "limited" && "bg-amber-500",
                    dayStatus === "booked" && "bg-red-400"
                  )} />
                )}
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <div className="space-y-3 pt-4 border-t border-purple-100">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <h4 className="text-sm font-semibold text-purple-900">Available Time Slots</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {(() => {
                const dateKey = formatDateKey(selectedDate);
                const daySlots = availabilityData.get(dateKey) || TIME_SLOTS_CONFIG.map(s => ({ ...s, id: s.type, available: true }));
                
                return daySlots.map((slot) => {
                  const isSlotSelected = selectedSlot === slot.type;
                  const isDisabled = !slot.available || isPastDate(selectedDate);
                  const price = Math.round(basePrice * slot.multiplier);
                  
                  return (
                    <button
                      key={slot.id}
                      onClick={() => handleSlotSelect(selectedDate, slot)}
                      disabled={isDisabled}
                      className={cn(
                        "relative p-3 rounded-xl border text-left transition-all duration-200",
                        isDisabled && "opacity-50 cursor-not-allowed bg-gray-100",
                        !isDisabled && !isSlotSelected && "hover:border-purple-300 hover:bg-purple-50 cursor-pointer",
                        isSlotSelected && "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          "text-xs font-semibold",
                          isSlotSelected ? "text-purple-700" : "text-gray-700"
                        )}>
                          {slot.label}
                        </span>
                        {slot.available ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-1.5">{slot.time}</div>
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-sm font-bold",
                          isSlotSelected ? "text-purple-600" : "text-gray-600"
                        )}>
                          ₹{price.toLocaleString("en-IN")}
                        </span>
                        {!slot.available && (
                          <Badge variant="destructive" className="h-5 text-xs">Booked</Badge>
                        )}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {selectedDate && selectedSlot && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-purple-900 mb-1">Selected Date & Time</h4>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">
                    {selectedDate.toLocaleDateString("en-IN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">
                    {TIME_SLOTS_CONFIG.find(s => s.type === selectedSlot)?.label}
                  </span>
                  {" - "}
                  <span>
                    ₹{Math.round(basePrice * (TIME_SLOTS_CONFIG.find(s => s.type === selectedSlot)?.multiplier || 1)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
