-- CreateTable
CREATE TABLE "BankWebhookLog" (
    "id" SERIAL NOT NULL,
    "referenceId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankWebhookLog_referenceId_idx" ON "BankWebhookLog"("referenceId");
