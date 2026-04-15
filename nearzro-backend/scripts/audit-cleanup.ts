import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Starting Database Media Audit...');

  // 1. Audit Venues
  const venues = await prisma.venue.findMany({
    select: { id: true, name: true, venueImages: true, kycDocFiles: true, venueGovtCertificateFiles: true }
  });

  for (const venue of venues) {
    let changed = false;
    const cleanVenueImages = venue.venueImages.filter(img => {
      if (img.startsWith('/uploads/')) {
        console.log(`⚠️ Removing broken venue image from [${venue.name} (ID: ${venue.id})]: ${img}`);
        changed = true;
        return false;
      }
      return true;
    });

    const cleanKycFiles = venue.kycDocFiles.filter(file => {
      if (file.startsWith('/uploads/')) {
        console.log(`⚠️ Removing broken KYC file from [${venue.name} (ID: ${venue.id})]: ${file}`);
        changed = true;
        return false;
      }
      return true;
    });

    if (changed) {
      await prisma.venue.update({
        where: { id: venue.id },
        data: {
          venueImages: cleanVenueImages,
          kycDocFiles: cleanKycFiles,
          // Clear any related photo records too
          photos: {
            deleteMany: {
              url: { startsWith: '/uploads/' }
            }
          }
        }
      });
    }
  }

  // 2. Audit KYC Documents
  const kycDocs = await prisma.kycDocument.findMany({
    where: { docFileUrl: { startsWith: '/uploads/' } }
  });

  for (const doc of kycDocs) {
    console.log(`⚠️ Clearing broken docFileUrl for KycDocument (ID: ${doc.id})`);
    await prisma.kycDocument.update({
      where: { id: doc.id },
      data: { docFileUrl: '' }
    });
  }

  // 3. Audit Users
  const users = await prisma.user.findMany({
    where: { image: { startsWith: '/uploads/' } }
  });

  for (const user of users) {
    console.log(`⚠️ Clearing broken profile image for User [${user.name} (ID: ${user.id})]`);
    await prisma.user.update({
      where: { id: user.id },
      data: { image: null }
    });
  }

  console.log('✅ Audit and Cleanup Complete.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
