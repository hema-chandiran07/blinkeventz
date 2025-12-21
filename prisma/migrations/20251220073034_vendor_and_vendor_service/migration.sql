/*
  Warnings:

  - The values [APPROVED] on the enum `VendorVerificationStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `EventService` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `baseRate` to the `VendorService` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `VendorService` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricingModel` to the `VendorService` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceType` to the `VendorService` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `VendorService` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('CATERING', 'DECOR', 'PHOTOGRAPHY', 'MAKEUP', 'DJ', 'MUSIC', 'CAR_RENTAL', 'PRIEST', 'OTHER');

-- CreateEnum
CREATE TYPE "VendorPricingModel" AS ENUM ('PER_EVENT', 'PER_PERSON', 'PER_DAY', 'PACKAGE');

-- AlterEnum
BEGIN;
CREATE TYPE "VendorVerificationStatus_new" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');
ALTER TABLE "public"."Vendor" ALTER COLUMN "verificationStatus" DROP DEFAULT;
ALTER TABLE "Vendor" ALTER COLUMN "verificationStatus" TYPE "VendorVerificationStatus_new" USING ("verificationStatus"::text::"VendorVerificationStatus_new");
ALTER TYPE "VendorVerificationStatus" RENAME TO "VendorVerificationStatus_old";
ALTER TYPE "VendorVerificationStatus_new" RENAME TO "VendorVerificationStatus";
DROP TYPE "public"."VendorVerificationStatus_old";
ALTER TABLE "Vendor" ALTER COLUMN "verificationStatus" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "EventService" DROP CONSTRAINT "EventService_vendorId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "User_id_seq";

-- AlterTable
ALTER TABLE "VendorService" ADD COLUMN     "baseRate" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "exclusions" TEXT,
ADD COLUMN     "inclusions" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxGuests" INTEGER,
ADD COLUMN     "minGuests" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "pricingModel" "VendorPricingModel" NOT NULL,
ADD COLUMN     "serviceType" "ServiceType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "EventService";
