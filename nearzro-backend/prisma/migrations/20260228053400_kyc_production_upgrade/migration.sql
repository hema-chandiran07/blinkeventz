-- KYC Production Upgrade Migration
-- Adds encrypted doc number hash, rejection reason, and updates constraints

-- Step 1: Add new columns to KycDocument
ALTER TABLE "KycDocument" ADD COLUMN "docNumberHash" TEXT;
ALTER TABLE "KycDocument" ADD COLUMN "rejectionReason" TEXT;

-- Step 2: Backfill docNumberHash for existing records (set to empty string temporarily)
-- In production, run a script to compute SHA-256 hashes of existing doc numbers
UPDATE "KycDocument" SET "docNumberHash" = '' WHERE "docNumberHash" IS NULL;

-- Step 3: Make docNumberHash NOT NULL after backfill
ALTER TABLE "KycDocument" ALTER COLUMN "docNumberHash" SET NOT NULL;

-- Step 4: Drop old unique constraint
DROP INDEX IF EXISTS "one_active_kyc_per_user";

-- Step 5: Add new unique constraint (one doc number per doc type)
CREATE UNIQUE INDEX "unique_doc_per_type" ON "KycDocument"("docType", "docNumberHash");

-- Step 6: Add index on docNumberHash for fast lookups
CREATE INDEX "KycDocument_docNumberHash_idx" ON "KycDocument"("docNumberHash");
