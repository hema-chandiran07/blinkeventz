/*
  Warnings:

  - You are about to drop the column `eventId` on the `ExpressRequest` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `TempEvent` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tempEventId]` on the table `ExpressRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tempEventId` to the `ExpressRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `area` to the `TempEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `TempEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TempEvent` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ExpressRequest" DROP CONSTRAINT "ExpressRequest_eventId_fkey";

-- DropIndex
DROP INDEX "ExpressRequest_eventId_key";

-- AlterTable
ALTER TABLE "ExpressRequest" DROP COLUMN "eventId",
ADD COLUMN     "tempEventId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TempEvent" DROP COLUMN "status",
ADD COLUMN     "area" TEXT NOT NULL,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ExpressRequest_tempEventId_key" ON "ExpressRequest"("tempEventId");

-- AddForeignKey
ALTER TABLE "ExpressRequest" ADD CONSTRAINT "ExpressRequest_tempEventId_fkey" FOREIGN KEY ("tempEventId") REFERENCES "TempEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
