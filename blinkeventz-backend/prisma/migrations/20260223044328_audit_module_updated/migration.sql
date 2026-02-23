/*
  Warnings:

  - The values [DEAD_LETTER] on the enum `AuditOutboxStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [WEBHOOK] on the enum `AuditSource` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isSensitive` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `requestId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `traceId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `maxAttempts` on the `AuditOutbox` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditOutboxStatus_new" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');
ALTER TABLE "AuditOutbox" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "AuditOutbox" ALTER COLUMN "status" TYPE "AuditOutboxStatus_new" USING ("status"::text::"AuditOutboxStatus_new");
ALTER TYPE "AuditOutboxStatus" RENAME TO "AuditOutboxStatus_old";
ALTER TYPE "AuditOutboxStatus_new" RENAME TO "AuditOutboxStatus";
DROP TYPE "AuditOutboxStatus_old";
ALTER TABLE "AuditOutbox" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "AuditSource_new" AS ENUM ('WEB', 'MOBILE', 'ADMIN_PANEL', 'SYSTEM', 'CRON', 'API');
ALTER TABLE "AuditLog" ALTER COLUMN "source" TYPE "AuditSource_new" USING ("source"::text::"AuditSource_new");
ALTER TYPE "AuditSource" RENAME TO "AuditSource_old";
ALTER TYPE "AuditSource_new" RENAME TO "AuditSource";
DROP TYPE "AuditSource_old";
COMMIT;

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "isSensitive",
DROP COLUMN "requestId",
DROP COLUMN "sessionId",
DROP COLUMN "traceId",
ADD COLUMN     "redactedAt" TIMESTAMP(3),
ALTER COLUMN "severity" SET DEFAULT 'INFO',
ALTER COLUMN "source" SET DEFAULT 'WEB';

-- AlterTable
ALTER TABLE "AuditOutbox" DROP COLUMN "maxAttempts";
