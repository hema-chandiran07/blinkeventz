/*
  Warnings:

  - The values [MEDIUM] on the enum `AuditSeverity` will be removed. If these variants are still used in the database, this will fail.
  - The values [WEB,MOBILE,ADMIN_PANEL,CRON,API] on the enum `AuditSource` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `currentHash` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `previousHash` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `redactedAt` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `AuditLog` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "AuditOutboxStatus" ADD VALUE 'DEAD_LETTER';

-- AlterEnum
BEGIN;
CREATE TYPE "AuditSeverity_new" AS ENUM ('LOW', 'INFO', 'WARNING', 'HIGH', 'CRITICAL');
ALTER TABLE "AuditLog" ALTER COLUMN "severity" DROP DEFAULT;
ALTER TABLE "AuditLog" ALTER COLUMN "severity" TYPE "AuditSeverity_new" USING ("severity"::text::"AuditSeverity_new");
ALTER TYPE "AuditSeverity" RENAME TO "AuditSeverity_old";
ALTER TYPE "AuditSeverity_new" RENAME TO "AuditSeverity";
DROP TYPE "AuditSeverity_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "AuditSource_new" AS ENUM ('USER', 'SYSTEM', 'ADMIN', 'SERVICE');
ALTER TABLE "AuditLog" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "AuditLog" ALTER COLUMN "source" TYPE "AuditSource_new" USING ("source"::text::"AuditSource_new");
ALTER TYPE "AuditSource" RENAME TO "AuditSource_old";
ALTER TYPE "AuditSource_new" RENAME TO "AuditSource";
DROP TYPE "AuditSource_old";
COMMIT;

-- DropIndex
DROP INDEX "AuditLog_source_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "currentHash",
DROP COLUMN "ipAddress",
DROP COLUMN "previousHash",
DROP COLUMN "redactedAt",
DROP COLUMN "userAgent",
ADD COLUMN     "isSensitive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "traceId" TEXT,
ALTER COLUMN "severity" DROP DEFAULT,
ALTER COLUMN "source" DROP DEFAULT,
ALTER COLUMN "occurredAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "AuditOutbox_status_idx" ON "AuditOutbox"("status");
