-- Create AuditLog table
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" BIGSERIAL PRIMARY KEY,
    "actorId" INTEGER,
    "actorRole" "Role",
    "actorEmail" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "severity" "AuditSeverity" NOT NULL,
    "source" "AuditSource" NOT NULL,
    "description" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "diff" JSONB,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retentionUntil" TIMESTAMP(3),
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "requestId" TEXT,
    "sessionId" TEXT,
    "traceId" TEXT
);

-- Create AuditOutbox table
CREATE TABLE IF NOT EXISTS "AuditOutbox" (
    "id" BIGSERIAL PRIMARY KEY,
    "payload" JSONB NOT NULL,
    "status" "AuditOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3)
);

-- Create indexes for AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "AuditLog_severity_idx" ON "AuditLog"("severity");
CREATE INDEX IF NOT EXISTS "AuditLog_occurredAt_idx" ON "AuditLog"("occurredAt");

-- Create index for AuditOutbox
CREATE INDEX IF NOT EXISTS "AuditOutbox_status_idx" ON "AuditOutbox"("status");

-- Insert initial enum values if not exists (PostgreSQL handles this automatically with Prisma)
