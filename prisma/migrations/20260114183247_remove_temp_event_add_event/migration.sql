/*
  Warnings:

  - You are about to drop the column `tempEventId` on the `AIPlan` table. All the data in the column will be lost.
  - You are about to drop the column `tempEventId` on the `ExpressRequest` table. All the data in the column will be lost.
  - You are about to drop the `TempEvent` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[EventId]` on the table `ExpressRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `EventId` to the `ExpressRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('INQUIRY', 'PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ItemTypeForEvent" AS ENUM ('VENUE', 'VENDOR_SERVICE', 'ADDON');

-- CreateEnum
CREATE TYPE "EventServiceStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "AIPlan" DROP CONSTRAINT "AIPlan_tempEventId_fkey";

-- DropForeignKey
ALTER TABLE "ExpressRequest" DROP CONSTRAINT "ExpressRequest_tempEventId_fkey";

-- DropForeignKey
ALTER TABLE "TempEvent" DROP CONSTRAINT "TempEvent_userId_fkey";

-- DropIndex
DROP INDEX "AIPlan_tempEventId_idx";

-- DropIndex
DROP INDEX "ExpressRequest_tempEventId_key";

-- AlterTable
ALTER TABLE "AIPlan" DROP COLUMN "tempEventId",
ADD COLUMN     "EventId" INTEGER;

-- AlterTable
ALTER TABLE "ExpressRequest" DROP COLUMN "tempEventId",
ADD COLUMN     "EventId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "eventId" INTEGER;

-- DropTable
DROP TABLE "TempEvent";

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "assignedManagerId" INTEGER,
    "eventType" TEXT NOT NULL,
    "title" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT,
    "venueId" INTEGER,
    "guestCount" INTEGER NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'CONFIRMED',
    "isExpress" BOOLEAN NOT NULL DEFAULT false,
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "platformFee" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventService" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "itemType" "ItemTypeForEvent" NOT NULL,
    "venueId" INTEGER,
    "vendorServiceId" INTEGER,
    "addonId" INTEGER,
    "serviceType" "ServiceType",
    "finalPrice" INTEGER NOT NULL,
    "notes" TEXT,
    "status" "EventServiceStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIPlan_EventId_idx" ON "AIPlan"("EventId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpressRequest_EventId_key" ON "ExpressRequest"("EventId");

-- AddForeignKey
ALTER TABLE "AIPlan" ADD CONSTRAINT "AIPlan_EventId_fkey" FOREIGN KEY ("EventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpressRequest" ADD CONSTRAINT "ExpressRequest_EventId_fkey" FOREIGN KEY ("EventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_assignedManagerId_fkey" FOREIGN KEY ("assignedManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventService" ADD CONSTRAINT "EventService_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventService" ADD CONSTRAINT "EventService_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventService" ADD CONSTRAINT "EventService_vendorServiceId_fkey" FOREIGN KEY ("vendorServiceId") REFERENCES "VendorService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
