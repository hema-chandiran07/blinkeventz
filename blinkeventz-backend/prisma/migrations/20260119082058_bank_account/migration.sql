/*
  Warnings:

  - A unique constraint covering the columns `[userId,status]` on the table `KycDocument` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "KycDocument" DROP CONSTRAINT "KycDocument_userId_fkey";

-- CreateIndex
CREATE INDEX "BankAccount_isVerified_idx" ON "BankAccount"("isVerified");

-- CreateIndex
CREATE INDEX "KycDocument_status_idx" ON "KycDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "one_active_kyc_per_user" ON "KycDocument"("userId", "status");

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
