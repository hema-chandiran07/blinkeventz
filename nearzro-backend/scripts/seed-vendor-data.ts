/**
 * Seed script for Vendor Dashboard Testing
 * Adds realistic test data for comprehensive curl testing
 * 
 * Run with: npx ts-node scripts/seed-vendor-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting vendor data seeding...');

  // Get the test vendor (userId: 5)
  const vendor = await prisma.vendor.findUnique({
    where: { userId: 5 },
    include: { services: true },
  });

  if (!vendor) {
    console.error('❌ Vendor with userId 5 not found. Please create vendor first.');
    return;
  }

  console.log(`✅ Found vendor: ${vendor.businessName} (ID: ${vendor.id})`);

  // Create availability slots for testing
  console.log('\n📅 Creating availability slots...');
  const today = new Date();
  const slots: any[] = [];
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    slots.push({
      entityType: 'VENDOR',
      entityId: vendor.id,
      date: new Date(date.setHours(0, 0, 0, 0)),
      timeSlot: 'MORNING',
      status: 'AVAILABLE',
    });
    slots.push({
      entityType: 'VENDOR',
      entityId: vendor.id,
      date: new Date(date.setHours(0, 0, 0, 0)),
      timeSlot: 'EVENING',
      status: 'AVAILABLE',
    });
  }

  const blockedDate = new Date(today);
  blockedDate.setDate(blockedDate.getDate() + 10);
  slots.push({
    entityType: 'VENDOR',
    entityId: vendor.id,
    date: new Date(blockedDate.setHours(0, 0, 0, 0)),
    timeSlot: 'FULL_DAY',
    status: 'BLOCKED',
  });

  await prisma.availabilitySlot.createMany({
    data: slots,
    skipDuplicates: true,
  });
  console.log(`✅ Created ${slots.length} availability slots`);

  // Get or create a test customer
  let customer = await prisma.user.findUnique({
    where: { email: 'customer_test@example.com' },
  });

  if (!customer) {
    customer = await prisma.user.create({
      data: {
        name: 'Test Customer',
        email: 'customer_test@example.com',
        phone: '+919999888877',
        passwordHash: '$2b$10$testhash',
        role: 'CUSTOMER',
        isEmailVerified: true,
      },
    });
    console.log('✅ Created test customer');
  }

  // Create bookings with different statuses
  console.log('\n📋 Creating test bookings...');
  
  const bookingsData = [
    { status: 'COMPLETED', daysAgo: 10, completedDaysAgo: 5 },
    { status: 'COMPLETED', daysAgo: 5, completedDaysAgo: 2 },
    { status: 'CONFIRMED', daysAgo: 3 },
    { status: 'PENDING', daysAgo: 1 },
    { status: 'CANCELLED', daysAgo: 7 },
  ];

  const createdBookings: any[] = [];
  
  for (const bookingData of bookingsData) {
    const bookingDate = new Date(today);
    bookingDate.setDate(bookingDate.getDate() + bookingData.daysAgo);
    
    let slot = await prisma.availabilitySlot.findFirst({
      where: {
        vendorId: vendor.id,
        date: {
          equals: new Date(bookingDate.setHours(0, 0, 0, 0)),
        },
      },
    });

    if (!slot) {
      slot = await prisma.availabilitySlot.create({
        data: {
          entityType: 'VENDOR',
          vendorId: vendor.id,
          date: new Date(bookingDate.setHours(0, 0, 0, 0)),
          timeSlot: 'EVENING',
          status: 'BOOKED',
        },
      });
    } else {
      await prisma.availabilitySlot.update({
        where: { id: slot.id },
        data: { status: 'BOOKED' },
      });
    }

    const booking = await prisma.booking.create({
      data: {
        userId: customer!.id,
        slotId: slot.id,
        status: bookingData.status as any,
        createdAt: new Date(Date.now() - bookingData.daysAgo * 24 * 60 * 60 * 1000),
        completedAt: bookingData.completedDaysAgo 
          ? new Date(Date.now() - bookingData.completedDaysAgo * 24 * 60 * 60 * 1000)
          : null,
      },
      include: {
        slot: true,
        user: true,
      },
    });

    createdBookings.push(booking);
    console.log(`  - Created ${booking.status} booking (ID: ${booking.id})`);
  }

  // Create reviews for the vendor
  console.log('\n⭐ Creating test reviews...');
  
  const reviewsData = [
    { rating: 5, title: 'Excellent Photography Services!', comment: 'Amazing work! The team captured every moment beautifully.' },
    { rating: 4, title: 'Great Experience', comment: 'Professional service and good quality photos.' },
    { rating: 5, title: 'Best in Town!', comment: 'Incredible photography skills. The drone shots were breathtaking.' },
    { rating: 3, title: 'Average Experience', comment: 'Photos were good but communication could be better.' },
    { rating: 5, title: 'Perfect Wedding Photos', comment: 'We are thrilled with our wedding album.' },
  ];

  const reviews: any[] = [];
  for (const reviewData of reviewsData) {
    const review = await prisma.review.create({
      data: {
        userId: customer!.id,
        vendorId: vendor.id,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        status: 'APPROVED',
        helpful: Math.floor(Math.random() * 10),
      },
    });
    reviews.push(review);
    console.log(`  - Created ${reviewData.rating}-star review (ID: ${review.id})`);
  }

  // Create payouts for completed bookings
  console.log('\n💰 Creating test payouts...');
  
  const payoutsData = [
    { bookingIndex: 0, status: 'COMPLETED', amount: 95000 },
    { bookingIndex: 1, status: 'PENDING', amount: 47500 },
  ];

  for (const payoutData of payoutsData) {
    const booking = createdBookings[payoutData.bookingIndex];
    if (booking) {
      const payout = await prisma.payout.create({
        data: {
          vendorId: vendor.id,
          eventId: null,
          venueId: null,
          amount: payoutData.amount,
          status: payoutData.status as any,
          createdAt: new Date(Date.now() - (payoutData.bookingIndex + 1) * 24 * 60 * 60 * 1000),
        },
      });
      console.log(`  - Created ${payout.status} payout of ₹${payout.amount} (ID: ${payout.id})`);
    }
  }

  // Update vendor portfolio with images
  console.log('\n📸 Updating vendor portfolio...');
  await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      images: [
        'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
        'https://images.unsplash.com/photo-1519241040233-1dd12c036097?w=800',
        'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=800',
      ],
    },
  });
  console.log('✅ Updated vendor portfolio');

  // Summary
  console.log('\n📊 Seeding Summary:');
  console.log('==================');
  console.log(`Vendor: ${vendor.businessName} (ID: ${vendor.id})`);
  console.log(`Services: ${vendor.services.length}`);
  console.log(`Availability Slots: ${slots.length}`);
  console.log(`Bookings Created: ${createdBookings.length}`);
  console.log(`Reviews Created: ${reviews.length}`);
  console.log(`Payouts Created: ${payoutsData.length}`);
  console.log('\n✅ Seeding completed successfully!');
  console.log('\n🧪 Ready for curl testing!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
