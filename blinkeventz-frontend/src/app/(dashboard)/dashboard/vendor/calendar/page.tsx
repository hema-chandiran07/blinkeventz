"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvailabilityCalendar, type TimeSlot, type TimeSlotType } from "@/components/venues/availability-calendar";
import { toast } from "sonner";
import { Calendar, Clock, DollarSign, Users } from "lucide-react";

export default function VendorCalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotType | null>(null);

  const handleDateSelect = (date: Date, slot: TimeSlot) => {
    setSelectedDate(date);
    setSelectedSlot(slot.type);
    toast.info(`Selected: ${slot.label} on ${date.toLocaleDateString()}`, {
      description: `You can block this slot if needed`
    });
  };

  const handleBlockSlot = () => {
    if (!selectedDate || !selectedSlot) {
      toast.error("Please select a date and time slot first");
      return;
    }
    toast.success("Slot blocked successfully", {
      description: `${selectedDate.toLocaleDateString()} - ${selectedSlot} is now blocked`
    });
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const services = [
    { id: 1, name: "Wedding Photography Package", date: "2024-06-15", status: "confirmed" },
    { id: 2, name: "Pre-Wedding Photoshoot", date: "2024-05-20", status: "pending" },
    { id: 3, name: "Event Videography", date: "2024-07-10", status: "confirmed" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Calendar</h1>
          <p className="text-gray-500">Manage your availability and bookings</p>
        </div>
        <Button onClick={handleBlockSlot} disabled={!selectedDate || !selectedSlot}>
          <Calendar className="h-4 w-4 mr-2" />
          Block Selected Slot
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">This Month</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">12</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">3</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-50 text-yellow-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Revenue</p>
                <p className="text-2xl font-bold text-green-600 mt-1">₹2.5L</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Availability</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">85%</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
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
            <CardDescription>Block dates when you&apos;re not available</CardDescription>
          </CardHeader>
          <CardContent>
            <AvailabilityCalendar
              venueId="vendor-1"
              basePrice={50000}
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
            />
          </CardContent>
        </Card>

        {/* Upcoming Services */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Services</CardTitle>
            <CardDescription>Your scheduled bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services.map((service) => (
                <div key={service.id} className="p-4 border rounded-lg hover:border-purple-200 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{service.name}</h4>
                    <Badge className={service.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                      {service.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{new Date(service.date).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
