ALTER TABLE "Plan"
  ADD COLUMN "quarterlyPriceCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "semiannualPriceCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "stripeQuarterlyPriceId" TEXT,
  ADD COLUMN "stripeSemiannualPriceId" TEXT;
