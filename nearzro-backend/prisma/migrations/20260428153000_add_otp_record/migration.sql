-- CreateTable
CREATE TABLE "OtpRecord" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "email" TEXT,
    "phone" TEXT,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpRecord_email_idx" ON "OtpRecord"("email");

-- CreateIndex
CREATE INDEX "OtpRecord_phone_idx" ON "OtpRecord"("phone");

-- CreateIndex
CREATE INDEX "OtpRecord_expiresAt_idx" ON "OtpRecord"("expiresAt");

-- CreateIndex
CREATE INDEX "OtpRecord_userId_idx" ON "OtpRecord"("userId");

-- AddForeignKey
ALTER TABLE "OtpRecord" ADD CONSTRAINT "OtpRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
