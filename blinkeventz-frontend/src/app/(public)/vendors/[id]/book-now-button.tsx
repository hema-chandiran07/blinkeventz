"use client";

import { Button } from "@/components/ui/button";
import { CalendarCheck } from "lucide-react";
import { useRouter } from "next/navigation";

interface BookNowButtonProps {
  vendorId?: string;
  vendorName?: string;
  price?: number;
  serviceName?: string;
}

export function BookNowButton({ vendorId, vendorName, price, serviceName }: BookNowButtonProps) {
  const router = useRouter();
  
  const handleBookNow = () => {
    // Store selected vendor data for checkout page
    if (vendorId && vendorName && price) {
      const bookingData = {
        type: 'vendor' as const,
        id: vendorId,
        name: vendorName,
        price: price,
        service: serviceName || 'Selected Service',
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
