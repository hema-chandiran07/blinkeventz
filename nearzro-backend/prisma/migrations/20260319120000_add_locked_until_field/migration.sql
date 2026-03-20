-- AlterTable
-- Add lockedUntil field for account lockout security
ALTER TABLE "User" ADD COLUMN     "lockedUntil" TIMESTAMP(3);
