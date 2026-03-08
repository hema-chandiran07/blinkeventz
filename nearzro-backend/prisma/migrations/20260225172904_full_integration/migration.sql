/*
  Warnings:

  - You are about to drop the column `accountNumberHash` on the `BankAccount` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "BankAccount_accountNumberHash_key";

-- AlterTable
ALTER TABLE "BankAccount" DROP COLUMN "accountNumberHash";
