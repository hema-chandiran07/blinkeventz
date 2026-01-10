/*
  Warnings:

  - Added the required column `userId` to the `ExpressRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AIPlanStatus" AS ENUM ('GENERATED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "ExpressRequest" ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "AIPlan" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tempEventId" INTEGER,
    "budget" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "planJson" JSONB NOT NULL,
    "status" "AIPlanStatus" NOT NULL DEFAULT 'GENERATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIPlan_userId_idx" ON "AIPlan"("userId");

-- CreateIndex
CREATE INDEX "AIPlan_tempEventId_idx" ON "AIPlan"("tempEventId");

-- CreateIndex
CREATE INDEX "ExpressRequest_userId_idx" ON "ExpressRequest"("userId");

-- AddForeignKey
ALTER TABLE "AIPlan" ADD CONSTRAINT "AIPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPlan" ADD CONSTRAINT "AIPlan_tempEventId_fkey" FOREIGN KEY ("tempEventId") REFERENCES "TempEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpressRequest" ADD CONSTRAINT "ExpressRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
