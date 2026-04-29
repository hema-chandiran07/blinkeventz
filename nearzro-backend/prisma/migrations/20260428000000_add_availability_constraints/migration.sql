-- Fix availability race condition: add unique constraints on (venueId, date, timeSlot) and (vendorId, date, timeSlot)
-- This prevents double-booking of the same slot for a venue or vendor.

ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "venueId_date_timeSlot_unique" UNIQUE ("venueId", "date", "timeSlot");
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "vendorId_date_timeSlot_unique" UNIQUE ("vendorId", "date", "timeSlot");
