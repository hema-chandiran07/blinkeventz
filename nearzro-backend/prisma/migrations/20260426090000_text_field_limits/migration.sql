-- CreateEnum
CREATE TYPE "PhotoCategory" AS ENUM ('GALLERY', 'MAIN', 'CERTIFICATE', 'BEHIND_SCENES', 'WORK_SAMPLE', 'WEDDING', 'ENGAGEMENT', 'RECEPTION', 'PREWEDDING', 'CORPORATE', 'BIRTHDAY', 'OTHER');

-- CreateEnum
CREATE TYPE "ImageQuality" AS ENUM ('HD', 'MEDIUM', 'THUMBNAIL');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventServiceStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "EventServiceStatus" ADD VALUE 'COMPLETED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'KYC_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'KYC_REJECTED';

-- DropForeignKey
ALTER TABLE "AvailabilitySlot" DROP CONSTRAINT "AvailabilitySlot_entityId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_cartId_fkey";

-- DropForeignKey
ALTER TABLE "VenuePhoto" DROP CONSTRAINT "VenuePhoto_venueId_fkey";

-- DropIndex
DROP INDEX "AvailabilitySlot_entityType_entityId_date_timeSlot_idx";

-- DropIndex
DROP INDEX "Cart_userId_status_key";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "description" SET DATA TYPE VARCHAR(2000);

-- AlterTable
ALTER TABLE "AvailabilitySlot" DROP COLUMN "entityId",
ADD COLUMN     "vendorId" INTEGER,
ADD COLUMN     "venueId" INTEGER;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "expressFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isExpress" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "expressFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "vendorServiceId" INTEGER,
ALTER COLUMN "customerId" SET DEFAULT 0,
ALTER COLUMN "eventType" SET DEFAULT 'BOOKING',
ALTER COLUMN "title" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "city" SET DEFAULT 'Chennai',
ALTER COLUMN "guestCount" SET DEFAULT 1,
ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT',
ALTER COLUMN "subtotal" SET DEFAULT 0,
ALTER COLUMN "totalAmount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "ExpressRequest" ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "title" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "cartId" DROP NOT NULL,
ALTER COLUMN "cartId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Promotion" ALTER COLUMN "description" SET DATA TYPE VARCHAR(2000);

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "response" TEXT,
ALTER COLUMN "title" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Settings" ALTER COLUMN "description" SET DATA TYPE VARCHAR(2000);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "image" TEXT,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "basePrice" INTEGER,
ADD COLUMN     "businessImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "experience" INTEGER,
ADD COLUMN     "foodLicenseFiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "kycDocFiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "kycDocNumber" TEXT,
ADD COLUMN     "kycDocType" TEXT,
ADD COLUMN     "ownerName" VARCHAR(255),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "pricingModel" TEXT,
ADD COLUMN     "serviceCategory" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "businessName" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(2000),
ALTER COLUMN "username" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "VendorService" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(2000);

-- AlterTable
ALTER TABLE "Venue" DROP COLUMN "images",
ADD COLUMN     "kycDocFiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "kycDocNumber" TEXT,
ADD COLUMN     "kycDocType" TEXT,
ADD COLUMN     "venueGovtCertificateFiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "venueImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(2000),
ALTER COLUMN "address" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "username" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "VenuePhoto" ADD COLUMN     "category" "PhotoCategory" NOT NULL DEFAULT 'GALLERY',
ADD COLUMN     "description" VARCHAR(2000),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quality" "ImageQuality" NOT NULL DEFAULT 'HD',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "title" VARCHAR(255),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "url" SET DATA TYPE VARCHAR(500);

-- CreateTable
CREATE TABLE "SearchAudit" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "resultsCount" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioImage" (
    "id" SERIAL NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "imageUrl" VARCHAR(500) NOT NULL,
    "title" VARCHAR(255),
    "description" VARCHAR(2000),
    "category" "PhotoCategory" NOT NULL DEFAULT 'GALLERY',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "quality" "ImageQuality" NOT NULL DEFAULT 'HD',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchAudit_userId_idx" ON "SearchAudit"("userId");

-- CreateIndex
CREATE INDEX "SearchAudit_createdAt_idx" ON "SearchAudit"("createdAt");

-- CreateIndex
CREATE INDEX "SearchAudit_query_idx" ON "SearchAudit"("query");

-- CreateIndex
CREATE INDEX "PortfolioImage_vendorId_idx" ON "PortfolioImage"("vendorId");

-- CreateIndex
CREATE INDEX "PortfolioImage_category_idx" ON "PortfolioImage"("category");

-- CreateIndex
CREATE INDEX "PortfolioImage_order_idx" ON "PortfolioImage"("order");

-- CreateIndex
CREATE INDEX "PortfolioImage_isCover_idx" ON "PortfolioImage"("isCover");

-- CreateIndex
CREATE INDEX "PortfolioImage_isFeatured_idx" ON "PortfolioImage"("isFeatured");

-- CreateIndex
CREATE INDEX "PortfolioImage_isActive_idx" ON "PortfolioImage"("isActive");

-- CreateIndex
CREATE INDEX "OutboxEvent_processed_idx" ON "OutboxEvent"("processed");

-- CreateIndex
CREATE INDEX "OutboxEvent_createdAt_idx" ON "OutboxEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_venueId_idx" ON "AvailabilitySlot"("venueId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_vendorId_idx" ON "AvailabilitySlot"("vendorId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_entityType_date_timeSlot_idx" ON "AvailabilitySlot"("entityType", "date", "timeSlot");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_slotId_idx" ON "Booking"("slotId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_venueId_vendorServiceId_addonId_date_timeSl_key" ON "CartItem"("cartId", "venueId", "vendorServiceId", "addonId", "date", "timeSlot");

-- CreateIndex
CREATE UNIQUE INDEX "Event_venueId_date_timeSlot_key" ON "Event"("venueId", "date", "timeSlot");

-- CreateIndex
CREATE INDEX "VenuePhoto_venueId_idx" ON "VenuePhoto"("venueId");

-- CreateIndex
CREATE INDEX "VenuePhoto_category_idx" ON "VenuePhoto"("category");

-- CreateIndex
CREATE INDEX "VenuePhoto_order_idx" ON "VenuePhoto"("order");

-- CreateIndex
CREATE INDEX "VenuePhoto_isCover_idx" ON "VenuePhoto"("isCover");

-- CreateIndex
CREATE INDEX "VenuePhoto_isFeatured_idx" ON "VenuePhoto"("isFeatured");

-- CreateIndex
CREATE INDEX "VenuePhoto_isActive_idx" ON "VenuePhoto"("isActive");

-- AddForeignKey
ALTER TABLE "SearchAudit" ADD CONSTRAINT "SearchAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenuePhoto" ADD CONSTRAINT "VenuePhoto_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioImage" ADD CONSTRAINT "PortfolioImage_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_vendorServiceId_fkey" FOREIGN KEY ("vendorServiceId") REFERENCES "VendorService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

