"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvailabilityCalendar, type TimeSlot, type TimeSlotType } from "@/components/venues/availability-calendar";
import { toast } from "sonner";
import { Calendar, DollarSign, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BlockedSlot {
  date: string;
  slot: TimeSlotType;
}

export default function VenueCalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotType | null>(null);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);

  const handleDateSelect = (date: Date, slot: TimeSlot) => {
    setSelectedDate(date);
    setSelectedSlot(slot.type);
    toast.info(`Selected: ${slot.label} on ${date.toLocaleDateString()}`, {
      description: `Price: ₹${Math.round(150000 * slot.multiplier).toLocaleString("en-IN")}`
    });
  };

  const handleBlockSlot = () => {
    if (!selectedDate || !selectedSlot) {
      toast.error("Please select a date and time slot first");
      return;
    }
    
    const dateKey = selectedDate.toISOString().split("T")[0];
    const isAlreadyBlocked = blockedSlots.some(
      s => s.date === dateKey && s.slot === selectedSlot
    );
    
    if (isAlreadyBlocked) {
      toast.error("This slot is already blocked");
      return;
    }
    
    setBlockedSlots([...blockedSlots, { date: dateKey, slot: selectedSlot }]);
    toast.success("Slot blocked successfully", {
      description: `${selectedDate.toLocaleDateString()} - ${selectedSlot} is now blocked`
    });
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const handleUnblockSlot = (date: string, slot: TimeSlotType) => {
    setBlockedSlots(blockedSlots.filter(s => !(s.date === date && s.slot === slot)));
    toast.success("Slot unblocked successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Venue Calendar</h1>
          <p className="text-neutral-600">Manage availability and block dates</p>
        </div>
        <Button 
          onClick={handleBlockSlot} 
          disabled={!selectedDate || !selectedSlot}
          className="bg-red-600 hover:bg-red-700"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Block Selected Slot
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">This Month</p>
                <p className="text-2xl font-bold text-black mt-1">8</p>
              </div>
              <div className="p-3 rounded-full bg-silver-100 text-neutral-700">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Blocked Dates</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{blockedSlots.length}</p>
              </div>
              <div className="p-3 rounded-full bg-red-50 text-red-600">
                <XCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Revenue</p>
                <p className="text-2xl font-bold text-green-600 mt-1">₹4.25L</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Availability Calendar</CardTitle>
            <CardDescription>Click on a date and time slot, then block it</CardDescription>
          </CardHeader>
          <CardContent>
            <AvailabilityCalendar
              venueId="venue-1"
              basePrice={150000}
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
            />
          </CardContent>
        </Card>

        {/* Blocked Slots */}
        <Card>
          <CardHeader>
            <CardTitle>Blocked Slots</CardTitle>
            <CardDescription>Manage your blocked time slots</CardDescription>
          </CardHeader>
          <CardContent>
            {blockedSlots.length === 0 ? (
              <div className="text-center py-8 text-neutral-600">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-silver-300" />
                <p>No blocked slots yet</p>
                <p className="text-sm">Select a date and time to block</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blockedSlots.map((blocked, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-red-900">
                        {new Date(blocked.date).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </p>
                      <p className="text-sm text-red-700 capitalize">{blocked.slot.replace("_", " ")}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnblockSlot(blocked.date, blocked.slot)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
