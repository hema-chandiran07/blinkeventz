/*
  Warnings:

  - You are about to drop the column `isPrimary` on the `BankAccount` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[referenceId]` on the table `BankAccount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `referenceId` to the `BankAccount` table without a default value. This is not possible if the table is not empty.
  - Made the column `bankName` on table `BankAccount` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "BankAccount" DROP CONSTRAINT "BankAccount_userId_fkey";

-- AlterTable
ALTER TABLE "BankAccount" DROP COLUMN "isPrimary",
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referenceId" TEXT NOT NULL,
ALTER COLUMN "bankName" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_referenceId_key" ON "BankAccount"("referenceId");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
