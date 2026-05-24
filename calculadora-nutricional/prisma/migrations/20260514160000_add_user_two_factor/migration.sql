ALTER TABLE "User"
  ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "twoFactorSecret" TEXT,
  ADD COLUMN "twoFactorPendingSecret" TEXT,
  ADD COLUMN "twoFactorConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "twoFactorLastUsedAt" TIMESTAMP(3);

CREATE INDEX "User_twoFactorEnabled_idx" ON "User"("twoFactorEnabled");
