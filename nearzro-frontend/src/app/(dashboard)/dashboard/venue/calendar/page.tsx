"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, XCircle,
  Clock, DollarSign, Plus, Trash2, Loader2
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

type TimeSlotType = "morning" | "evening" | "full_day" | "night";

interface Booking {
  id: number;
  customerName: string;
  date: string;
  timeSlot: TimeSlotType;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  amount: number;
  eventName: string;
}

interface BlockedSlot {
  id?: number;
  date: string;
  timeSlot: TimeSlotType;
  reason?: string;
}

const TIME_SLOT_LABELS: Record<TimeSlotType, string> = {
  morning: "Morning",
  evening: "Evening",
  full_day: "Full Day",
  night: "Night"
};

export default function VenueCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotType | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockLoading, setBlockLoading] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);

  useEffect(() => {
    loadCalendarData();
  }, [currentMonth]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);

      // Load venues first (needed for unblock)
      const venuesResponse = await api.get('/venues/my');
      setVenues(venuesResponse.data || []);
      
      // Load bookings from API
      const bookingsResponse = await api.get('/venues/me/bookings');
      const data = bookingsResponse.data || [];

      const transformedBookings: Booking[] = data.map((booking: any) => ({
        id: booking.id,
        customerName: booking.user?.name || 'Unknown',
        date: booking.slot?.date || '',
        timeSlot: (booking.slot?.timeSlot || 'MORNING') as any,
        status: (booking.status || 'PENDING') as any,
        amount: booking.totalAmount || 0,
        eventName: booking.slot?.eventTitle || booking.slot?.name || 'Event',
      }));
      setBookings(transformedBookings);

      // Load blocked slots from correct endpoint
      try {
        const blockedResponse = await api.get('/venues/venue-owner/blocked-slots');
        setBlockedSlots(blockedResponse.data || []);
      } catch (error) {
        console.warn("Could not fetch blocked slots:", error);
        setBlockedSlots([]);
      }
    } catch (error) {
      console.error("Failed to load calendar data:", error);
      toast.error("Failed to load calendar data");
      setBookings([]);
      setBlockedSlots([]);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

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

  const getBookingsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(b => b.date === dateStr);
  };

  const isBlocked = (date: Date, slot?: TimeSlotType) => {
    const dateStr = date.toISOString().split('T')[0];
    if (slot) {
      return blockedSlots.some(b =>
        b.date === dateStr &&
        (b.timeSlot as string).toLowerCase() === slot.toLowerCase()
      );
    }
    return blockedSlots.some(b => b.date === dateStr);
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDateClick = (date: Date) => {
    if (isPastDate(date)) return;
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotClick = (date: Date, slot: TimeSlotType) => {
    if (isPastDate(date)) return;
    setSelectedDate(date);
    setSelectedSlot(slot);
    
    if (!isBlocked(date, slot)) {
      setBlockDialogOpen(true);
    }
  };

  const handleBlockSlot = async () => {
    if (!selectedDate || !selectedSlot) return;

    setBlockLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      await api.post('/venues/venue-owner/blocked-slots', {
        date: dateStr,
        timeSlot: selectedSlot,
        reason: blockReason,
      });

      setBlockedSlots([...blockedSlots, {
        date: dateStr,
        timeSlot: selectedSlot,
        reason: blockReason,
      }]);

      toast.success("Slot blocked successfully");
      setBlockDialogOpen(false);
      setBlockReason("");
      setSelectedSlot(null);
    } catch (error: any) {
      console.error("Block error:", error);
      toast.error(error?.response?.data?.message || "Failed to block slot");
    } finally {
      setBlockLoading(false);
    }
  };

  const handleUnblockSlot = async (date: string, slot: TimeSlotType) => {
    try {
      // Get the first venue ID to pass as query param
      const venueId = venues.length > 0 ? venues[0].id : null;
      // Use the correct endpoint under /venues/
      await api.delete(`/venues/venue-owner/blocked-slots?date=${date}&slot=${slot}${venueId ? `&venueId=${venueId}` : ''}`);
      setBlockedSlots(blockedSlots.filter(s => !(s.date === date && s.timeSlot === slot)));
      toast.success("Slot unblocked successfully");
    } catch (error: any) {
      console.error("Unblock error:", error);
      toast.error("Failed to unblock slot");
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const stats = {
    totalBookings: bookings.filter(b => 
      b.date.startsWith(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`)
    ).length,
    confirmedBookings: bookings.filter(b => 
      b.status === "confirmed" && 
      b.date.startsWith(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`)
    ).length,
    blockedSlots: blockedSlots.filter(b => 
      b.date.startsWith(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`)
    ).length,
    revenue: bookings.filter(b => 
      (b.status === "confirmed" || b.status === "completed") && 
      b.date.startsWith(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`)
    ).reduce((sum, b) => sum + b.amount, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black">Venue Calendar</h1>
          <p className="text-neutral-600">Manage availability, bookings, and blocked dates</p>
        </div>
        <Button
          onClick={() => setBlockDialogOpen(true)}
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Block Date
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid gap-4 md:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">This Month</p>
                <p className="text-2xl font-bold text-black mt-1">{stats.totalBookings}</p>
              </div>
              <div className="p-3 rounded-full bg-silver-100 text-neutral-700">
                <CalendarIcon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Confirmed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.confirmedBookings}</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Blocked</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.blockedSlots}</p>
              </div>
              <div className="p-3 rounded-full bg-red-50 text-red-600">
                <XCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Revenue</p>
                <p className="text-2xl font-bold text-black mt-1">₹{(stats.revenue / 100000).toFixed(2)}L</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-black">Availability Calendar</CardTitle>
                <CardDescription className="text-neutral-600">Click on a slot to block or view details</CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[160px] text-center">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-neutral-600">Booked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-neutral-600">Blocked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-xs text-neutral-600">Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-neutral-900 ring-2 ring-neutral-200" />
                <span className="text-xs text-neutral-600">Today</span>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-neutral-500 py-2">
                  {day}
                </div>
              ))}

              {calendarDays.map(({ date, isCurrentMonth, isToday }) => {
                const dateStr = date.toISOString().split('T')[0];
                const dayBookings = getBookingsForDate(date);
                const dayBlocked = isBlocked(date);
                const isPast = isPastDate(date);
                const hasConfirmed = dayBookings.some(b => b.status === "confirmed" || b.status === "completed");
                const hasPending = dayBookings.some(b => b.status === "pending");

                let bgColor = "";
                if (isPast) {
                  bgColor = "bg-neutral-50";
                } else if (dayBlocked) {
                  bgColor = "bg-red-50 border-red-200";
                } else if (hasConfirmed) {
                  bgColor = "bg-green-50 border-green-200";
                } else if (hasPending) {
                  bgColor = "bg-amber-50 border-amber-200";
                }

                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDateClick(date)}
                    disabled={isPast}
                    className={cn(
                      "relative h-24 rounded-lg border transition-all duration-200 p-1 flex flex-col items-start justify-start overflow-hidden",
                      !isCurrentMonth && "bg-neutral-50 text-neutral-400",
                      isCurrentMonth && !isPast && "hover:border-neutral-400 hover:shadow-md cursor-pointer",
                      isPast && "opacity-50 cursor-not-allowed",
                      isToday && !isPast && "ring-2 ring-neutral-900 border-neutral-900",
                      bgColor
                    )}
                  >
                    <span className={cn(
                      "text-sm font-medium",
                      isToday && "text-neutral-900 font-bold",
                      !isToday && isCurrentMonth && "text-neutral-700"
                    )}>
                      {date.getDate()}
                    </span>

                    <div className="flex flex-wrap gap-1 mt-1 w-full">
                      {dayBookings.slice(0, 3).map((booking) => (
                        <div
                          key={booking.id}
                          className={cn(
                            "w-2 h-2 rounded-full",
                            booking.status === "confirmed" || booking.status === "completed" ? "bg-green-500" :
                            booking.status === "pending" ? "bg-amber-500" : "bg-red-500"
                          )}
                          title={`${booking.eventName} (${booking.timeSlot})`}
                        />
                      ))}
                      {dayBlocked && (
                        <div className="w-2 h-2 rounded-full bg-red-600" title="Blocked" />
                      )}
                    </div>

                    {dayBookings.length > 0 && (
                      <div className="text-xs text-neutral-600 mt-1 line-clamp-2 w-full">
                        {dayBookings.length} booking{dayBookings.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Selected Date Details */}
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-black">
                    {selectedDate.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getBookingsForDate(selectedDate).length === 0 && !isBlocked(selectedDate) ? (
                    <div className="text-center py-4">
                      <CalendarIcon className="h-12 w-12 text-neutral-300 mx-auto mb-2" />
                      <p className="text-sm text-neutral-600">No bookings or blocks</p>
                      <p className="text-xs text-neutral-500">Click on a time slot below to block</p>
                    </div>
                  ) : (
                    <>
                      {getBookingsForDate(selectedDate).map((booking) => (
                        <div key={booking.id} className="p-3 rounded-lg border border-silver-200 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={cn(
                              "text-xs",
                              booking.status === "confirmed" ? "bg-green-100 text-green-700" :
                              booking.status === "pending" ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            )}>
                              {booking.status}
                            </Badge>
                            <span className="text-sm font-semibold text-black">₹{booking.amount.toLocaleString()}</span>
                          </div>
                          <p className="text-sm font-medium text-black">{booking.eventName}</p>
                          <p className="text-xs text-neutral-600">{booking.customerName}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
                            <Clock className="h-3 w-3" />
                            {TIME_SLOT_LABELS[booking.timeSlot]}
                          </div>
                        </div>
                      ))}
                      {isBlocked(selectedDate) && (
                        <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium text-red-800">Blocked</span>
                          </div>
                          {blockedSlots.filter(b => b.date === selectedDate.toISOString().split('T')[0]).map((block, i) => (
                            <div key={i} className="mt-2">
                              <p className="text-xs text-red-700">{TIME_SLOT_LABELS[block.timeSlot]}</p>
                              {block.reason && <p className="text-xs text-red-600 mt-1">{block.reason}</p>}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnblockSlot(block.date, block.timeSlot)}
                                className="mt-2 h-7 text-xs"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Unblock
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Time Slots */}
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Block Time Slot</CardTitle>
              <CardDescription className="text-neutral-600">Select a slot to block for {selectedDate ? selectedDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "a date"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(Object.keys(TIME_SLOT_LABELS) as TimeSlotType[]).map((slot) => {
                const isSlotBlocked = selectedDate && isBlocked(selectedDate, slot);
                return (
                  <Button
                    key={slot}
                    variant={isSlotBlocked ? "outline" : "outline"}
                    className={cn(
                      "w-full justify-between",
                      isSlotBlocked && "border-red-300 bg-red-50 text-red-700"
                    )}
                    onClick={() => selectedDate && handleSlotClick(selectedDate, slot)}
                    disabled={!selectedDate}
                  >
                    <span>{TIME_SLOT_LABELS[slot]}</span>
                    {isSlotBlocked ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Block Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-black">Block Time Slot</DialogTitle>
            <DialogDescription className="text-neutral-600">
              Block this time slot to prevent bookings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDate && (
              <div>
                <p className="text-sm font-medium text-neutral-600 mb-1">Selected Date</p>
                <p className="font-medium text-black">
                  {selectedDate.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-neutral-600 mb-2">Time Slot</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(TIME_SLOT_LABELS) as TimeSlotType[]).map((slot) => (
                  <Button
                    key={slot}
                    variant={selectedSlot === slot ? "default" : "outline"}
                    className={cn(
                      "w-full",
                      selectedSlot === slot
                        ? "bg-black hover:bg-neutral-800 text-white"
                        : "hover:bg-neutral-100 text-black"
                    )}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {TIME_SLOT_LABELS[slot]}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600 mb-2">Reason (optional)</p>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-neutral-300 px-3 py-2 text-sm text-black bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
                placeholder="e.g., Maintenance, Private event, Holiday..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)} disabled={blockLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleBlockSlot}
              disabled={blockLoading || !selectedSlot}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {blockLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Blocking...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Block Slot
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
