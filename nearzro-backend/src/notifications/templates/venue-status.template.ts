// venue-status.template.ts
export function venueStatusTemplate(data: any) {
  const isApproved = data.status === 'APPROVED';
  return {
    title: isApproved ? '🏢 Venue Approved' : '🚫 Venue Rejected',
    message: isApproved 
      ? `Congratulations! Your venue "${data.venueName}" has been approved and is now live for bookings.`
      : `Your venue listing for "${data.venueName}" was not approved. ${data.rejectionReason ? `Reason: ${data.rejectionReason}` : 'Please review our listing guidelines.'}`,
    deepLink: `/dashboard/venue/details`,
  };
}
