"use client";

import { Button } from "@/components/ui/button";
import { CalendarCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import type { TimeSlotType } from "@/components/venues/availability-calendar";

interface BookNowButtonProps {
  venueId?: string;
  venueName?: string;
  price?: number;
  basePrice?: number;
  selectedTime?: string;
  selectedDate?: Date | null;
  selectedSlot?: TimeSlotType | null;
}

export function BookNowButton({ 
  venueId, 
  venueName, 
  price, 
  basePrice,
  selectedTime,
  selectedDate,
  selectedSlot 
}: BookNowButtonProps) {
  const router = useRouter();

  const handleBookNow = () => {
    if (venueId && venueName && price) {
      const bookingData = {
        type: 'venue' as const,
        id: venueId,
        name: venueName,
        price: price,
        basePrice: basePrice,
        time: selectedTime || 'Selected Time Slot',
        date: selectedDate?.toISOString(),
        slot: selectedSlot,
      };
      localStorage.setItem('blinkeventz_booking', JSON.stringify(bookingData));
    }
    router.push("/checkout");
  };

  return (
    <Button
      className="w-full h-12 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300"
      onClick={handleBookNow}
    >
      <CalendarCheck className="mr-2 h-5 w-5" />
      Book Now
    </Button>
  );
}
