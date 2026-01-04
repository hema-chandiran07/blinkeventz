/*
  Warnings:

  - You are about to drop the column `tempEventId` on the `ExpressRequest` table. All the data in the column will be lost.
  - You are about to drop the column `isExpress` on the `TempEvent` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `TempEvent` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[eventId]` on the table `ExpressRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventId` to the `ExpressRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ExpressRequest_tempEventId_key";

-- DropIndex
DROP INDEX "TempEvent_userId_idx";

-- AlterTable
ALTER TABLE "ExpressRequest" DROP COLUMN "tempEventId",
ADD COLUMN     "eventId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TempEvent" DROP COLUMN "isExpress",
DROP COLUMN "updatedAt";

-- CreateIndex
CREATE UNIQUE INDEX "ExpressRequest_eventId_key" ON "ExpressRequest"("eventId");

-- AddForeignKey
ALTER TABLE "ExpressRequest" ADD CONSTRAINT "ExpressRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TempEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
