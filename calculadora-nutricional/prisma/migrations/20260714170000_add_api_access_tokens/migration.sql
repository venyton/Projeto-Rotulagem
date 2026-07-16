CREATE TABLE IF NOT EXISTS "ApiAccessToken" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApiAccessToken_tokenHash_key" ON "ApiAccessToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "ApiAccessToken_organizationId_userId_revokedAt_idx" ON "ApiAccessToken"("organizationId", "userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "ApiAccessToken_expiresAt_idx" ON "ApiAccessToken"("expiresAt");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApiAccessToken_organizationId_fkey') THEN
        ALTER TABLE "ApiAccessToken" ADD CONSTRAINT "ApiAccessToken_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApiAccessToken_userId_fkey') THEN
        ALTER TABLE "ApiAccessToken" ADD CONSTRAINT "ApiAccessToken_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
