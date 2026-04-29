import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding test users for all roles...\n");

  const password = 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  // 1. ADMIN USER
  try {
    await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@NearZro.com',
        phone: '+91 9876543210',
        passwordHash,
        role: Role.ADMIN,
        isActive: true,
        isEmailVerified: true,
      },
    });
    console.log('✅ Admin: admin@NearZro.com / test123');
  } catch (e: any) {
    if (e.code === 'P2002') {
      console.log('⚠️  Admin already exists');
    } else {
      throw e;
    }
  }

  // 2. CUSTOMER USER
  try {
    await prisma.user.create({
      data: {
        name: 'Test Customer',
        email: 'customer@test.com',
        phone: '+91 9876543211',
        passwordHash,
        role: Role.CUSTOMER,
        isActive: true,
        isEmailVerified: true,
      },
    });
    console.log('✅ Customer: customer@test.com / test123');
  } catch (e: any) {
    if (e.code === 'P2002') {
      console.log('⚠️  Customer already exists');
    } else {
      throw e;
    }
  }

  // 3. VENDOR USER
  try {
    const vendorUser = await prisma.user.create({
      data: {
        name: 'Test Vendor',
        email: 'vendor@test.com',
        phone: '+91 9876543212',
        passwordHash,
        role: Role.VENDOR,
        isActive: true,
        isEmailVerified: true,
      },
    });
    console.log('✅ Vendor: vendor@test.com / test123');

    // Create Vendor Profile
    await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        businessName: 'Test Photography Services',
        description: 'Professional photography services for all events',
        city: 'Chennai',
        area: 'Anna Nagar',
        serviceRadiusKm: 50,
        verificationStatus: 'VERIFIED',
      },
    });
    console.log('   └─ Vendor profile created');
  } catch (e: any) {
    if (e.code === 'P2002') {
      console.log('⚠️  Vendor already exists');
    } else {
      throw e;
    }
  }

  // 4. VENUE OWNER USER
  try {
    const venueOwnerUser = await prisma.user.create({
      data: {
        name: 'Test Venue Owner',
        email: 'venueowner@test.com',
        phone: '+91 9876543213',
        passwordHash,
        role: Role.VENUE_OWNER,
        isActive: true,
        isEmailVerified: true,
      },
    });
    console.log('✅ Venue Owner: venueowner@test.com / test123');

    // Create Venue
    await prisma.venue.create({
      data: {
        ownerId: venueOwnerUser.id,
        name: 'Test Grand Hall',
        type: 'BANQUET',
        description: 'Beautiful banquet hall for weddings and events',
        address: '123 Main Street',
        city: 'Chennai',
        area: 'T Nagar',
        pincode: '600017',
        capacityMin: 200,
        capacityMax: 800,
        basePriceMorning: 50000,
        basePriceEvening: 75000,
        basePriceFullDay: 120000,
        amenities: 'Parking,AC,Catering,Decoration',
        policies: 'No alcohol,Music till 10PM',
        status: 'ACTIVE',
      },
    });
    console.log('   └─ Venue created: Test Grand Hall');
  } catch (e: any) {
    if (e.code === 'P2002') {
      console.log('⚠️  Venue Owner already exists');
    } else {
      throw e;
    }
  }

   // 5. EVENT MANAGER USER
   try {
     await prisma.user.create({
       data: {
         name: 'Test Event Manager',
         email: 'manager@test.com',
         phone: '+91 9876543214',
         passwordHash,
         role: Role.EVENT_MANAGER,
         isActive: true,
         isEmailVerified: true,
       },
     });
     console.log('✅ Event Manager: manager@test.com / test123');
   } catch (e: any) {
     if (e.code === 'P2002') {
       console.log('⚠️  Event Manager already exists');
     } else {
       throw e;
     }
   }

   // Seed default PlatformSettings
   try {
     await prisma.platformSettings.upsert({
       where: { id: 'default' },
       update: {},
       create: {
         id: 'default',
         platformFeePercent: 5,
         gstPercent: 18,
         expressFeeFixed: 99,
         commissionPercent: 10,
         tdsPercent: 1,
       },
     });
     console.log('✅ PlatformSettings seeded');
   } catch (e: any) {
     if (e.code === 'P2002') {
       console.log('⚠️  PlatformSettings already exists');
     } else {
       throw e;
     }
   }

   console.log('\n🎉 All test users seeded successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('┌─────────────────────────────────────────────────────┐');
  console.log('│ Email                    │ Password │ Role          │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log('│ admin@NearZro.com        │ admin123 │ ADMIN         │');
  console.log('│ customer@test.com        │ admin123 │ CUSTOMER      │');
  console.log('│ vendor@test.com          │ admin123 │ VENDOR        │');
  console.log('│ venueowner@test.com      │ admin123 │ VENUE_OWNER   │');
  console.log('│ manager@test.com         │ admin123 │ EVENT_MANAGER │');
  console.log('└─────────────────────────────────────────────────────┘');
}

main()
  .catch(e => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
