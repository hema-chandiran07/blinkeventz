-- CreateEnum
CREATE TYPE "ExpressType" AS ENUM ('FIXED', 'CUSTOMIZED');

-- CreateEnum
CREATE TYPE "ExpressStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CartStatus" ADD VALUE 'LOCKED';
ALTER TYPE "CartStatus" ADD VALUE 'EXPIRED';

-- CreateTable
CREATE TABLE "ExpressRequest" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "ExpressType" NOT NULL,
    "status" "ExpressStatus" NOT NULL,
    "passFee" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpressRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpressRequest_eventId_key" ON "ExpressRequest"("eventId");
