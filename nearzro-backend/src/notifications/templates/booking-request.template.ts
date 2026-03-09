export function bookingRequestTemplate(data: any) {
  return {
    title: '📥 New Booking Request',
    message: `New booking request for ${data.eventTitle}`,
    deepLink: `app://bookings/${data.bookingId}`,
    actions: ['ACCEPT', 'REJECT'],
  };
}
