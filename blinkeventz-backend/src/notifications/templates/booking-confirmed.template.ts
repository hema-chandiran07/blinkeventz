// booking-confirmed.template.ts
export function bookingConfirmedTemplate(data: any) {
  return {
    title: '🎉 Booking Confirmed',
    message: `Your booking for ${data.eventTitle} on ${data.date} is confirmed.`,
    deepLink: `app://bookings/${data.bookingId}`,
  };
}
