/*
  Warnings:

  - A unique constraint covering the columns `[referenceId]` on the table `BankAccount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `referenceId` to the `BankAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referenceId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_referenceId_key" ON "BankAccount"("referenceId");
