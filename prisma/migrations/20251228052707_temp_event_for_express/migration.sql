/*
  Warnings:

  - You are about to drop the column `eventId` on the `ExpressRequest` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tempEventId]` on the table `ExpressRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tempEventId` to the `ExpressRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ExpressRequest_eventId_key";

-- AlterTable
ALTER TABLE "ExpressRequest" DROP COLUMN "eventId",
ADD COLUMN     "tempEventId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "TempEvent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "isExpress" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TempEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TempEvent_userId_idx" ON "TempEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpressRequest_tempEventId_key" ON "ExpressRequest"("tempEventId");
