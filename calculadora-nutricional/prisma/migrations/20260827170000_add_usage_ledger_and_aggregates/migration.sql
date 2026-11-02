CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "metricKey" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "costMinor" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UsageEvent_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "UsageEvent_cost_check" CHECK ("costMinor" >= 0),
    CONSTRAINT "UsageEvent_period_check" CHECK ("periodEnd" > "periodStart")
);

CREATE TABLE "UsageAggregate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "costMinor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageAggregate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UsageAggregate_quantity_check" CHECK ("quantity" >= 0),
    CONSTRAINT "UsageAggregate_cost_check" CHECK ("costMinor" >= 0),
    CONSTRAINT "UsageAggregate_period_check" CHECK ("periodEnd" > "periodStart")
);

CREATE UNIQUE INDEX "UsageEvent_org_idempotency_key" ON "UsageEvent"("organizationId", "idempotencyKey");
CREATE INDEX "UsageEvent_org_metric_period_idx" ON "UsageEvent"("organizationId", "metricKey", "periodStart");
CREATE INDEX "UsageEvent_occurredAt_idx" ON "UsageEvent"("occurredAt");
CREATE UNIQUE INDEX "UsageAggregate_org_metric_period_key" ON "UsageAggregate"("organizationId", "metricKey", "periodStart");
CREATE INDEX "UsageAggregate_metricKey_periodStart_idx" ON "UsageAggregate"("metricKey", "periodStart");
CREATE INDEX "UsageAggregate_periodEnd_idx" ON "UsageAggregate"("periodEnd");

ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageAggregate" ADD CONSTRAINT "UsageAggregate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
