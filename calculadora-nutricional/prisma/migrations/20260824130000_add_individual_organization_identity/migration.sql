ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "cpfHash" TEXT,
  ADD COLUMN IF NOT EXISTS "cpfLastFour" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_cpfHash_key" ON "Organization"("cpfHash");
