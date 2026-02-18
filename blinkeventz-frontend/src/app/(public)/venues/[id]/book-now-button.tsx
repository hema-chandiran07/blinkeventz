"use client";

import { Button } from "@/components/ui/button";
import { CalendarCheck } from "lucide-react";
import { useRouter } from "next/navigation";

interface BookNowButtonProps {
  venueId?: string;
  venueName?: string;
  price?: number;
  selectedPackage?: string;
  selectedTime?: string;
}

export function BookNowButton({ venueId, venueName, price, selectedPackage, selectedTime }: BookNowButtonProps) {
  const router = useRouter();
  
  const handleBookNow = () => {
    // Store selected venue data for checkout page
    if (venueId && venueName && price) {
      const bookingData = {
        type: 'venue' as const,
        id: venueId,
        name: venueName,
        price: price,
        package: selectedPackage || 'Evening',
        time: selectedTime || '4 PM - 10 PM',
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
