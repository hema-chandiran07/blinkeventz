"use client";

import { Button } from "@/components/ui/button";
import { CalendarCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import type { TimeSlotType } from "@/components/venues/availability-calendar";

interface BookNowButtonProps {
  vendorId?: string;
  vendorName?: string;
  price?: number;
  basePrice?: number;
  selectedTime?: string;
  selectedDate?: Date | null;
  selectedSlot?: TimeSlotType | null;
  serviceType?: string;
}

export function BookNowButton({ 
  vendorId, 
  vendorName, 
  price, 
  basePrice,
  selectedTime,
  selectedDate,
  selectedSlot,
  serviceType
}: BookNowButtonProps) {
  const router = useRouter();

  const handleBookNow = () => {
    if (vendorId && vendorName && price) {
      const bookingData = {
        type: 'vendor' as const,
        id: vendorId,
        name: vendorName,
        price: price,
        basePrice: basePrice,
        package: selectedTime || 'Selected Time Slot',
        time: selectedTime || 'Selected Time Slot',
        date: selectedDate?.toISOString(),
        slot: selectedSlot,
        serviceType: serviceType || 'Service',
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
